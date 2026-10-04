import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDesign, recipe } from '../src/design.js';
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

test('interactive exploration is opt-in and fails cleanly without a terminal', () => {
  assert.match(run('--help').stdout, /promptly explore/);
  assert.match(run('--help').stdout, /--favorites FILE/);
  const result = run('explore', '--seed', 'headless-explorer');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /interactive terminal on stdin and stderr/);
  const misplaced = run('export', '--favorites', 'favorites.json');
  assert.equal(misplaced.status, 1);
  assert.equal(misplaced.stdout, '');
  assert.match(misplaced.stderr, /--favorites is available for explore/);
});

test('explicit seed and engine overrides release incompatible saved component state', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'promptly-cli-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const original = createDesign({ seed: 'saved-components', engine: 'assembly', height: 6, fragments: 4, complexity: 8 });
  const file = join(directory, 'saved.json');
  writeFileSync(file, JSON.stringify(recipe(original)));
  const changed = run('inspect', '--from', file, '--seed', 'new-components', '--complexity', '5');
  assert.equal(changed.status, 0, changed.stderr);
  const next = JSON.parse(changed.stdout);
  assert.equal(next.complexity, 5);
  for (const key of ['artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed', 'ornamentSeed']) assert.equal(next[key], 'new-components');
  assert.notDeepEqual(next.fragmentSeeds, recipe(original).fragmentSeeds);
  assert.notDeepEqual(createDesign(next).scene, original.scene);
  assert.deepEqual(JSON.parse(run('inspect', '--from', file).stdout), recipe(original));
  const switched = run('inspect', '--from', file, '--engine', 'surface', '--height', '2');
  assert.equal(switched.status, 0, switched.stderr);
  assert.equal(JSON.parse(switched.stdout).engine, 'surface');
  assert.deepEqual(JSON.parse(switched.stdout).fragmentSeeds, {});
  const network = run('inspect', '--from', file, '--engine', 'network');
  assert.equal(network.status, 0, network.stderr);
  assert.equal(JSON.parse(network.stdout).engine, 'network');
  assert.equal(run('inspect', '--from', file, '--engine', 'network', '--fragments', '2').status, 1);
  const legacy = createDesign({ version: 3, seed: 'old-geometry', engine: 'assembly', height: 6, info: false });
  writeFileSync(file, JSON.stringify(recipe(legacy)));
  const legacyChanged = JSON.parse(run('inspect', '--from', file, '--seed', 'new-legacy').stdout);
  assert.equal(legacyChanged.version, 3);
  assert.equal(legacyChanged.ornamentSeed, legacy.ornamentSeed);
});
