import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { scrypt as scryptCb, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (p: string, s: Buffer, kl: number) => Promise<Buffer>;

const TEST_USER = 'mpinzon';
const TEST_PASSWORD = 'e5245cfd-ad10-4116-b7b0-58b444eba094';

// Set env ANTES del primer import de app.js/config.ts. dotenv no sobreescribe
// vars ya presentes, asi que esto gana sobre el .env de la raiz.
const salt = randomBytes(16);
const key = await scrypt(TEST_PASSWORD, salt, 64);
process.env.NODE_ENV = 'test';
process.env.AUTH_USERNAME = TEST_USER;
process.env.AUTH_PASSWORD_HASH = `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
process.env.SESSION_SECRET = 'a'.repeat(48);
process.env.SESSION_TTL_HOURS = '1';

// Mock DB para no tocar better-sqlite3.
const stmt = { get: vi.fn(), all: vi.fn(), run: vi.fn() };
const dbMock = {
  prepare: vi.fn(() => stmt),
  exec: vi.fn(),
  pragma: vi.fn(),
  close: vi.fn(),
  transaction: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
};
vi.mock('../db.js', () => ({
  getDb: vi.fn(() => dbMock),
  closeDb: vi.fn(),
}));

const { createApp } = await import('../app.js');
const app = createApp();

function extractCookies(setCookie: string[] | string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!setCookie) return out;
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const raw of arr) {
    const first = raw.split(';')[0];
    const idx = first.indexOf('=');
    if (idx > 0) out[first.slice(0, idx)] = first.slice(idx + 1);
  }
  return out;
}

describe('auth flow', () => {
  it('POST /api/auth/login con credenciales validas crea sesion + CSRF', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USER, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe(TEST_USER);
    expect(typeof res.body.csrfToken).toBe('string');
    const cookies = extractCookies(res.headers['set-cookie']);
    expect(cookies.session).toBeTruthy();
    expect(cookies.csrf).toBeTruthy();
    expect(cookies.csrf).toBe(encodeURIComponent(res.body.csrfToken));
  });

  it('POST /api/auth/login con password incorrecto -> 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USER, password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorrectos/i);
  });

  it('POST /api/auth/login con usuario no permitido -> 401 generico', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'otra', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
  });

  it('GET /api/profiles sin cookie -> 401', async () => {
    const res = await request(app).get('/api/profiles?page=1&pageSize=10');
    expect(res.status).toBe(401);
  });

  it('GET /api/profiles con cookie valida -> 200', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USER, password: TEST_PASSWORD });
    const setCookies = login.headers['set-cookie'] as unknown as string[];
    const sessionCookie = setCookies.find((c) => c.startsWith('session='))!;

    stmt.get.mockReturnValueOnce({ total: 0 });
    stmt.all.mockReturnValueOnce([]);

    const res = await request(app)
      .get('/api/profiles?page=1&pageSize=10')
      .set('Cookie', sessionCookie.split(';')[0]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/profiles sin header CSRF -> 403', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USER, password: TEST_PASSWORD });
    const setCookies = login.headers['set-cookie'] as unknown as string[];
    const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');

    const res = await request(app).post('/api/profiles').set('Cookie', cookieHeader).send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/csrf/i);
  });

  it('POST /api/auth/logout limpia cookies', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
    const setCookies = res.headers['set-cookie'] as unknown as string[];
    expect(setCookies.some((c) => c.startsWith('session=') && c.includes('Max-Age=0'))).toBe(true);
  });
});
