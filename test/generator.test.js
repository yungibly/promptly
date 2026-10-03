import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDesign, recipe, fromRecipe, mutateDesign } from '../src/design.js';
import { compile, quoteZsh } from '../src/compile.js';
import { preview } from '../src/preview.js';
import { grammars } from '../src/grammars.js';

function zsh(code) {
  const result = spawnSync('zsh', ['-f'], { input: code, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout;
}

test('recipes deterministically reproduce source; mutation preserves art direction', () => {
  const design = createDesign({ seed: 'moon', style: 'reliquary' });
  assert.equal(compile(design), compile(fromRecipe(recipe(design))));
  const mutation = mutateDesign(design, '2');
  assert.equal(mutation.style, design.style);
  assert.equal(mutation.palette, design.palette);
  assert.equal(mutation.seed, 'moon/2');
  assert.notEqual(compile(mutation), compile(design));
  assert.equal(compile(mutation), compile(mutateDesign(design, '2')));
});

test('ornament budget and seed affect the composition, independent of colors', () => {
  const a = createDesign({ seed: 'moon', style: 'mycelium', complexity: 1 });
  const b = createDesign({ seed: 'moon', style: 'mycelium', complexity: 5 });
  assert.ok(b.scene.runs.length > a.scene.runs.length);
  const c = createDesign({ ...recipe(b), palette: 'ember' });
  assert.deepEqual(b.scene.runs, c.scene.runs);
  const d = createDesign({ ...recipe(b), seed: 'sun' });
  assert.notDeepEqual(d.scene.runs, b.scene.runs);
});

test('all grammars reflow within the terminal and preserve a short input anchor', () => {
  for (const style of Object.keys(grammars)) {
    for (const width of [10, 27, 28, 40, 79, 80, 81, 100, 120, 200]) {
      const design = createDesign({ style, seed: 'geometry', complexity: 5, label: 'twenty-character-tag' });
      const output = preview(design, { width, color: false });
      const lines = output.trimEnd().split('\n');
      for (const line of lines) assert.ok([...line].length < width, `${style}, ${width}: ${line}`);
      assert.equal(lines.length, width < 28 ? 1 : width < 80 ? 2 : design.scene.rows);
      assert.ok(lines.at(-1).length > 0);
      assert.doesNotMatch(output, /[\x00-\x09\x0b-\x1f\x7f]/);
    }
  }
});

test('the input cursor follows the left marker with exactly one space', () => {
  for (const style of Object.keys(grammars)) {
    const design = createDesign({ style, seed: 'input' });
    const output = zsh(`COLUMNS=120\n${compile(design)}\nprint -rP -- "$PROMPT"\n`);
    const plain = output.replace(/\x1b\[[0-9;]*m/g, '');
    assert.equal([...plain.split('\n').at(-2)].length, design.cursor);
    assert.match(plain, /[^ ] \n$/);
  }
});

test('sparse cell space stays sparse instead of collapsing empty cells', () => {
  const text = preview(createDesign({ style: 'reliquary', seed: 'space', label: 'finn' }), { width: 120, color: false });
  const first = text.split('\n')[0];
  assert.ok(first.indexOf('◇') > 40);
  assert.ok(first.lastIndexOf('⟦') > 90);
});

test('ASCII mode exports only ASCII art and keeps the same cell dimensions', () => {
  for (const style of Object.keys(grammars)) {
    const normal = createDesign({ style, seed: 'ascii', complexity: 5 });
    const safe = createDesign({ ...recipe(normal), glyphs: 'ascii' });
    const a = preview(normal, { width: 120, color: false });
    const b = preview(safe, { width: 120, color: false });
    assert.match(b, /^[\x20-\x7e\n]*$/);
    assert.deepEqual(a.split('\n').map((line) => [...line].length), b.split('\n').map((line) => line.length));
  }
});

test('sourcing is idempotent; disabling restores the original prompts, hooks and options', () => {
  const source = compile(createDesign({ seed: 'lifecycle' }));
  const output = zsh(`
PROMPT='original> '
RPROMPT='right'
PS2='more> '
setopt promptsubst promptbang
unsetopt promptpercent
function existing_hook() { :; }
precmd_functions=(existing_hook)
${source}
${source}
print -r -- "hooks:\${(j:,:)precmd_functions}"
promptly_off
print -r -- "$PROMPT|$RPROMPT|$PS2"
print -r -- "hooks:\${(j:,:)precmd_functions}"
print -r -- "$options[promptsubst]|$options[promptbang]|$options[promptpercent]"
print -r -- "\${+_promptly_active}|\${+functions[_promptly_build]}"
`);
  assert.equal(output, 'hooks:existing_hook\noriginal> |right|more> \nhooks:existing_hook\non|on|off\n0|0\n');
});

test('export builds with only standard zsh functions and no external commands', () => {
  const source = compile(createDesign({ seed: 'standalone' }));
  const output = zsh(`PATH=/nonexistent\nCOLUMNS=120\n${source}\nprint -r -- "ready:\${#PROMPT}"\n`);
  assert.match(output, /^ready:\d+\n$/);
  assert.doesNotMatch(source.replace(/^\s*#.*$/gm, ''), /`|\beval\b/);
});

test('native prompt expansion reflows immediately without runtime callbacks', () => {
  const source = compile(createDesign({ seed: 'resize' }));
  const output = zsh(`COLUMNS=120\n${source}
typeset old=$(print -rnP -- "$PROMPT")
[[ $(print -rnP -- "$PROMPT") == $old ]] && print same
COLUMNS=40
[[ $(print -rnP -- "$PROMPT") != $old ]] && print changed
print \${+functions[_promptly_build]}:\${+functions[_promptly_precmd]}:\${+functions[_promptly_redraw]}
`);
  assert.equal(output, 'same\nchanged\n0:0:0\n');
});

test('untrusted seeds remain comment data; shell quoting round-trips literal text', () => {
  const seed = '\nprint COMPROMISED\n$(print COMPROMISED) `print COMPROMISED` \' %F{red}';
  const source = compile(createDesign({ seed }));
  assert.equal(zsh(`${source}\nprint clean\n`), 'clean\n');
  assert.equal(zsh(`print -r -- ${quoteZsh(seed)}\n`), seed + '\n');
  assert.throws(() => createDesign({ label: '$(whoami)' }));
  assert.throws(() => createDesign({ label: 'hello\x1b[2J' }));
});

test('invalid recipes and options fail clearly', () => {
  for (const options of [{ style: '__proto__' }, { palette: 'constructor' }, { complexity: 11 }, { complexity: 1.5 }, { glyphs: 'emoji' }, { label: '' }, { seed: '' }]) {
    assert.throws(() => createDesign(options));
  }
  assert.throws(() => fromRecipe({ version: 2 }));
  assert.throws(() => fromRecipe({ version: 1, seed: 'incomplete' }));
});

test('xenoweave grows new crossing nodes with each complexity level', () => {
  for (let complexity = 1; complexity <= 5; complexity++) {
    const design = createDesign({ seed: 'crossings', style: 'xenoweave', complexity });
    const text = preview(design, { width: 120, color: false });
    assert.equal([...text].filter((glyph) => glyph === '╳').length, complexity);
  }
});

test('both function and string SIGWINCH handlers remain intact', () => {
  const source = compile(createDesign({ seed: 'traps' }));
  for (const handler of ['TRAPWINCH() { print existing; }', "trap 'print existing' WINCH"]) {
    assert.equal(zsh(`${handler}\n${source}\nkill -WINCH $$\npromptly_off\nkill -WINCH $$\n`), 'existing\nexisting\n');
  }
});

test('CLI exports a sourceable artifact and refuses accidental replacement', () => {
  const dir = mkdtempSync(join(tmpdir(), 'promptly-test-'));
  try {
    const file = join(dir, 'my prompt.zsh');
    const args = ['bin/promptly.js', 'export', '--seed', 'cli', '--out', file];
    const invoke = (argv) => spawnSync(process.execPath, argv, { encoding: 'utf8' });
    assert.equal(invoke(args).status, 0);
    assert.equal(invoke(args).status, 1);
    assert.equal(invoke([...args, '--force']).status, 0);
    assert.equal(zsh(`source ${quoteZsh(file)}\nprint installed\n`), 'installed\n');
    assert.match(readFileSync(file, 'utf8'), /"seed":"cli"/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI saves, scopes a mutation, inspects its program, and reloads a resolved recipe', () => {
  const dir = mkdtempSync(join(tmpdir(), 'promptly-program-'));
  const invoke = (...args) => {
    const result = spawnSync(process.execPath, ['bin/promptly.js', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  try {
    const originalPath = join(dir, 'original.json'), variantPath = join(dir, 'detail.json');
    invoke('inspect', '--seed', 'cli-program', '--complexity', '8', '--out', originalPath);
    invoke('mutate', '--from', originalPath, '--scope', 'ornament', '--variation', 'leaves', '--out', variantPath);
    const original = JSON.parse(invoke('inspect', '--from', originalPath, '--program'));
    const variant = JSON.parse(invoke('inspect', '--from', variantPath, '--program'));
    assert.equal(variant.recipe.version, original.recipe.version);
    assert.deepEqual(variant.derivation, original.derivation);
    assert.notEqual(variant.recipe.ornamentSeed, original.recipe.ornamentSeed);
    const source = invoke('export', '--from', variantPath);
    assert.equal(zsh(`${source}\nprint compiled\n`), 'compiled\n');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
