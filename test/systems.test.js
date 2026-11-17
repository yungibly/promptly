import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesign, recipe, fromRecipe, mutateDesign } from '../src/design.js';
import { compile } from '../src/compile.js';
import { flatten } from '../src/flatten.js';
import { engines } from '../src/engines.js';

const systems = Object.keys(engines).filter((name) => engines[name].since === 8);
const value = (a, width) => Math.trunc(a.at * (width - 1) / 1000) + a.offset;
const cellsOf = (design, width) => flatten(design, width).map((spans) => {
  const row = [];
  for (const span of spans) {
    const chars = [...span.text], origin = value(span.origin, width);
    for (let x = value(span.from, width); x < value(span.to, width); x++) row[x] = { ch: chars[((x - origin) % chars.length + chars.length) % chars.length], ink: span.ink, role: span.role };
  }
  return row;
});

test('version-8 systems are deterministic and round-trip their recipes exactly', () => {
  for (const engine of systems) for (const height of [engines[engine].rows[0], 3, 6]) {
    const design = createDesign({ seed: `system-roundtrip/${engine}/${height}`, engine, height });
    const source = compile(design);
    assert.equal(design.version, 8);
    assert.equal(compile(createDesign({ seed: design.seed, engine, height })), source, `${engine}: not deterministic`);
    assert.equal(compile(fromRecipe(recipe(design))), source, `${engine}: recipe changed the export`);
    assert.ok(source.length < 40000, `${engine}: export grew to ${source.length} bytes`);
  }
});

test('live text keeps a clear margin, the input row stays empty, and the cursor leaves room to type', () => {
  for (const engine of systems) for (let i = 0; i < 24; i++) {
    const design = createDesign({ seed: `system-text/${engine}/${i}`, engine });
    assert.ok(design.cursor <= 50, `${engine}/${i}: cursor at ${design.cursor}`);
    for (const width of [80, 121, 240]) {
      const rows = cellsOf(design, width);
      const roles = flatten(design, width).flatMap((spans, row) => spans.filter((s) => s.role).map((s) => ({ row, from: value(s.from, width), to: value(s.to, width) })));
      // Username and directory are two slots, or one live run when they flow.
      assert.ok(design.info === false ? !roles.length : roles.length >= 1 && roles.length <= 2, `${engine}/${i}: live roles missing at ${width}`);
      for (const role of roles) for (const x of [role.from - 1, role.to]) {
        const cell = rows[role.row][x], bed = typeof rows[role.row][role.from]?.ink === 'object';
        // Neighbors are bare space, other text, or the bed the text sits on;
        // never a glyph of generated art.
        assert.ok(!cell || cell.role || /^[ \w./~-]$/.test(cell.ch) && (bed || !(typeof cell.ink === 'object' && cell.ink.bg)), `${engine}/${i}: art touches a live field at ${width}`);
      }
      const input = rows.at(-1).slice(design.cursor - 2).filter((cell) => cell && cell.ch !== ' ');
      assert.ok(input.length <= 1, `${engine}/${i}: input row is not clear`);
    }
  }
});

test('ASCII glyphs preserve every system geometry with one-cell substitutions', () => {
  for (const engine of systems) for (let i = 0; i < 6; i++) {
    const options = { seed: `system-ascii/${engine}/${i}`, engine };
    const unicode = createDesign(options), ascii = createDesign({ ...options, glyphs: 'ascii' });
    assert.deepEqual(ascii.program, unicode.program);
    for (const width of [80, 160]) {
      const a = cellsOf(ascii, width), u = cellsOf(unicode, width);
      assert.deepEqual(a.map((row) => row.length), u.map((row) => row.length));
      for (const row of a) for (const cell of row) if (cell && !cell.role) assert.match(cell.ch, /^[\x20-\x7e]$/, `${engine}: ${cell.ch}`);
    }
  }
});

test('ornament and color changes keep the structural derivation', () => {
  for (const engine of systems) for (let i = 0; i < 6; i++) {
    const design = createDesign({ seed: `system-scope/${engine}/${i}`, engine });
    assert.deepEqual(mutateDesign(design, 'detail', 'ornament').program.derivation, design.program.derivation);
    assert.deepEqual(createDesign({ ...recipe(design), colorSeed: 'other', colors: undefined, colorProgram: undefined }).program.derivation, design.program.derivation);
  }
});

test('each system is compact first, keeps its tall forms on request, and reaches every arrangement', () => {
  for (const engine of systems) {
    const tall = new Set(), arrangements = new Set(), kinds = new Set();
    for (let i = 0; i < 64; i++) {
      const sampled = createDesign({ seed: `system-reach/${engine}/${i}`, engine });
      assert.ok(sampled.height <= 4, `${engine}/${i}: automatic height ${sampled.height}`);
      const short = createDesign({ seed: `system-reach/${engine}/${i}`, engine, height: 1 + i % 3 });
      assert.equal(short.program.traits.form, 'compact');
      assert.equal(short.scene.rows, short.height);
      arrangements.add(short.program.traits.arrangement); kinds.add(short.program.traits.kind);
      const big = createDesign({ seed: `system-reach/${engine}/${i}`, engine, height: 4 + i % 5 });
      tall.add(big.program.traits.form ?? big.program.traits.kind ?? big.program.traits.flow);
    }
    assert.ok(arrangements.size >= 3, `${engine}: ${[...arrangements]}`);
    assert.ok(kinds.size >= (['automaton', 'growth', 'plot'].includes(engine) ? 1 : 2), `${engine}: ${[...kinds]}`);
    assert.ok(tall.size >= 2 && !tall.has('compact'), `${engine}: ${[...tall]}`);
  }
});

test('complexity adds detail to compact art without moving it', () => {
  for (const engine of systems) {
    let changed = 0;
    for (let i = 0; i < 12; i++) {
      const options = { seed: `system-detail/${engine}/${i}`, engine, height: 1 + i % 3 };
      const low = createDesign({ ...options, complexity: 1 }), high = createDesign({ ...options, complexity: 10 });
      assert.deepEqual(high.program.derivation, low.program.derivation, `${engine}/${i}: complexity moved the art or text`);
      changed += JSON.stringify(flatten(low, 80)) !== JSON.stringify(flatten(high, 80));
    }
    assert.ok(changed >= 9, `${engine}: complexity changed only ${changed} of 12`);
  }
});

test('version-8 networks stay in a bounded region, and a layout pin holds their text', () => {
  for (let i = 0; i < 24; i++) {
    const pinned = { seed: `network-region/${i}`, engine: 'network', height: 4 + i % 2, layoutSeed: 'L', roleSeed: 'R', motifSeed: 'M', interactionSeed: 'I' };
    const a = createDesign({ ...pinned, artSeed: 'first' }), b = createDesign({ ...pinned, artSeed: 'second' });
    assert.deepEqual(a.program.interactions.placement, b.program.interactions.placement, `network ${i}: layout pin moved the text`);
    assert.deepEqual(a.program.region, b.program.region);
    for (const width of [80, 200]) {
      const limit = Math.ceil(width * 0.62);
      for (const run of a.scene.runs.filter((run) => run.kind === 'wire')) for (const end of [run.from, run.to]) {
        assert.ok(value(end.x, width) <= limit, `network ${i}: a wire reaches ${value(end.x, width)} of ${width}`);
      }
    }
  }
});

test('compact system art stays attached to the text and within about forty cells', () => {
  for (const engine of systems) for (let i = 0; i < 48; i++) {
    const design = createDesign({ seed: `system-extent/${engine}/${i}`, engine, height: 1 + i % 3 });
    const { box } = design.program.derivation, text = design.program.derivation.roles;
    const right = Math.max(...text.map((r) => r.x + r.width));
    assert.ok(box.x + box.width <= right + 32, `${engine}/${i}: art reaches ${box.x + box.width}, text ends at ${right}`);
    assert.ok(box.width - (design.program.traits.arrangement === 'through' || design.program.traits.arrangement === 'bed' ? right : 0) <= 40, `${engine}/${i}: ${box.width} cells of art`);
    if (design.scene.rows === 1) assert.ok(design.cursor <= 50, `${engine}/${i}: cursor ${design.cursor}`);
    assert.ok(design.program.stats.occupiedCells >= 3, `${engine}/${i}: art is a speck`);
  }
});

test('long labels fit every system, and a layout pin holds the text while art rerolls', () => {
  for (const engine of systems) for (let i = 0; i < 24; i++) {
    const height = engines[engine].rows[0] + i % (engines[engine].rows[1] - engines[engine].rows[0] + 1);
    const labelled = createDesign({ seed: `system-label/${engine}/${i}`, engine, height, label: 'abcdefghijklmnopqrst' });
    // The compiler's own reservation check, at a few representative widths.
    for (const width of [80, 120, 400, 1000]) for (const span of flatten(labelled, width).flat().filter((s) => s.role)) {
      assert.equal(value(span.to, width) - value(span.from, width), span.text.length, `${engine}/${i}: label broke a live slot at ${width}`);
    }
    const pinned = (artSeed) => createDesign({ seed: `system-pin/${engine}/${i}`, engine, layoutSeed: 'held', artSeed }).program.derivation.roles;
    assert.deepEqual(pinned('first'), pinned('second'), `${engine}/${i}: layout pin moved the text`);
  }
});
