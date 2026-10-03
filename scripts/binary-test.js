// Exercise the distribution artifact away from the source tree, with no runtime
// executable on PATH and with local config files that must never be autoloaded.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createDesign } from '../src/design.js';
import { compile } from '../src/compile.js';
import packageInfo from '../package.json' with { type: 'json' };

const directory = mkdtempSync(join(tmpdir(), 'promptly-binary-'));
const binary = join(directory, 'promptly');
const environment = { ...process.env };
delete environment.NO_COLOR;
delete environment.BUN_OPTIONS;
delete environment.BUN_BE_BUN;
function run(args, env = environment) {
  const result = spawnSync(binary, args, { cwd: directory, env, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result;
}
try {
  copyFileSync(resolve(process.argv[2] ?? 'dist/promptly'), binary);
  chmodSync(binary, 0o755);
  writeFileSync(join(directory, '.env'), 'NO_COLOR=1\n');
  writeFileSync(join(directory, 'bunfig.toml'), 'preload = ["./unexpected.js"]\n');
  writeFileSync(join(directory, 'unexpected.js'), 'throw new Error("Local preload was executed");\n');
  assert.equal(run(['--version']).stdout, `promptly ${packageInfo.version}\n`);
  const random = run([], { ...environment, PATH: '/no-external-runtime' });
  assert.equal(random.stderr, '');
  assert.match(random.stdout, /# Promptly/);
  let checks = 3;
  for (const engine of ['prompt', 'network', 'assembly']) {
    const args = ['--seed', 'standalone', '--engine', engine, '--complexity', '8', '--label', 'finn'];
    const emitted = run(args, { ...environment, PATH: '/no-external-runtime' });
    assert.equal(emitted.stderr, '');
    assert.equal(emitted.stdout, compile(createDesign({ seed: 'standalone', engine, complexity: 8, label: 'finn' })));
    const source = join(directory, 'prompt.zsh');
    writeFileSync(source, emitted.stdout);
    const rendered = spawnSync('/bin/zsh', ['-f', '-c', 'COLUMNS=80; source "$1"; print -rP -- "$PROMPT"; promptly_off', 'zsh', source], {
      cwd: directory, encoding: 'utf8', timeout: 15000, env: { ...environment, PATH: '/no-external-runtime' },
    });
    assert.equal(rendered.status, 0, rendered.stderr);
    assert.equal(rendered.stderr, '');
    assert.ok(rendered.stdout.includes('finn'));
    const displayed = run(['--preview', ...args, '--width', '100']);
    assert.match(displayed.stdout, /\x1b\[/, 'local .env must not turn off preview colors');
    checks += 6;
  }
  console.log(`PASS ${checks} standalone checks: isolated binary, all engines, empty PATH, source/preview, and config isolation`);
} finally { rmSync(directory, { recursive: true, force: true }); }
