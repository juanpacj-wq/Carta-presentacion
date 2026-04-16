import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// SQLite database file. Defaults to <server>/data/comunicaciones.db so local
// dev works without any extra config. In production set DB_PATH to a path
// outside the repo (e.g. /var/lib/comunicaciones/comunicaciones.db) so a
// `git pull` or redeploy never touches the database file.
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '../data/comunicaciones.db');

const sessionTtlHours = parseInt(process.env.SESSION_TTL_HOURS || '8', 10);

export const config = {
  nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:5174',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  auth: {
    // Usuario unico autorizado (comparado en minusculas, timing-safe).
    username: (process.env.AUTH_USERNAME || '').toLowerCase(),
    // Hash scrypt del password en formato `scrypt$<saltHex>$<hashHex>`.
    // Generar con: npm run hash-password --workspace=server -- '<password>'
    passwordHash: process.env.AUTH_PASSWORD_HASH || '',
    // Secreto HMAC para firmar el JWT de sesion. Minimo 32 bytes en prod.
    sessionSecret: process.env.SESSION_SECRET || '',
    sessionTtlSeconds: Math.max(1, sessionTtlHours) * 60 * 60,
    // Nombre de las cookies. Usamos el prefijo __Host- en prod para blindar
    // contra sub-dominios y forzar Secure + Path=/.
    sessionCookieName: isProduction ? '__Host-session' : 'session',
    csrfCookieName: isProduction ? '__Host-csrf' : 'csrf',
  },
  db: {
    path: dbPath,
  },
  upload: {
    maxSizeMB: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '5', 10),
    dir: process.env.UPLOAD_DIR || './uploads',
  },
};
