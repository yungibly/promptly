import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

if (!globalThis.Bun) throw new Error('Build with Bun: bun --no-env-file scripts/build.js');
const root = fileURLToPath(new URL('../', import.meta.url));
const targets = ['bun-darwin-arm64', 'bun-darwin-x64', 'bun-linux-arm64-musl', 'bun-linux-x64-musl'];
const { values } = parseArgs({ options: { target: { type: 'string' }, out: { type: 'string' } } });
const target = values.target ?? `bun-${process.platform}-${process.arch}${process.platform === 'linux' ? '-musl' : ''}`;
if (!targets.includes(target)) throw new Error(`Unsupported target: ${target}. Choose ${targets.join(', ')}.`);
const outfile = resolve(values.out ?? `${root}/dist/promptly`);
mkdirSync(dirname(outfile), { recursive: true });
const result = await Bun.build({
  entrypoints: [resolve(root, 'bin/promptly.js')],
  target: 'bun',
  minify: true,
  env: 'disable',
  define: { __PROMPTLY_RUNTIME__: JSON.stringify(readFileSync(resolve(root, 'src/runtime.zsh'), 'utf8')) },
  compile: { target, outfile, autoloadDotenv: false, autoloadBunfig: false, autoloadTsconfig: false, autoloadPackageJson: false },
});
if (!result.success) throw new AggregateError(result.logs, 'Standalone compilation failed.');
console.log(`Built ${target}: ${outfile}`);
