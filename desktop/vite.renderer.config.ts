import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, '../packages/shared-types/src'),
      '@shared-ui': path.resolve(__dirname, '../packages/shared-ui/src'),
      '@shared-api': path.resolve(__dirname, '../packages/shared-api-client/src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
