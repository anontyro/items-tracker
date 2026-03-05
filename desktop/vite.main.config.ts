import { defineConfig } from 'vite';
import path from 'path';
import { builtinModules } from 'module';

const nodeBuiltins = builtinModules;

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: path.resolve(__dirname, 'src/main/main.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    sourcemap: true,
    minify: false,
    target: 'node18',
    rollupOptions: {
      external: (id) => {
        // Only externalize electron, not Node.js built-ins
        if (id === 'electron') return true;
        if (id.startsWith('electron/')) return true;
        return false;
      },
      output: {
        format: 'cjs',
        interop: 'compat',
      },
    },
  },
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, '../packages/shared-types/src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
