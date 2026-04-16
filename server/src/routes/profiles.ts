import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import fs from 'fs';
import { rateLimit } from 'express-rate-limit';
import { upload } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';
import * as profileService from '../services/profileService.js';
import { generateQR } from '../services/qrService.js';
import { Profile, ProfileResponse } from '../types/profile.js';
import { sanitizeData } from '../utils/sanitize.js';
import { isValidImageMagic } from '../utils/imageValidation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsBase = path.resolve(__dirname, '../../uploads');

export const profilesRouter = Router();

// --- Rate limiters ---
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo en un momento' },
});

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo en un momento' },
});

const qrLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas solicitudes de QR' },
});

// --- Validation schemas ---
const uuidSchema = z.string().uuid('ID invalido');

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

const createSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  position: z.string().min(1, 'El cargo es requerido').max(200),
  email: z.string().email('Email invalido').max(320),
  phone: z.string().max(50).nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  position: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(50).nullable().optional(),
});

// --- Helpers ---
function toResponse(profile: Profile): ProfileResponse {
  return {
    id: profile.id,
    name: profile.name,
    position: profile.position,
    email: profile.email,
    phone: profile.phone,
    photoUrl: `/uploads/${profile.photoPath}`,
    qrUrl: `/api/profiles/${profile.id}/qr`,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

async function processPhoto(file: Express.Multer.File): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const outputName = path.basename(file.filename, path.extname(file.filename)) + '.webp';
  const outputDir = path.join(uploadsBase, year, month);
  const outputPath = path.join(outputDir, outputName);

  fs.mkdirSync(outputDir, { recursive: true });

  // Read into buffer first so sharp doesn't hold a file handle (Windows EPERM fix)
  const buffer = fs.readFileSync(file.path);

  // Validate magic bytes
  if (!isValidImageMagic(buffer)) {
    fs.unlinkSync(file.path);
    throw Object.assign(new Error('Archivo no es una imagen valida'), { statusCode: 400 });
  }

  await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(outputPath);

  // Remove original if different from output
  if (file.path !== outputPath) {
    fs.unlinkSync(file.path);
  }

  return `${year}/${month}/${outputName}`;
}

// --- Middleware to validate :id param ---
function validateId(req: Request, res: Response, next: NextFunction) {
  const result = uuidSchema.safeParse(req.params.id as string);
  if (!result.success) {
    res.status(400).json({ error: 'ID de perfil invalido' });
    return;
  }
  next();
}

// --- Routes ---

// POST /api/profiles
profilesRouter.post('/', requireAuth, writeLimiter, upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'La foto es requerida' });
      return;
    }

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const sanitized = sanitizeData(parsed.data);
    const photoPath = await processPhoto(req.file);
    const profile = await profileService.createProfile({
      ...sanitized,
      phone: sanitized.phone ?? null,
      photoPath,
    });

    res.status(201).json(toResponse(profile));
  } catch (err: unknown) {
    if (err instanceof Error && 'statusCode' in err && (err as Error & { statusCode: number }).statusCode === 400) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// GET /api/profiles
profilesRouter.get('/', requireAuth, readLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) {
      res.status(400).json({ error: 'Parametros de paginacion invalidos' });
      return;
    }

    const { page, pageSize } = pagination.data;
    const result = await profileService.listProfiles(page, pageSize);
    res.json({
      data: result.data.map(toResponse),
      total: result.total,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles/:id
profilesRouter.get('/:id', readLimiter, validateId, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileService.getProfile(req.params.id as string);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
    res.json(toResponse(profile));
  } catch (err) {
    next(err);
  }
});

// PUT /api/profiles/:id
profilesRouter.put('/:id', requireAuth, writeLimiter, validateId, upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const sanitized = sanitizeData(parsed.data);
    const updateData: Parameters<typeof profileService.updateProfile>[1] = { ...sanitized };

    if (req.file) {
      updateData.photoPath = await processPhoto(req.file);
    }

    const profile = await profileService.updateProfile(req.params.id as string, updateData);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    res.json(toResponse(profile));
  } catch (err: unknown) {
    if (err instanceof Error && 'statusCode' in err && (err as Error & { statusCode: number }).statusCode === 400) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// GET /api/profiles/:id/qr
profilesRouter.get('/:id/qr', qrLimiter, validateId, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileService.getProfile(req.params.id as string);
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const qrBuffer = await generateQR(profile.id);
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `inline; filename="qr-${profile.id}.png"`);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(qrBuffer);
  } catch (err) {
    next(err);
  }
});
