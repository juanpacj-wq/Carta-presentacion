import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';
import {
  verifyPassword,
  safeEqualStrings,
  issueSession,
  verifySession,
} from '../services/authService.js';
import { parseCookieHeader, serializeCookie } from '../utils/cookies.js';

export const authRouter = Router();

// Limite agresivo de intentos por IP: 10 cada 15 minutos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera unos minutos' },
});

// Bloqueo in-memory del unico usuario tras fallos repetidos.
const MAX_FAILS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
interface LockState {
  fails: number;
  lockedUntil: number;
}
const lockState: LockState = { fails: 0, lockedUntil: 0 };

function isLocked(now: number): boolean {
  return lockState.lockedUntil > now;
}

function recordFail(now: number): void {
  lockState.fails += 1;
  if (lockState.fails >= MAX_FAILS) {
    lockState.lockedUntil = now + LOCKOUT_MS;
    lockState.fails = 0;
  }
}

function recordSuccess(): void {
  lockState.fails = 0;
  lockState.lockedUntil = 0;
}

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

function setAuthCookies(res: Response, token: string, csrf: string, maxAge: number): void {
  const sessionCookie = serializeCookie(config.auth.sessionCookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'Strict',
    path: '/',
    maxAgeSeconds: maxAge,
  });
  const csrfCookie = serializeCookie(config.auth.csrfCookieName, csrf, {
    httpOnly: false,
    secure: config.isProduction,
    sameSite: 'Strict',
    path: '/',
    maxAgeSeconds: maxAge,
  });
  res.append('Set-Cookie', sessionCookie);
  res.append('Set-Cookie', csrfCookie);
}

function clearAuthCookies(res: Response): void {
  res.append(
    'Set-Cookie',
    serializeCookie(config.auth.sessionCookieName, '', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'Strict',
      path: '/',
      maxAgeSeconds: 0,
    }),
  );
  res.append(
    'Set-Cookie',
    serializeCookie(config.auth.csrfCookieName, '', {
      httpOnly: false,
      secure: config.isProduction,
      sameSite: 'Strict',
      path: '/',
      maxAgeSeconds: 0,
    }),
  );
}

function authConfigured(): boolean {
  return (
    !!config.auth.username &&
    !!config.auth.passwordHash &&
    !!config.auth.sessionSecret &&
    config.auth.sessionSecret.length >= 32
  );
}

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!authConfigured()) {
      res.status(503).json({ error: 'Autenticacion no configurada en el servidor' });
      return;
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Credenciales invalidas' });
      return;
    }

    const now = Date.now();
    if (isLocked(now)) {
      const retryAfter = Math.ceil((lockState.lockedUntil - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Cuenta bloqueada temporalmente, intenta mas tarde' });
      return;
    }

    const submittedUser = parsed.data.username.toLowerCase().trim();
    const userMatches = safeEqualStrings(submittedUser, config.auth.username);
    const passwordMatches = await verifyPassword(parsed.data.password, config.auth.passwordHash);

    if (!userMatches || !passwordMatches) {
      recordFail(Date.now());
      // Mensaje generico: no revelar si el usuario existe.
      res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
      return;
    }

    recordSuccess();
    const { token, csrf, maxAgeSeconds } = await issueSession(config.auth.username);
    setAuthCookies(res, token, csrf, maxAgeSeconds);
    res.json({ username: config.auth.username, csrfToken: csrf });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout — no requiere sesion valida, solo limpia cookies.
authRouter.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.status(204).end();
});

// GET /api/auth/me — estado de sesion para el frontend.
authRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!authConfigured()) {
      res.status(503).json({ error: 'Autenticacion no configurada' });
      return;
    }
    const cookies = parseCookieHeader(req.headers.cookie);
    const token = cookies[config.auth.sessionCookieName];
    if (!token) {
      res.status(401).json({ authenticated: false });
      return;
    }
    const payload = await verifySession(token);
    if (!payload || payload.sub !== config.auth.username) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, username: payload.sub, csrfToken: payload.csrf });
  } catch (err) {
    next(err);
  }
});
