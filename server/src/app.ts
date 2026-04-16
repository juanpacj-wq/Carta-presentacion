import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { profilesRouter } from './routes/profiles.js';
import { authRouter } from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { getDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          frameSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // CORS. credentials:true para que el navegador envie la cookie de sesion
  // en requests cross-origin al API (admin en :5173 hacia server en :3000
  // durante dev, o subdominios distintos en prod).
  app.use(
    cors({
      origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : false,
      methods: ['GET', 'POST', 'PUT'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      credentials: true,
      maxAge: 86400,
    }),
  );

  // HTTPS redirect in production
  if (config.isProduction) {
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.hostname}${req.url}`);
      }
      next();
    });
  }

  // gzip compression for text/JSON responses. Nginx already compresses in
  // production, but enabling it here keeps direct (non-proxied) deployments
  // and local dev consistent with prod sizes. Images and the QR PNG are
  // skipped automatically by the library.
  app.use(compression());

  // Request logging
  app.use(requestLogger);

  // Body parsing with size limit
  app.use(express.json({ limit: '100kb' }));

  // Static files: uploaded photos (secured)
  app.use(
    '/uploads',
    express.static(path.resolve(__dirname, '../uploads'), {
      dotfiles: 'deny',
      index: false,
    }),
  );

  // Health check with DB verification
  app.get('/api/health', (_req, res) => {
    try {
      const db = getDb();
      db.prepare('SELECT 1').get();
      res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'disconnected' });
    }
  });

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/profiles', profilesRouter);

  // Error handler
  app.use(errorHandler);

  return app;
}
