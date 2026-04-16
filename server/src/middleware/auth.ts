import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { verifySession, safeEqualStrings } from '../services/authService.js';
import { parseCookieHeader } from '../utils/cookies.js';

export interface AuthenticatedUser {
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Fail closed si el server no esta configurado.
  if (
    !config.auth.username ||
    !config.auth.passwordHash ||
    !config.auth.sessionSecret ||
    config.auth.sessionSecret.length < 32
  ) {
    res.status(503).json({ error: 'Autenticacion no configurada en el servidor' });
    return;
  }

  const cookies = parseCookieHeader(req.headers.cookie);
  const token = cookies[config.auth.sessionCookieName];
  if (!token) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const payload = await verifySession(token);
  if (!payload || payload.sub !== config.auth.username) {
    res.status(401).json({ error: 'Sesion invalida' });
    return;
  }

  // CSRF double-submit para mutaciones. Requiere que el cookie CSRF
  // (legible por JS) y el header X-CSRF-Token coincidan, y ambos con el
  // valor firmado dentro del JWT. SameSite=Strict ya bloquea la mayor
  // parte de CSRF pero defense-in-depth no cuesta nada.
  if (STATE_CHANGING.has(req.method)) {
    const headerToken = req.get('x-csrf-token') || '';
    const cookieCsrf = cookies[config.auth.csrfCookieName] || '';
    if (
      !headerToken ||
      !cookieCsrf ||
      !safeEqualStrings(headerToken, cookieCsrf) ||
      !safeEqualStrings(headerToken, payload.csrf)
    ) {
      res.status(403).json({ error: 'CSRF token invalido' });
      return;
    }
  }

  (req as AuthenticatedRequest).user = { username: payload.sub };
  next();
}
