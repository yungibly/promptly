import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesign as createCurrentDesign, fromRecipe, recipe, mutateDesign } from '../src/design.js';
import { compile } from '../src/compile.js';
import { preview } from '../src/preview.js';
import { layer, surface, glyph, cut, repeat, translate, reflect, contour, rasterizeSurface } from '../src/surface.js';

// These assertions freeze the original version-5 algebra and sampler.
const createDesign = (options) => createCurrentDesign({ version: 5, info: true, ...options });

test('surface algebra composes holes, layers, translated repetitions, and glyphs', () => {
  const tile = cut(surface(0, 0, 4, 2), 1, 0, 2);
  const tree = layer(repeat(translate(tile, 2, 1), 3, 6), glyph(3, 2, 'x', 'accent'));
  const cells = rasterizeSurface(tree);
  assert.equal(cells.size, 18);
  assert.ok(!cells.has('3,1'));
  assert.ok(!cells.has('10,1'));
  assert.equal(cells.get('3,2').text, 'x');
  assert.deepEqual(cells.get('14,1'), { x: 14, y: 1, text: ' ', tone: 'body', fill: true });
  assert.ok([...cells].every(([key, cell]) => key === `${cell.x},${cell.y}`));
  const reflected = rasterizeSurface(reflect(layer(glyph(1, 0, '╭'), surface(2, 1, 2, 1)), 4));
  assert.equal(reflected.get('7,0').text, '╮');
  assert.ok(reflected.has('6,1') && reflected.has('5,1'));
});

test('surface sampling combines role relationships and real occupied shapes', () => {
  const profiles = new Set(), treatments = new Set(), relations = new Set(), silhouettes = new Set();
  let filled = 0, plain = 0, boxed = 0, multiColor = 0;
  for (let i = 0; i < 144; i++) {
    const design = createDesign({ engine: 'surface', seed: `surface-vocabulary/${i}`, height: 1 + i % 3, complexity: 9 });
    const { roles, relations: edges, geometry } = design.program.derivation;
    for (const role of roles) {
      profiles.add(role.profile);
      filled += role.filled;
      plain += !role.filled;
      boxed += role.caps.length === 2;
      for (const cap of role.caps) treatments.add(cap.treatment);
    }
    for (const edge of edges) relations.add(edge.op);
    silhouettes.add(JSON.stringify([...rasterizeSurface(geometry).values()].map(({ x, y, text, fill }) => [x, y, text, fill])));
    multiColor += new Set(design.scene.runs.map((run) => run.ink?.bg).filter((bg) => bg !== undefined)).size > 1;
  }
  assert.equal(profiles.size, 7);
  assert.equal(treatments.size, 5);
  for (const relation of ['after', 'below', 'offset', 'align']) assert.ok(relations.has(relation));
  assert.ok(silhouettes.size > 130, `${silhouettes.size} occupied shapes`);
  assert.ok(filled > 120 && plain > 30 && boxed > 0 && multiColor > 50);
});

test('curved block contours have full-size shoulders, protected fields, and distinct silhouettes', () => {
  const capsule = rasterizeSurface(contour(0, 0, 12, 3, 'capsule'));
  assert.equal(capsule.get('0,0').text, '▗');
  assert.equal(capsule.get('11,0').text, '▖');
  assert.equal(capsule.get('0,1').text, '▐');
  assert.equal(capsule.get('11,1').text, '▌');
  assert.equal(capsule.get('0,2').text, '▝');
  assert.equal(capsule.get('11,2').text, '▘');
  assert.ok(Array.from({ length: 10 }, (_, i) => capsule.get(`${i + 1},1`)).every((cell) => cell.fill));
  const rounded = rasterizeSurface(contour(0, 0, 12, 3, 'roundbox', 'body', false));
  assert.equal(rounded.get('0,0').text, '╭');
  assert.equal(rounded.get('11,2').text, '╯');
  const signatures = new Set(['capsule', 'roundbox', 'bevel', 'step', 'tab', 'arch'].map((profile) => JSON.stringify([...rasterizeSurface(contour(0, 0, 12, 3, profile)).values()])));
  assert.equal(signatures.size, 6);
  const sampled = new Set();
  for (let i = 0; i < 120; i++) {
    const design = createDesign({ engine: 'surface', seed: `curves/${i}`, height: 3, complexity: 8 });
    for (const role of design.program.derivation.roles) if (role.contour) {
      sampled.add(role.contour);
      assert.equal(role.row, 1);
      assert.ok(role.fieldX > role.x && role.fieldX + role.capacity < role.x + role.width);
    }
    assert.ok(design.cursor <= 39);
  }
  assert.equal(sampled.size, 6);
});

test('surface field reservations and command space survive bounded composition', () => {
  for (let i = 0; i < 120; i++) {
    const design = createDesign({ engine: 'surface', seed: `surface-bounds/${i}`, height: 1 + i % 3, complexity: 10, label: i % 2 ? 'twenty-character-tag' : '' });
    assert.ok(design.cursor <= 39, `${design.seed}: ${design.cursor}`);
    const slots = design.scene.runs.filter((run) => run.kind === 'slot');
    assert.deepEqual(slots.map((run) => run.role).sort(), ['directory', 'username']);
    for (const slot of slots) {
      assert.ok(slot.x.offset >= 0 && slot.x.offset + slot.width <= 57);
      assert.ok(slot.row >= 0 && slot.row < design.height);
      const index = design.scene.runs.indexOf(slot);
      for (const run of design.scene.runs.slice(index + 1)) {
        if (run.row !== slot.row) continue;
        const end = run.x.offset + [...run.text].length;
        assert.ok(end <= slot.x.offset || run.x.offset >= slot.x.offset + slot.width, `${design.seed}: later paint crosses ${slot.role}`);
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    const design = createDesign({ engine: 'surface', seed: `small/${i}`, height: 3, complexity: 10, info: false, label: 'x', fragments: 12 });
    const role = design.program.derivation.roles[0];
    for (const cell of rasterizeSurface(design.program.derivation.geometry).values()) {
      assert.ok(cell.x >= role.x && cell.x < role.x + role.width);
      assert.ok(cell.y >= 0 && cell.y < design.height);
    }
  }
});

test('surface recipes and material/detail choices preserve the structural derivation', () => {
  const design = createDesign({ engine: 'surface', seed: 'layered-information', height: 3, complexity: 9 });
  assert.equal(design.version, 5);
  assert.equal(compile(design), compile(fromRecipe(recipe(design))));
  for (const change of [{ palette: 'ember' }, { material: 'heavy' }, { alphabet: 'runic' }, { glyphs: 'ascii' }, { glyphs: 'powerline' }]) {
    assert.deepEqual(createDesign({ ...recipe(design), ...change }).program.derivation, design.program.derivation);
  }
  const detail = mutateDesign(design, 'secondary', 'ornament');
  assert.deepEqual(detail.program.derivation, design.program.derivation);
  assert.notDeepEqual(detail.program.annotations, design.program.annotations);
  const offline = createDesign({ engine: 'surface', seed: 'static', info: false, label: 'local', height: 2 });
  assert.ok(offline.scene.runs.every((run) => run.kind !== 'slot'));
  assert.ok(preview(offline, { color: false }).includes('local'));
});

test('optional Powerline half-circle edges change glyph material without changing geometry', () => {
  const normal = createDesign({ engine: 'surface', seed: 'round-caps/0', height: 1, complexity: 6 });
  const powerline = createDesign({ ...recipe(normal), glyphs: 'powerline' });
  assert.deepEqual(powerline.program.derivation, normal.program.derivation);
  assert.ok(normal.program.derivation.roles.some((role) => role.profile === 'round' && role.filled));
  assert.ok(powerline.scene.runs.some((run) => run.text.includes('\ue0b6')));
  assert.ok(powerline.scene.runs.some((run) => run.text.includes('\ue0b4')));
  assert.equal(powerline.cursor, normal.cursor);
  assert.equal(compile(powerline), compile(fromRecipe(recipe(powerline))));
});

test('dark tinted surfaces keep independent colored text, matching endcaps, and controlled accents', () => {
  const design = createDesign({ engine: 'surface', seed: 'colored-caps/311', height: 2, complexity: 3, glyphs: 'powerline' });
  assert.equal(design.program.traits.finish, 'tinted');
  assert.ok(design.program.derivation.roles.every((role) => role.profile === 'round' && role.filled));
  const fields = design.scene.runs.filter((run) => run.kind === 'slot');
  assert.deepEqual(fields.map((run) => run.ink), [{ fg: 2, bg: 0 }, { fg: 3, bg: 0 }]);
  const caps = design.scene.runs.filter((run) => /[\ue0b6\ue0b4]/.test(run.text));
  assert.equal(caps.length, 4);
  assert.ok(caps.every((run) => run.ink === 0), 'filled endcaps match the dark block background');
  assert.equal(design.scene.runs.at(-1).ink, 4);
  const finishes = { solid: 0, tinted: 0 };
  for (let i = 0; i < 100; i++) {
    const sample = createDesign({ engine: 'surface', seed: `finish/${i}`, height: 2 });
    finishes[sample.program.traits.finish]++;
  }
  assert.ok(finishes.solid > 30 && finishes.tinted > 30);
});

test('fragment targets and local reflection alter structure within existing role bounds', () => {
  let extra = 0;
  for (let i = 0; i < 30; i++) {
    const options = { engine: 'surface', seed: `local-controls/${i}`, height: 3, complexity: 7, symmetry: 'none' };
    const single = createDesign({ ...options, fragments: 1 });
    const several = createDesign({ ...options, fragments: 8 });
    extra += several.program.derivation.roles.reduce((sum, role) => sum + role.satellites.reduce((n, group) => n + group.count, 0), 0);
    assert.equal(single.cursor, several.cursor);
    assert.deepEqual(single.program.derivation.roles.map(({ x, row, width }) => [x, row, width]), several.program.derivation.roles.map(({ x, row, width }) => [x, row, width]));
    const mirrored = createDesign({ ...options, fragments: 8, symmetry: 'mirror' });
    assert.ok(mirrored.program.stats.operations.reflect >= 2);
    for (const [index, tree] of mirrored.program.derivation.geometry.children.entries()) {
      const role = mirrored.program.derivation.roles[index];
      const cells = rasterizeSurface(tree);
      for (const cell of cells.values()) assert.ok(cells.has(`${role.x * 2 + role.width - 1 - cell.x},${cell.y}`), 'local silhouette is symmetric');
    }
  }
  assert.ok(extra > 100);
});

test('surface exports retain filled whitespace and compatible ASCII dimensions', () => {
  for (const seed of ['surface/0', 'surface/2', 'surface/5', 'vocabulary/26']) {
    const design = createDesign({ engine: 'surface', seed, height: 3, complexity: 8 });
    const safe = createDesign({ ...recipe(design), glyphs: 'ascii' });
    const unicode = preview(design, { width: 100, color: false });
    const ascii = preview(safe, { width: 100, color: false });
    assert.match(ascii, /^[\x20-\x7e\n]*$/);
    assert.deepEqual(unicode.split('\n').map((line) => [...line].length), ascii.split('\n').map((line) => line.length));
    if (design.program.stats.filledCells) assert.match(preview(design, { width: 100 }), /\x1b\[48;2;/);
  }
});
