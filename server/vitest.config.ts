import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    // Provide the env vars that config.ts validates at import-time so tests
    // don't need a real .env file or MSSQL instance.
    env: {
      NODE_ENV: 'test',
      DB_SERVER: 'test-server',
      DB_DATABASE: 'test-db',
      DB_USER: 'test-user',
      DB_PASSWORD: 'test-password',
      ADMIN_TOKEN: 'test-admin-token-0123456789abcdef',
      ALLOWED_ORIGINS: 'http://localhost:5173',
      DB_ENCRYPT: 'false',
      DB_TRUST_SERVER_CERTIFICATE: 'true',
    },
  },
});
