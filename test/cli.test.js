import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import packageInfo from '../package.json' with { type: 'json' };

const cli = fileURLToPath(new URL('../bin/promptly.js', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 15000 });

test('bare command is sourceable zsh, with no chatter on either output stream', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /^# Promptly/);
  const shell = spawnSync('zsh', ['-fn'], { input: result.stdout, encoding: 'utf8' });
  assert.equal(shell.status, 0, shell.stderr);
});

test('default command preserves explicit export semantics and seeded reproducibility', () => {
  const args = ['--seed', 'pipe-me', '--engine', 'prompt', '--complexity', '9'];
  const result = run(...args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, run('export', ...args).stdout);
  assert.equal(result.stdout, run(...args).stdout);
});

test('preview shortcut, help, version, and usage failures are distinct from shell output', () => {
  const args = ['--seed', 'preview', '--engine', 'prompt', '--no-color'];
  const preview = run('--preview', ...args);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(preview.stdout, run('preview', ...args).stdout);
  assert.doesNotMatch(preview.stdout, /# Promptly/);
  assert.match(run('--help').stdout, /promptly \| pbcopy/);
  assert.equal(run('--version').stdout, `promptly ${packageInfo.version}\n`);
  for (const args of [['--bogus'], ['nonsense'], ['preview', '--preview'], ['export', 'extra']]) {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^promptly:/);
  }
});
