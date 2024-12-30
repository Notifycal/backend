import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';
import esbuild from 'esbuild';

// https://byby.dev/node-dirname-not-defined
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsconfig = path.join(__dirname, './tsconfig.json');

const lambdasDir = 'src';
const outDir = 'dist';
const entryPoints = [
  ...globSync('src/lambdas/**/index.ts'),
  ...globSync('src/testing/**.ts', {
    ignore: globSync('src/testing/utils/**')
  })
].filter((path) => !path.endsWith('.test.ts'));
console.log(entryPoints);

const isWatchMode = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: entryPoints,
  bundle: true,
  outdir: path.join(__dirname, outDir),
  outbase: lambdasDir,
  platform: 'node',
  sourcemap: 'linked',
  minify: process.env.NODE_ENV == 'production',
  target: 'node22',
  format: 'cjs',
  outExtension: { '.js': '.cjs' },
  tsconfig
};

if (isWatchMode) {
  console.log('Starting esbuild in watch mode...');
  const context = await esbuild.context({
    ...buildOptions,
    plugins: [
      {
        name: 'rebuild-notify',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length > 0) {
              console.error('Build failed:', result.errors);
            } else {
              console.log('Rebuild finished successfully!');
            }
          });
        }
      }
    ]
  });
  await context.watch();
} else {
  await esbuild.build(buildOptions);
}
