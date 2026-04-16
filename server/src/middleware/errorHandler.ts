import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const log: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    event: 'error',
    method: req.method,
    url: req.originalUrl,
    message: err.message,
  };

  // Only include stack trace in development
  if (!config.isProduction) {
    log.stack = err.stack;
  }

  console.error(JSON.stringify(log));
  res.status(500).json({ error: 'Error interno del servidor' });
}
