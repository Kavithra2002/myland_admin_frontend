import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { reviewApiPlugin } from './vite-review-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), reviewApiPlugin(path.resolve(__dirname, 'data/reviews.json'))],
  server: {
    port: 5174,
    strictPort: false,
  },
  preview: {
    port: 4174,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
