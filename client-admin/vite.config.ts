import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Carga el .env desde la raiz del repo (mismo archivo que usa el server)
  // en lugar del default de Vite (client/.env).
  envDir: '..',
  build: {
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});
