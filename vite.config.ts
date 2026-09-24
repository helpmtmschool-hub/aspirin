import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { aspirinDevApiPlugin } from './src/server/devMiddleware';

export default defineConfig({
  plugins: [react(), aspirinDevApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
