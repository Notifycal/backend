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
const entryPoints = [...globSync('src/lambdas/**/index.ts'), ...globSync('src/testing/**.ts')];

await esbuild.build({
  entryPoints: entryPoints,
  bundle: true,
  outdir: path.join(__dirname, outDir),
  outbase: lambdasDir,
  platform: 'node',
  sourcemap: 'linked',
  minify: process.env.NODE_ENV == 'production',
  target: 'node20',
  format: 'cjs',
  outExtension: { '.js': '.cjs' },
  tsconfig
});
