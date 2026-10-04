import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createDesign, fromRecipe, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';
import { flatten } from '../src/flatten.js';
import { rasterize } from '../src/marks.js';
import { fragmentAnchor } from '../src/assembly.js';

const options = (seed, extra = {}) => ({ seed, engine: 'assembly', version: 7, height: 8, fragments: 6, complexity: 8, connectivity: 0, symmetry: 'none', ...extra });
const position = (point, width) => Math.floor(point.at * (width - 1) / 1000) + point.offset;
const arrangement = (design) => ({ zone: design.program.derivation.zone, splits: design.program.derivation.splits,
  pieces: design.program.derivation.pieces.map(({ id, fragmentId, rect }) => ({ id, fragmentId, rect })), rows: design.scene.rows, rowMap: design.program.rowMap });
function paintedFragment(design, piece, width) {
  const start = position(fragmentAnchor(piece.rect), width), result = [];
  const rows = flatten(design, width);
  for (let local = 0; local < piece.rect.height; local++) {
    const row = rows[design.program.rowMap[piece.rect.y + local]];
    for (let x = start; x < start + piece.rect.width; x++) {
      const span = row.find((part) => x >= position(part.from, width) && x < position(part.to, width));
      if (!span) { result.push([' ', 0]); continue; }
      const chars = [...span.text], phase = ((x - position(span.origin, width)) % chars.length + chars.length) % chars.length;
      result.push([chars[phase], span.ink]);
    }
  }
  return result;
}

test('local assembly rerolls preserve pinned geometry, detail, and displayed positions', () => {
  let changed = 0;
  for (let i = 0; i < 32; i++) {
    const before = createDesign(options(`local-fragments/${i}`));
    const saved = recipe(before), pinned = before.program.derivation.pieces[0];
    const seeds = Object.fromEntries(Object.entries(saved.fragmentSeeds).map(([id, seed]) => [id, id === pinned.fragmentId ? seed : `${seed}/reroll`]));
    const after = createDesign({ ...saved, seed: `new-root/${i}`, fragmentSeeds: seeds });
    assert.deepEqual(arrangement(after), arrangement(before));
    const kept = after.program.derivation.pieces.find((piece) => piece.id === pinned.id);
    assert.deepEqual(kept, pinned);
    assert.deepEqual(after.program.annotations.find((entry) => entry.id === pinned.id), before.program.annotations.find((entry) => entry.id === pinned.id));
    for (const width of [79, 119, 239]) assert.deepEqual(paintedFragment(after, kept, width), paintedFragment(before, pinned, width));
    changed += before.program.derivation.pieces.some((piece, n) => piece.fragmentId !== pinned.fragmentId && JSON.stringify(piece.tree) !== JSON.stringify(after.program.derivation.pieces[n].tree));
    assert.deepEqual(recipe(fromRecipe(JSON.parse(JSON.stringify(recipe(after))))), recipe(after));
  }
  assert.ok(changed > 28, 'rerolling unpinned fragments must visibly change their structure');
});

test('linked rerolls keep pinned negative space intact and connect only explicit boundary ports', () => {
  let links = 0, connected = 0;
  for (let i = 0; i < 80; i++) {
    const before = createDesign(options(`linked-pins/${i}`, { spread: 1, connectivity: 1, complexity: undefined }));
    const saved = recipe(before), pinned = before.program.derivation.pieces[0];
    const after = createDesign({ ...saved, seed: 'changed', fragmentSeeds: Object.fromEntries(Object.entries(saved.fragmentSeeds)
      .map(([id, seed]) => [id, id === pinned.fragmentId ? seed : `${seed}/reroll`])) });
    for (const width of [79, 119, 239]) assert.deepEqual(paintedFragment(after, pinned, width), paintedFragment(before, pinned, width), `${before.seed}: ${width}`);
    for (const design of [before, after]) for (const link of design.program.derivation.links) {
      const a = design.program.derivation.pieces[link.a], b = design.program.derivation.pieces[link.b];
      assert.equal(link.start, a.rect.width - 1); assert.equal(link.end, 0);
      assert.ok(rasterize(a.tree).has(`${link.start},${link.row - a.rect.y}`));
      assert.ok(rasterize(b.tree).has(`${link.end},${link.row - b.rect.y}`));
      assert.deepEqual(link.ports.map(({ side }) => side), ['right', 'left']);
      links++;
    }
    connected += before.program.derivation.links.length > 0;
  }
  assert.ok(links > 20 && connected > 10, 'explicitly connected exploration must retain real bridges');
});

test('motif, material, and detail streams do not resize the reserved arrangement', () => {
  let changedMotifs = 0, changedDetail = 0, changedComplexity = 0;
  for (let i = 0; i < 24; i++) {
    const base = createDesign(options(`independent-pieces/${i}`, { complexity: 1 }));
    const saved = recipe(base);
    for (const override of [{ motifSeed: `other-motif/${i}` }, { material: 'double' }, { alphabet: 'runic' }, { ornamentSeed: `detail/${i}` }, { complexity: 10 }]) {
      const other = createDesign({ ...saved, ...override });
      assert.deepEqual(arrangement(other), arrangement(base));
      if (override.motifSeed) changedMotifs += JSON.stringify(other.program.derivation) !== JSON.stringify(base.program.derivation);
      else if (override.complexity) changedComplexity += JSON.stringify(other.program.derivation) !== JSON.stringify(base.program.derivation);
      else assert.deepEqual(other.program.derivation, base.program.derivation);
      if (override.ornamentSeed) changedDetail += JSON.stringify(other.program.annotations) !== JSON.stringify(base.program.annotations);
    }
  }
  assert.ok(changedMotifs > 15 && changedDetail > 15 && changedComplexity > 15);
});

test('mirrored fragments share one pin identity while keeping separate bounded cells', () => {
  for (let i = 0; i < 40; i++) {
    const design = createDesign(options(`paired-motif/${i}`, { symmetry: 'mirror', height: 12, fragments: 9 }));
    const pieces = design.program.derivation.pieces;
    assert.equal(Object.keys(recipe(design).fragmentSeeds).length, pieces.length / 2);
    const tagged = design.scene.runs.filter((run) => run.fragmentId !== undefined);
    assert.equal(tagged.length, design.program.stats.occupiedCells, 'every painted art cell keeps its logical fragment identity through integration');
    assert.ok(tagged.every((run) => pieces.some((piece) => piece.fragmentId === run.fragmentId)));
    for (let n = 0; n < pieces.length; n += 2) {
      const a = pieces[n], b = pieces[n + 1];
      assert.equal(a.fragmentId, b.fragmentId); assert.equal(a.seed, b.seed);
      const ac = rasterize(a.tree), bc = rasterize(b.tree);
      assert.equal(ac.size, bc.size, 'reflection preserves intentional voids too');
      for (const cell of ac.values()) {
        assert.ok(cell.x >= 0 && cell.y >= 0 && cell.x < a.rect.width && cell.y < a.rect.height);
        assert.ok(bc.has(`${a.rect.width - 1 - cell.x},${cell.y}`));
      }
    }
  }
});

test('a fully cut fragment retains its intentional void and pin reservation', () => {
  const design = createDesign(options('intentional-void/20', { height: 2, fragments: 1, spread: 0, complexity: 10 }));
  const piece = design.program.derivation.pieces[0];
  assert.equal(rasterize(piece.tree).size, 0);
  assert.equal(design.program.stats.occupiedCells, 0);
  const pinned = createDesign({ ...recipe(design), seed: 'a-different-root' });
  assert.deepEqual(pinned.program.derivation.pieces, design.program.derivation.pieces);
  assert.deepEqual(arrangement(pinned), arrangement(design));
  assert.equal(pinned.program.stats.occupiedCells, 0, 'do not replace a deliberate void with a fallback motif');
});

test('version-6 assembly exports and compositions retain their frozen hashes', () => {
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  const fixtures = JSON.parse(readFileSync(new URL('./fixtures/v6-baseline.json', import.meta.url)));
  for (const fixture of fixtures.filter(({ recipe }) => recipe.engine === 'assembly')) {
    const design = fromRecipe(fixture.recipe);
    assert.equal(design.program.engine, 'spatial-assembly/1');
    assert.equal(hash(compile(design)), fixture.source);
    const { scene, cursor, rightPrompt, program } = design;
    assert.equal(hash(JSON.stringify({ scene, cursor, rightPrompt, program })), fixture.composition);
  }
});
