import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: path.resolve(__dirname, 'src/main/main.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['electron', 'better-sqlite3', 'electron-store'],
    },
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, '../packages/shared-types/src'),
    },
  },
});
