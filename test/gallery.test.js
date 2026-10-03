import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesign, recipe } from '../src/design.js';
import { signature } from '../src/gallery.js';
import { Scene, left } from '../src/scene.js';

// Small complete prompts isolate a visible composition without relying on the
// generator's private feature indices or its current random choices.
const specimen = (paint, rows = 4) => {
  const scene = new Scene(rows);
  paint(scene);
  scene.text(rows - 1, left(), '>', 4);
  return { glyphs: 'unicode', scene, cursor: 2 };
};

test('structural signatures stay identical across color and glyph-mode changes', () => {
  for (const engine of ['surface', 'prompt', 'assembly', 'network']) {
    const design = createDesign({ engine, seed: `metric/${engine}`, height: engine === 'network' ? 4 : 3, complexity: 8, weight: 0.9 });
    const expected = signature(design);
    assert.ok(expected.every(Number.isFinite));
    assert.deepEqual(signature({ ...design, colors: design.colors.map(() => '#abcdef') }), expected);
    for (const override of [{ palette: 'paper' }, { glyphs: 'ascii' }, { glyphs: 'powerline' }]) {
      assert.deepEqual(signature(createDesign({ ...recipe(design), ...override })), expected, `${engine}: ${JSON.stringify(override)}`);
    }
  }
});

test('equal cell counts, bounds, and row/column masses still reveal different arrangements', () => {
  // Both arrangements have six cells, the same bounding box and centroid, and
  // exactly matching row/column occupancies. Their local connectivity differs.
  const a = [[10, 0], [11, 0], [12, 1], [13, 1], [10, 2], [13, 2]];
  const b = [[10, 0], [13, 0], [10, 1], [13, 1], [11, 2], [12, 2]];
  const points = (cells) => specimen((scene) => cells.forEach(([x, y]) => scene.text(y, left(x), 'o', 2)));
  assert.notDeepEqual(signature(points(a)), signature(points(b)));
});

test('painted spaces count as occupied mass and later erasure removes that mass', () => {
  const ink = { fg: 'contrast', bg: 0 };
  const empty = specimen((scene) => scene.text(0, left(10), ' '.repeat(12), 2));
  const filled = specimen((scene) => scene.text(0, left(10), ' '.repeat(12), ink));
  const explicit = specimen((scene) => scene.text(0, left(10), 'X'.repeat(12), ink));
  const erased = specimen((scene) => scene.text(0, left(10), ' '.repeat(12), ink).text(0, left(10), ' '.repeat(12), 2));
  assert.deepEqual(signature(filled), signature(explicit), 'visible background is material even without foreground glyphs');
  assert.notDeepEqual(signature(filled), signature(empty));
  assert.deepEqual(signature(erased), signature(empty), 'measure the final composition rather than earlier paint instructions');
});

test('filled surfaces and thin strokes remain distinct at the same occupied coordinates', () => {
  const filled = specimen((scene) => scene.text(0, left(10), ' '.repeat(12), { fg: 'contrast', bg: 2 }));
  const line = specimen((scene) => scene.text(0, left(10), '─'.repeat(12), 2));
  const text = specimen((scene) => scene.text(0, left(10), 'x'.repeat(12), 2));
  assert.notDeepEqual(signature(filled), signature(line));
  assert.notDeepEqual(signature(line), signature(text));
});
