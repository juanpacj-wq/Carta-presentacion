import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Fuerza el modo "auth no configurada" para las aserciones 503.
// Set a empty string en lugar de delete: dotenv no sobreescribe vars ya
// presentes, asi que esto gana contra un .env real en la raiz del repo.
process.env.AUTH_USERNAME = '';
process.env.AUTH_PASSWORD_HASH = '';
process.env.SESSION_SECRET = '';

// --- Mock the database layer before importing the app. ---
//
// The real db.ts opens a better-sqlite3 file handle on demand. For HTTP-level
// tests we swap it with a thin stub: `getDb()` returns an object whose
// `prepare(sql)` returns a single statement object with `get`/`all`/`run`
// spies that each test can program.

const stmt = {
  get: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
};
const dbMock = {
  prepare: vi.fn(() => stmt),
  exec: vi.fn(),
  pragma: vi.fn(),
  close: vi.fn(),
  transaction: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
};
const getDbMock = vi.fn(() => dbMock);

vi.mock('../db.js', () => ({
  getDb: getDbMock,
  closeDb: vi.fn(),
}));

// Import AFTER the mock so the app resolves the stubbed db module.
const { createApp } = await import('../app.js');
const app = createApp();

beforeEach(() => {
  stmt.get.mockReset();
  stmt.all.mockReset();
  stmt.run.mockReset();
  dbMock.prepare.mockClear();
  getDbMock.mockClear();
});

describe('GET /api/health', () => {
  it('returns 200 when the DB responds', async () => {
    stmt.get.mockReturnValueOnce({ '1': 1 });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
  });

  it('returns 503 when the DB throws', async () => {
    stmt.get.mockImplementationOnce(() => {
      throw new Error('disk i/o error');
    });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
  });

  it('returns 503 when getDb itself fails', async () => {
    getDbMock.mockImplementationOnce(() => {
      throw new Error('cannot open database');
    });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
  });
});

describe('security headers', () => {
  it('sets Helmet headers on the health endpoint', async () => {
    stmt.get.mockReturnValueOnce({ '1': 1 });
    const res = await request(app).get('/api/health');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});

describe('validation on public routes', () => {
  it('GET /api/profiles/<bad-uuid> -> 400', async () => {
    const res = await request(app).get('/api/profiles/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('GET /api/profiles without auth -> 503 (auth not configured)', async () => {
    const res = await request(app).get('/api/profiles?page=1&pageSize=10');
    expect(res.status).toBe(503);
  });

  it('GET /api/profiles with pageSize > 100 without auth -> 503', async () => {
    const res = await request(app).get('/api/profiles?pageSize=9999');
    expect(res.status).toBe(503);
  });
});
