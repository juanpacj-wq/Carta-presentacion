import { config } from './config.js';
import { createApp } from './app.js';
import { getDb, closeDb } from './db.js';

async function start() {
  try {
    // Open the SQLite file before accepting traffic so /api/health reflects
    // true readiness on first request.
    getDb();

    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(
        JSON.stringify({
          event: 'server_start',
          url: config.baseUrl,
          env: config.nodeEnv,
          timestamp: new Date().toISOString(),
        }),
      );
    });

    // Graceful shutdown
    async function shutdown(signal: string) {
      console.log(
        JSON.stringify({
          event: 'shutdown',
          signal,
          timestamp: new Date().toISOString(),
        }),
      );
      server.close(() => {
        closeDb();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
