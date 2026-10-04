// Exercise the distribution artifact away from the source tree, with no runtime
// executable on PATH and with local config files that must never be autoloaded.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createDesign, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';
import { createExplorerState, explorerAction, explorerFragments } from '../src/exploration.js';
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
  for (const engine of ['surface', 'prompt', 'network', 'assembly']) {
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
  // Unicode previews need UTF-8. The explicit ASCII fallback must also work
  // in byte-oriented environments, including Homebrew's test sandbox.
  const ascii = run(['--seed', 'homebrew', '--engine', 'prompt', '--label', 'brew', '--glyphs', 'ascii']);
  const portable = spawnSync('/bin/zsh', ['-f'], {
    input: `COLUMNS=80\n${ascii.stdout}\nprint -rP -- "$PROMPT"\npromptly_off\n`,
    encoding: 'utf8', timeout: 15000,
    env: { ...environment, PATH: '/no-external-runtime', LC_ALL: 'C', LANG: 'C' },
  });
  assert.equal(portable.status, 0, portable.stderr);
  assert.equal(portable.stderr, '');
  assert.match(portable.stdout, /brew/);
  assert.match(portable.stdout, /^[\x00-\x7f]*$/);
  checks += 4;

  // Saved component seeds need to survive bundling and filesystem relocation,
  // including values different from the root seed. No source modules or JS
  // runtime are available to the copied executable in this working directory.
  const isolated = { ...environment, PATH: '/no-external-runtime' };
  for (const engine of ['surface', 'prompt', 'network', 'assembly']) {
    const design = createDesign({ version: 7, engine, seed: `packaged-recipe/${engine}`, label: 'finn',
      complexity: 8, height: engine === 'network' ? 4 : 3,
      artSeed: `art/${engine}`, layoutSeed: `layout/${engine}`, roleSeed: `roles/${engine}`,
      motifSeed: `motif/${engine}`, interactionSeed: `interactions/${engine}`, ornamentSeed: `detail/${engine}` });
    const saved = recipe(design), file = `${engine} component recipe.json`;
    writeFileSync(join(directory, file), JSON.stringify(saved));
    const inspected = run(['inspect', '--from', file], isolated);
    assert.equal(inspected.stderr, '');
    assert.deepEqual(JSON.parse(inspected.stdout), saved);
    const replayed = run(['--from', file], isolated);
    assert.equal(replayed.stderr, '');
    assert.equal(replayed.stdout, compile(design));
    checks += 4;
  }

  // Exercise a recipe produced by a real local pin/reroll, with a mixture of
  // retained and regenerated piece seeds, rather than only an untouched design.
  const initial = createDesign({ version: 7, engine: 'assembly', seed: 'packaged-pinned', height: 6,
    fragments: 6, spread: 1, connectivity: 1, complexity: 8 });
  const [fragment] = explorerFragments(initial);
  let state = explorerAction(createExplorerState({ design: initial }), { type: 'pin', target: 'fragment', id: fragment.id });
  state = explorerAction(state, { type: 'pin', target: 'colors' });
  state = explorerAction(state, { type: 'reroll', seed: 'packaged-new-neighbors' });
  const pinned = recipe(state.current), previous = recipe(initial);
  assert.equal(pinned.fragmentSeeds[fragment.id], previous.fragmentSeeds[fragment.id]);
  assert.ok(Object.entries(pinned.fragmentSeeds).some(([id, seed]) => id !== fragment.id && seed !== previous.fragmentSeeds[id]));
  writeFileSync(join(directory, 'pinned fragment recipe.json'), JSON.stringify(pinned));
  const pinnedSource = run(['--from', 'pinned fragment recipe.json'], isolated);
  assert.equal(pinnedSource.stderr, '');
  assert.equal(pinnedSource.stdout, compile(state.current));
  const pinnedRecipe = run(['inspect', '--from', 'pinned fragment recipe.json'], isolated);
  assert.equal(pinnedRecipe.stderr, '');
  assert.deepEqual(JSON.parse(pinnedRecipe.stdout), pinned);
  checks += 6;

  // The TUI is dynamically imported. This clean rejection proves that its
  // modules were bundled, without pretending a piped process is a terminal.
  const explore = spawnSync(binary, ['explore', '--seed', 'packaged-explorer'], {
    cwd: directory, env: isolated, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024,
  });
  assert.ifError(explore.error);
  assert.equal(explore.status, 1);
  assert.equal(explore.stdout, '');
  assert.equal(explore.stderr, 'promptly: Explore needs an interactive terminal on stdin and stderr. Use promptly export for scripts.\n');
  checks += 3;
  console.log(`PASS ${checks} standalone checks: isolated binary, all engines, empty PATH, source/preview, config isolation, v7 recipe replay, pinned fragments, and bundled explorer`);
} finally { rmSync(directory, { recursive: true, force: true }); }
