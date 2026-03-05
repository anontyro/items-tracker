import { context } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes('--watch');

const config = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: true,
  external: ['electron'],
  entryPoints: [path.resolve(__dirname, 'src/main/preload.ts')],
  outfile: path.resolve(__dirname, 'dist/preload.js'),
};

async function buildPreload() {
  try {
    if (isWatch) {
      const ctx = await context(config);
      await ctx.watch();
      console.log('Preload watching for changes...');
    } else {
      await context(config).then(ctx => ctx.rebuild()).then(() => {
        console.log('Preload build complete');
      });
    }
  } catch (error) {
    console.error('Preload build error:', error);
    process.exit(1);
  }
}

buildPreload();
