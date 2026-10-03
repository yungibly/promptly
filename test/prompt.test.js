import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createDesign, fromRecipe, recipe, mutateDesign } from '../src/design.js';
import { compile } from '../src/compile.js';
import { preview } from '../src/preview.js';
import { gallery } from '../src/gallery.js';

test('automatic sampling retains all procedural engines and freezes the resolved recipe', () => {
  const counts = { surface: 0, prompt: 0, network: 0, assembly: 0 }, heights = new Set();
  for (let i = 0; i < 120; i++) {
    const design = createDesign({ seed: `all-possibilities/${i}`, complexity: 8 });
    counts[design.engine]++;
    heights.add(design.height);
    assert.equal(compile(design), compile(fromRecipe(recipe(design))));
    const simple = createDesign({ seed: design.seed, complexity: 1 });
    assert.equal(design.engine, simple.engine);
    assert.equal(design.height, simple.height, 'complexity must not force a larger footprint');
  }
  for (const count of Object.values(counts)) assert.ok(count >= 20);
  for (const height of [1, 2, 3, 4, 6, 8, 12]) assert.ok(heights.has(height));
  assert.ok(['surface', 'prompt'].includes(createDesign({ seed: 'single', height: 1 }).engine));
  for (let i = 0; i < 20; i++) {
    const low = createDesign({ seed: `constraints/${i}`, height: 2 });
    assert.notEqual(low.engine, 'network');
    const unlinked = createDesign({ seed: `constraints/${i}`, connectivity: 0 });
    assert.notEqual(unlinked.engine, 'network');
  }
  assert.throws(() => createDesign({ engine: 'prompt', height: 4 }), /Height/);
  assert.throws(() => createDesign({ height: 0 }), /Height/);
});

test('mixed galleries balance families rather than replacing the earlier visual directions', () => {
  const options = { seed: 'whole-range', complexity: 9 };
  const designs = gallery(options, 12);
  for (const engine of ['surface', 'prompt', 'assembly', 'network']) assert.equal(designs.filter((d) => d.engine === engine).length, 3);
  const seeds = designs.map((d) => d.seed);
  assert.deepEqual(gallery(options, 12).map((d) => d.seed), seeds);
  assert.deepEqual(gallery({ ...options, palette: 'ember', glyphs: 'ascii' }, 12).map((d) => d.seed), seeds);
  for (const engine of ['surface', 'prompt', 'assembly', 'network']) assert.ok(gallery({ ...options, engine }, 3).every((d) => d.engine === engine));
});

test('compact geometry stays attached to label and input at one, two, and three rows', () => {
  const forms = new Set();
  let folds = 0, unlinked = 0, bridges = 0, bevels = 0;
  for (let i = 0; i < 192; i++) {
    const height = 1 + i % 3;
    const design = createDesign({ seed: `integrated/${i}`, engine: 'prompt', version: 4, info: false, height, complexity: 10, connectivity: i % 2, spread: 1 });
    const { inscription, marker, tokens, attachments, linked } = design.program.derivation;
    forms.add(JSON.stringify(design.program.derivation));
    assert.equal(design.scene.rows, height);
    assert.equal(marker.row, height - 1);
    assert.equal(marker.x + marker.width + 1, design.cursor);
    assert.ok(design.cursor <= (height === 1 ? 40 : 10));
    for (const part of tokens) {
      assert.ok(part.x >= 0 && part.x + part.width <= 44);
      assert.ok(part.row >= 0 && part.row < height);
    }
    for (const part of attachments) {
      assert.ok(['label', 'input'].includes(part.target));
      if (part.op === 'cap') {
        assert.equal(Math.abs(part.row - inscription.row), 1);
        assert.ok(part.x <= inscription.x && part.x + part.width >= inscription.x + inscription.width);
        bevels += !!part.bevel;
      }
      folds += part.op === 'fold';
    }
    unlinked += !linked; bridges += linked;
  }
  assert.equal(forms.size, 192);
  assert.ok(folds > 30 && unlinked > 100 && bridges > 15 && bevels > 10);
});

test('compact exports preserve inscriptions, input markers, ASCII geometry, and editing space', () => {
  const tiny = createDesign({ engine: 'prompt', version: 4, info: false, seed: 'tiny-cap/0', label: 'x', height: 3, complexity: 1 });
  assert.match(preview(tiny, { color: false }).split('\n')[0], /·/, 'a single-cell cap must remain visible');
  const label = 'twenty-character-tag';
  for (let i = 0; i < 12; i++) {
    const design = createDesign({ seed: `readable/${i}`, engine: 'prompt', version: 4, info: false, height: 1 + i % 3, complexity: 10, label });
    const safe = createDesign({ ...recipe(design), glyphs: 'ascii' });
    for (const width of [80, 120, 200]) {
      const text = preview(design, { width, color: false });
      const ascii = preview(safe, { width, color: false });
      assert.ok(text.includes(label));
      assert.equal(text.trimEnd().split('\n').length, design.height);
      assert.ok(text.split('\n').every((line) => line.length < width));
      assert.deepEqual(text.split('\n').map((line) => line.length), ascii.split('\n').map((line) => line.length));
      assert.match(ascii, /^[\x20-\x7e\n]*$/);
      const input = text.split('\n').at(-2).slice(0, design.cursor);
      assert.match(input, /[›❯▷»>] $/);
      assert.ok(width - design.cursor >= 40);
    }
  }
});

test('compact surface/detail variation preserves the role geometry and saved recipes', () => {
  const design = createDesign({ version: 4, engine: 'prompt', seed: 'small-recursion', complexity: 9, height: 3 });
  assert.equal(design.version, 4);
  for (const surface of [{ material: 'heavy' }, { alphabet: 'runic' }, { palette: 'abyss' }]) {
    const variant = createDesign({ ...recipe(design), ...surface });
    assert.deepEqual(variant.program.derivation, design.program.derivation);
  }
  const detail = mutateDesign(design, 'micro', 'ornament');
  assert.deepEqual(detail.program.derivation, design.program.derivation);
  assert.notDeepEqual(detail.program.annotations, design.program.annotations);
  assert.equal(compile(design), compile(fromRecipe(recipe(design))));
  assert.throws(() => fromRecipe({ ...recipe(design), engine: 'auto' }));
});

test('version-3 freeform recipes retain the previous scene and primitive program', () => {
  const saved = JSON.parse(readFileSync(new URL('../examples/assembly.json', import.meta.url)));
  const design = fromRecipe(saved);
  assert.equal(design.engine, 'assembly');
  assert.deepEqual(recipe(design), saved);
  const content = JSON.stringify({ scene: design.scene, cursor: design.cursor, rightPrompt: design.rightPrompt, program: design.program });
  assert.equal(createHash('sha256').update(content).digest('hex'), '1429e8e96cca0c0eeb7a0fbed991a9392dc61c3aa640aca85b701eb4f21fd6d2');
});
