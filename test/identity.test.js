import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { createDesign, recipe, fromRecipe } from '../src/design.js';
import { compile, quoteZsh } from '../src/compile.js';
import { Scene, left } from '../src/scene.js';
import { preview } from '../src/preview.js';
import { materials } from '../src/ornaments.js';
import { contrastInk, palettes } from '../src/palettes.js';

const render = (source, extra = '') => {
  const result = spawnSync('zsh', ['-f'], { input: `COLUMNS=120\n${source}\n${extra}\nprint -rnP -- "$PROMPT"`, encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return result.stdout;
};

test('new designs display live username and directory across every procedural family', () => {
  for (const engine of ['surface', 'prompt', 'assembly', 'network']) {
    const design = createDesign({ engine, seed: 'live-roles', height: engine === 'network' ? 4 : 3 });
    assert.equal(design.info, true);
    const plain = preview(design, { width: 120, color: false });
    assert.ok(plain.includes(userInfo().username));
    assert.ok(plain.includes('promptly'));
    assert.equal(compile(fromRecipe(recipe(design))), compile(design));
    const without = createDesign({ ...recipe(design), info: false });
    assert.ok(!without.scene.runs.some((r) => r.kind === 'slot'));
  }
});

test('native live slots truncate, preserve literal data, and pad by cells without external commands', () => {
  const root = mkdtempSync(join(tmpdir(), 'promptly-live-'));
  try {
    const scene = new Scene(1);
    scene.text(0, left(), '[', 2).slot(0, left(1), 'username', 8, 2)
      .text(0, left(9), '] ', 2).slot(0, left(11), 'directory', 20, { fg: 'contrast', bg: 3 })
      .text(0, left(31), ' >', 4);
    const design = { ...createDesign({ engine: 'prompt', seed: 'slots' }), scene, cursor: 34, rightPrompt: '' };
    const source = compile(design);
    assert.doesNotMatch(source, /\$\((?!\()|add-zsh-hook|add-zle-hook|for\s*\(\(/);
    for (const name of ['short', 'long-directory-name-that-needs-truncation', '%F{red}$(id)`id`', '界面', 'line\nbreak', 'tab\tname']) {
      const path = join(root, name);
      mkdirSync(path);
      const output = render(source, `builtin cd -- ${quoteZsh(path)}\nPATH=/nonexistent`);
      const plain = stripVTControlCharacters(output);
      assert.ok(plain.includes(userInfo().username));
      assert.ok(plain.endsWith(' > '));
      assert.equal(plain.split('\n').length, 1, 'directory controls must be escaped by native zsh prompt expansion');
      assert.doesNotMatch(plain, /[\x00-\x1f\x7f]/);
      if (/^[a-z]+$/.test(name)) assert.ok(plain.includes(name));
      if (name.startsWith('%')) assert.ok(plain.includes(name), 'percent and substitution-looking path text remains literal');
      if (/^[ -~]+$/.test(name)) assert.equal(plain.length, design.cursor);
      assert.match(output, /\x1b\[48;2;/);
      assert.match(output, /\x1b\[49m/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('filled whitespace survives flattening and background resets before editable input', () => {
  const scene = new Scene(2);
  scene.fill(0, left(), left(16), ' ', { fg: 'contrast', bg: 2 });
  scene.text(1, left(), '>', 4);
  const design = { ...createDesign({ seed: 'solid', engine: 'prompt' }), scene, cursor: 2, rightPrompt: '' };
  const text = render(compile(design));
  assert.equal(stripVTControlCharacters(text), ' '.repeat(16) + '\n> ');
  assert.match(text, /\x1b\[48;2;/);
  assert.match(text.split('\n')[0], /\x1b\[49m$/);
});

test('partially overpainted live fields fail compilation instead of corrupting prompt alignment', () => {
  const design = createDesign({ seed: 'collision', engine: 'prompt' });
  const scene = new Scene(1).slot(0, left(), 'directory', 16).text(0, left(4), 'X');
  assert.throws(() => compile({ ...design, scene, cursor: 18 }), /reservation/);
});

test('wire operators compose with filled surfaces and reject overwriting a live reservation', () => {
  const design = createDesign({ seed: 'layered', engine: 'prompt' });
  const scene = new Scene(2).fill(0, left(), left(12), ' ', { fg: 'contrast', bg: 2 });
  scene.wire({ row: 0, x: left(2) }, { row: 0, x: left(9) }, 3, materials.square);
  scene.text(1, left(), '>');
  const source = compile({ ...design, scene, cursor: 2 });
  assert.doesNotMatch(source, /undefined|NaN/);
  assert.ok(stripVTControlCharacters(render(source)).includes('──────'));
  const collision = new Scene(1).slot(0, left(), 'directory', 16);
  collision.wire({ row: 0, x: left(2) }, { row: 0, x: left(4) }, 3, materials.square);
  assert.throws(() => compile({ ...design, scene: collision, cursor: 18 }), /reservation/);
});

test('dark capsules keep colored text while illegible preferred inks fall back to contrast', () => {
  const colors = palettes.velvet.colors;
  for (const index of [2, 3, 4]) assert.equal(contrastInk(colors[0], colors[index]), colors[index]);
  assert.equal(contrastInk('#ffffff', '#ffff00'), '#000000');
  assert.equal(contrastInk('#000000', '#110011'), '#ffffff');
  const scene = new Scene(1).slot(0, left(), 'username', 8, { fg: 2, bg: 0 });
  scene.text(0, left(8), ' >', 4);
  const source = compile({ ...createDesign({ seed: 'colored-capsule', engine: 'surface', palette: 'velvet' }), scene, cursor: 11 });
  assert.match(source, /%K\{#2a1a4a\}%F\{#00e5b0\}/);
});
