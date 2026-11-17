import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesign } from '../src/design.js';
import { quality, curate } from '../src/quality.js';
import { Scene, left } from '../src/scene.js';

// A bare design with a hand-built scene, so each penalty can be isolated.
function specimen(rows, paint) {
  const scene = new Scene(rows);
  paint(scene);
  scene.text(rows - 1, left(), '>', 4);
  return { ...createDesign({ seed: 'quality', engine: 'prompt', info: false }), scene, cursor: 2 };
}

test('letters and digits in artwork score below marks in the same place', () => {
  const marks = quality(specimen(2, (s) => s.text(0, left(4), '◇·◇·◇·◇', 2))).score;
  const text = quality(specimen(2, (s) => s.text(0, left(4), 'A1·B2·C3', 2))).score;
  assert.ok(text < marks, `${text} < ${marks}`);
});

test('rows that carry almost nothing cost more than rows crossed by one structure', () => {
  const confetti = quality(specimen(8, (s) => { for (let y = 0; y < 7; y += 2) s.text(y, left(10 + y * 7), '·', 2); })).score;
  const structure = quality(specimen(8, (s) => {
    for (let y = 0; y < 7; y++) s.text(y, left(10), '│', 2);
    s.fill(3, left(10), left(60), '─', 2);
  })).score;
  assert.ok(confetti < structure, `${confetti} < ${structure}`);
});

test('curation keeps the first roll\'s engine and is deterministic for given seeds', () => {
  const seeds = Array.from({ length: 6 }, (_, i) => `curate/${i}`);
  const make = (seed) => createDesign({ seed });
  const chosen = curate(make, seeds);
  assert.equal(chosen.engine, make(seeds[0]).engine);
  assert.equal(curate(make, seeds).seed, chosen.seed);
  const score = quality(chosen).score;
  for (const seed of seeds) {
    const other = make(seed);
    if (other.engine === chosen.engine) assert.ok(quality(other).score <= score);
  }
});

test('requested text and filled surfaces behind live fields are not penalized', () => {
  const labeled = (label) => quality(createDesign({ seed: 'quality-label', engine: 'prompt', height: 1, weight: 0, label })).score;
  assert.equal(labeled('abcdefgh'), labeled('........'));
  const filled = createDesign({ seed: 'filled/2', engine: 'surface', height: 1, weight: 1 });
  const bare = createDesign({ seed: 'filled/2', engine: 'surface', height: 1, weight: 0 });
  assert.ok(quality(filled).metrics.scatter < 0.5, JSON.stringify(quality(filled).metrics));
  assert.ok(quality(filled).score >= quality(bare).score - 0.05);
});
