import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveMotif, evolveMotif } from '../src/motifs.js';
import { rasterize } from '../src/marks.js';

const occupied = ({ cells }) => cells.map(({ x, y, kind }) => `${x},${y}:${kind}`).sort().join('|');

test('one shared motif gives bounded, evolving descendants rather than enlarged copies', () => {
  let changed = 0, fragmented = 0, shifted = 0;
  const forms = new Set();
  for (let i = 0; i < 128; i++) {
    const motif = deriveMotif(`evolving-motif/${i}`);
    assert.deepEqual(deriveMotif(motif.seed), motif);
    assert.deepEqual(deriveMotif(motif.seed), JSON.parse(JSON.stringify(motif)));
    const generations = [0, 1, 2, 3].map((step) => evolveMotif(motif, { width: 18, height: 4, step }));
    for (const [index, result] of generations.entries()) {
      assert.ok(result.cells.length > 0);
      assert.deepEqual([...rasterize(result.tree).values()], result.cells);
      assert.ok(result.cells.every(({ x, y }) => x >= 0 && x < 18 && y >= 0 && y < 4));
      if (index) {
        assert.ok(result.evolution.span <= generations[index - 1].evolution.span);
        assert.ok(result.evolution.depth <= generations[index - 1].evolution.depth);
      }
    }
    forms.add(occupied(generations[0]));
    changed += occupied(generations[0]) !== occupied(generations[3]);
    fragmented += generations[3].cells.length < generations[0].cells.length;
    shifted += generations[3].evolution.offset !== generations[0].evolution.offset;
  }
  assert.ok(forms.size > 100, 'shared motifs vary actual occupied geometry');
  assert.ok(changed > 120 && fragmented > 90 && shifted > 60, 'graded repetitions must visibly evolve');
});

test('motifs fit tiny prompt reservations and retain geometry across paint choices', () => {
  const forms = new Set();
  for (let i = 0; i < 128; i++) {
    const motif = deriveMotif(`small-motif/${i}`);
    for (const width of [1, 2, 3, 4]) for (const step of [0, 1, 3, 8, 64]) {
      const a = evolveMotif(motif, { width, step, ink: 2 });
      const b = evolveMotif(motif, { width, step, ink: 4 });
      assert.ok(a.cells.length && a.cells.every(({ x, y }) => x >= 0 && x < width && y === 0));
      assert.equal(occupied(a), occupied(b));
      assert.ok(b.cells.every((cell) => cell.ink === 4));
      if (width === 4 && step === 0) forms.add(occupied(a));
    }
  }
  assert.ok(forms.size >= 6, 'narrow motifs must not all collapse to the same bar');
  assert.throws(() => deriveMotif(''), /Motif seed/);
  assert.throws(() => evolveMotif(deriveMotif('valid'), { width: 0 }), /bounds/);
  assert.throws(() => evolveMotif(deriveMotif('valid'), { width: 4, step: -1 }), /step/);
});
