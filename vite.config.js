import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dbHealthCheckPlugin } from './vite-plugin-db-health.js';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), dbHealthCheckPlugin()],
  server: {
    port: 5174,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4174,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
