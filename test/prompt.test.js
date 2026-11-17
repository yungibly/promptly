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
