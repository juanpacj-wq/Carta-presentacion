import { scrypt as scryptCb, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const SCRYPT_KEYLEN = 64;
const SCRYPT_PREFIX = 'scrypt$';
const JWT_ISSUER = 'comunicaciones';
const JWT_AUDIENCE = 'comunicaciones-admin';

function getSessionKey(): Uint8Array {
  const secret = config.auth.sessionSecret;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET no configurado (minimo 32 caracteres)');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(plain, salt, SCRYPT_KEYLEN);
  return `${SCRYPT_PREFIX}${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored || !stored.startsWith(SCRYPT_PREFIX)) return false;
  const parts = stored.slice(SCRYPT_PREFIX.length).split('$');
  if (parts.length !== 2) return false;
  const [saltHex, hashHex] = parts;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const actual = await scrypt(plain, salt, SCRYPT_KEYLEN);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function safeEqualStrings(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Run a dummy compare to keep timing close regardless of length.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export interface SessionPayload {
  sub: string;
  csrf: string;
}

export async function issueSession(username: string): Promise<{ token: string; csrf: string; maxAgeSeconds: number }> {
  const csrf = randomBytes(32).toString('hex');
  const token = await new SignJWT({ csrf })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${config.auth.sessionTtlSeconds}s`)
    .sign(getSessionKey());
  return { token, csrf, maxAgeSeconds: config.auth.sessionTtlSeconds };
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.sub !== 'string' || typeof payload.csrf !== 'string') return null;
    return { sub: payload.sub, csrf: payload.csrf };
  } catch {
    return null;
  }
}

