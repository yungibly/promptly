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
      assert.equal(roles.length, design.info === false ? 0 : 2, `${engine}/${i}: live roles missing at ${width}`);
      for (const role of roles) for (const x of [role.from - 1, role.to]) {
        const cell = rows[role.row][x];
        // Neighbors are bare space or other text, never generated art.
        assert.ok(!cell || cell.role || /^[ \w./~-]$/.test(cell.ch) && !(typeof cell.ink === 'object' && cell.ink.bg), `${engine}/${i}: art touches a live field at ${width}`);
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

test('each system reaches its forms, compact and tall footprints, and both text relations', () => {
  for (const engine of systems) {
    const forms = new Set(), heights = new Set();
    for (let i = 0; i < 64; i++) {
      const design = createDesign({ seed: `system-reach/${engine}/${i}`, engine });
      const { traits, derivation } = design.program;
      forms.add(traits.form ?? traits.kind ?? traits.flow);
      heights.add(design.scene.rows);
      if (derivation.roles) forms.add(derivation.roles.some((r) => r.row === design.scene.rows - 1) ? 'text:input-row' : 'text:inside');
    }
    assert.ok(forms.size >= 4, `${engine}: ${[...forms]}`);
    assert.ok([...heights].some((h) => h <= 3) && [...heights].some((h) => h >= 6), `${engine}: ${[...heights]}`);
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
