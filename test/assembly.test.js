import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createDesign, fromRecipe, recipe, mutateDesign } from '../src/design.js';
import { group, move, stroke, line, rasterize } from '../src/marks.js';
import { fragmentAnchor } from '../src/assembly.js';
import { gallery, signature } from '../src/gallery.js';
import { preview } from '../src/preview.js';

test('cell algebra composes diagonals, repetitions, intersections, reflection, and negative space', () => {
  assert.deepEqual(line([0, 0], [3, 3]), [[0, 0], [1, 1], [2, 2], [3, 3]]);
  const crossed = group(stroke(0, 0, 4, 4), stroke(0, 4, 4, 0));
  assert.equal(rasterize(crossed).get('2,2').bits, 48);
  const masked = { op: 'cut', x: 2, y: 0, width: 1, height: 5, child: crossed };
  const tree = move({ op: 'repeat', count: 3, dx: 6, dy: 0, child: masked }, 1, 2);
  const cells = rasterize(tree);
  for (const x of [3, 9, 15]) assert.ok(!cells.has(`${x},4`));
  assert.ok(cells.has('1,2') && cells.has('17,6'));
  const flipped = rasterize({ op: 'reflect', axis: 'x', at: 2, child: stroke(0, 0, 4, 4) });
  assert.ok([...flipped.values()].every((c) => c.bits === 16));
  const clippedFlip = rasterize({ op: 'reflect', axis: 'x', at: 2, child: { op: 'clip', x: 0, y: 0, width: 5, height: 5, child: stroke(0, 0, 4, 4) } });
  assert.deepEqual(clippedFlip, flipped, 'masking must transform direction bits as well as positions');
});

test('256 assembly seeds vary silhouette, occupied medium, scale, and fragmentation', () => {
  const counts = { unlinked: 0, noStrokes: 0, texture: 0, short: 0, tall: 0, small: 0, broad: 0, single: 0, many: 0 };
  const forms = new Set();
  for (let i = 0; i < 256; i++) {
    const design = createDesign({ engine: 'assembly', seed: `assembly/${i}`, complexity: 8 });
    const s = design.program.stats;
    counts.unlinked += s.links === 0; counts.noStrokes += !s.operations.stroke; counts.texture += !!s.operations.pixel;
    counts.short += design.scene.rows <= 3; counts.tall += design.scene.rows >= 8;
    counts.small += s.span < 30; counts.broad += s.span > 60;
    counts.single += s.fragments === 1; counts.many += s.fragments >= 5;
    forms.add(JSON.stringify(signature(design)));
    assert.ok(design.scene.rows >= 2 && design.scene.rows <= design.height);
    assert.ok(s.occupiedCells > 0 && s.occupiedCells < 79 * 11);
    assert.ok(s.nodes < 5000, 'bounded recursive program size');
  }
  assert.ok(counts.unlinked > 175, 'connections must be optional, not a disguised universal spine');
  for (const [name, count] of Object.entries(counts)) assert.ok(count >= 15, `${name}: only ${count} specimens`);
  assert.ok(forms.size > 245, 'color changes do not count as structural diversity');
});

test('fragment reservations stay disjoint and in bounds as terminal width increases', () => {
  for (let i = 0; i < 128; i++) {
    const design = createDesign({ engine: 'assembly', seed: `bounds/${i}`, complexity: 10, height: 12, connectivity: 0 });
    const { pieces, links } = design.program.derivation;
    assert.equal(links.length, 0);
    for (const piece of pieces) for (const cell of rasterize(piece.tree).values()) {
      assert.ok(cell.x >= 0 && cell.x < piece.rect.width && cell.y >= 0 && cell.y < piece.rect.height);
    }
    for (const width of [80, 81, 120, 200, 1000]) {
      const rects = pieces.map(({ rect }) => {
        const a = fragmentAnchor(rect);
        return { ...rect, x: Math.floor(a.at * (width - 2) / 1000) + a.offset };
      });
      for (const a of rects) {
        assert.ok(a.x >= 0 && a.x + a.width < width);
        for (const b of rects) if (a !== b) {
          assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
        }
      }
    }
  }
});

test('mirrored assemblies reflect geometry while text remains independently readable', () => {
  const design = createDesign({ engine: 'assembly', seed: 'mirror-pieces', symmetry: 'mirror', height: 10, complexity: 9 });
  const { pieces, zone } = design.program.derivation;
  for (let i = 0; i < pieces.length; i += 2) {
    const a = pieces[i], b = pieces[i + 1], reflected = rasterize(b.tree);
    assert.equal(a.rect.x + b.rect.x + a.rect.width, 2 * zone.x + zone.width);
    for (const cell of rasterize(a.tree).values()) assert.ok(reflected.has(`${a.rect.width - 1 - cell.x},${cell.y}`));
  }
  const variant = mutateDesign(design, 'detail', 'ornament');
  assert.deepEqual(design.program.derivation, variant.program.derivation);
  assert.deepEqual(design.program.rowMap, variant.program.rowMap);
});

test('legacy row compaction and maximum-density assemblies use the real renderer', () => {
  let links = 0;
  for (let i = 0; i < 12; i++) {
    const design = createDesign({ version: 6, engine: 'assembly', seed: `render/${i}`, height: i % 2 ? 12 : 2, spread: 1, fragments: 6, connectivity: 1, density: 0.85, complexity: 10 });
    links += design.program.stats.links;
    const portable = createDesign({ ...recipe(design), glyphs: 'ascii' });
    for (const width of [80, 81, 160]) {
      const lines = preview(design, { width, color: false }).trimEnd().split('\n');
      const ascii = preview(portable, { width, color: false }).trimEnd().split('\n');
      assert.equal(lines.length, design.scene.rows);
      assert.ok(lines[0].trim().length, 'empty top margins must be removed');
      assert.ok(lines.at(-2).trim().length, 'empty bottom margins must be removed');
      assert.ok(lines.every((line) => line.length < width));
      assert.deepEqual(lines.map((line) => line.length), ascii.map((line) => line.length));
      assert.ok(ascii.every((line) => /^[\x20-\x7e]*$/.test(line)));
      assert.ok(!lines.some((line, n) => !line.trim() && !lines[n + 1]?.trim()), 'at most one empty row between pieces');
    }
  }
  assert.ok(links > 0, 'explicitly connected assemblies must exercise optional bridges');
});

test('galleries select deterministic geometric variety independently of palette and glyph fallback', () => {
  const options = { engine: 'assembly', seed: 'gallery-variety', complexity: 8 };
  const designs = gallery(options, 6), seeds = designs.map((d) => d.seed);
  assert.equal(new Set(seeds).size, 6);
  assert.deepEqual(gallery(options, 6).map((d) => d.seed), seeds);
  assert.deepEqual(gallery({ ...options, palette: 'ember', glyphs: 'ascii' }, 6).map((d) => d.seed), seeds);
  assert.ok(designs.some((d) => d.scene.rows <= 3) && designs.some((d) => d.scene.rows >= 7));
  assert.ok(new Set(designs.map((d) => JSON.stringify(signature(d)))).size === designs.length);
});

test('version-2 network recipes keep the pre-assembly geometry and derivation', () => {
  const saved = JSON.parse(readFileSync(new URL('../examples/network.json', import.meta.url)));
  const design = fromRecipe(saved);
  assert.equal(design.engine, 'network');
  assert.equal(design.version, 2);
  assert.deepEqual(recipe(design), saved);
  const content = JSON.stringify({ scene: design.scene, cursor: design.cursor, rightPrompt: design.rightPrompt, program: design.program });
  assert.equal(createHash('sha256').update(content).digest('hex'), 'e5bb58ec491eda1de4f1fd1c28ee6dbb53d786b63f2f17411ace59b2856ff719');
});
