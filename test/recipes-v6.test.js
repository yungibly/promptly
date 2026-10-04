import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDesign as generateDesign, fromRecipe, mutateDesign, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';
import { generateColors } from '../src/chromatic.js';
import { palettes } from '../src/palettes.js';

const cli = fileURLToPath(new URL('../bin/promptly.js', import.meta.url));
const engines = ['surface', 'prompt', 'assembly', 'network'];
const createDesign = (options) => generateDesign({ version: 6, ...options });
const composition = ({ scene, cursor, rightPrompt, program }) => ({ scene, cursor, rightPrompt, program });
const colorState = ({ colors, colorSeed, colorProgram }) => ({ colors, colorSeed, colorProgram });
const withoutColor = ({ colors, colorSeed, colorProgram, ...rest }) => rest;
const saved = (name) => JSON.parse(readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8'));
const inspect = (...args) => {
  const result = spawnSync(process.execPath, [cli, 'inspect', ...args], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
};

test('version-6 procedural engines round-trip exact exports', () => {
  for (const engine of engines) {
    const design = createDesign({ engine, seed: `v6-roundtrip/${engine}`, complexity: 7, height: engine === 'network' ? 4 : 3 });
    assert.equal(design.version, 6);
    assert.equal(design.palette, 'generated');
    assert.equal(design.colorSeed, design.seed);
    const value = JSON.parse(JSON.stringify(recipe(design)));
    assert.equal(value.engine, engine);
    assert.ok(value.weight >= 0 && value.weight <= 1);
    assert.equal(value.colors.length, 7);
    const restored = fromRecipe(value);
    assert.deepEqual(recipe(restored), value);
    assert.deepEqual(composition(restored), composition(design));
    assert.deepEqual(colorState(restored), colorState(design));
    assert.equal(compile(restored), compile(design));
  }
});

test('every mutation scope preserves the exact resolved color program for every version-6 engine', () => {
  for (const engine of engines) {
    const design = createDesign({ engine, seed: `v6-mutation/${engine}`, colorSeed: 'independent-colors', complexity: 6 });
    for (const scope of ['all', 'structure', 'ornament']) {
      const changed = mutateDesign(design, 'next', scope);
      assert.equal(changed.version, 6);
      assert.equal(changed.engine, engine);
      assert.deepEqual(colorState(changed), colorState(design), `${engine}: ${scope}`);
      assert.deepEqual(colorState(fromRecipe(JSON.parse(JSON.stringify(recipe(changed))))), colorState(design));
      if (scope === 'ornament') assert.deepEqual(changed.program.derivation, design.program.derivation);
    }
  }
});

test('CLI color seed replaces stored color values without resampling the saved composition', () => {
  const directory = mkdtempSync(join(tmpdir(), 'promptly-v6-recipe-'));
  try {
    const path = join(directory, 'design.json');
    const design = createDesign({ engine: 'surface', seed: 'v6-cli-colors', colorSeed: 'before', height: 3, complexity: 8, weight: 0.85 });
    const value = recipe(design);
    // Saved colors are authoritative, including resolved values different from
    // what the current generator would produce for the stored seed.
    value.colors = [...value.colors];
    value.colors[0] = '#987654';
    value.colorProgram = structuredClone(value.colorProgram);
    value.colorProgram.roles[0].hex = value.colors[0];
    writeFileSync(path, JSON.stringify(value));
    assert.deepEqual(inspect('--from', path), value);
    assert.deepEqual(colorState(fromRecipe(value)), colorState(value));
    const changed = inspect('--from', path, '--color-seed', 'after');
    assert.deepEqual(withoutColor(changed), withoutColor(value));
    assert.equal(changed.colorSeed, 'after');
    assert.deepEqual(changed.colors, generateColors('after').colors);
    assert.deepEqual(changed.colorProgram, generateColors('after').colorProgram);
    assert.notDeepEqual(changed.colors, value.colors);
    assert.deepEqual(composition(fromRecipe(changed)), composition(fromRecipe(value)));

    const named = inspect('--from', path, '--palette', 'paper');
    const namedDesign = fromRecipe(named);
    assert.equal(named.palette, 'paper');
    assert.deepEqual(namedDesign.colors, palettes.paper.colors);
    for (const key of ['colors', 'colorSeed', 'colorProgram']) assert.ok(!Object.hasOwn(named, key));
    assert.deepEqual(namedDesign.program.derivation, design.program.derivation);
    writeFileSync(path, JSON.stringify(named));
    const regenerated = inspect('--from', path, '--color-seed', 'back-to-generated');
    assert.equal(regenerated.palette, 'generated');
    assert.deepEqual(regenerated.colors, generateColors('back-to-generated').colors);
    assert.deepEqual(fromRecipe(regenerated).program.derivation, design.program.derivation);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('explicit named palettes discard previously resolved generated color state', () => {
  const value = recipe(createDesign({ engine: 'prompt', seed: 'palette-override', height: 2 }));
  const named = createDesign({ ...value, palette: 'velvet' });
  assert.deepEqual(named.colors, palettes.velvet.colors);
  assert.equal(named.colorSeed, undefined);
  assert.equal(named.colorProgram, undefined);
  assert.deepEqual(named.program.derivation, fromRecipe(value).program.derivation);
  assert.equal(compile(named), compile(fromRecipe(JSON.parse(JSON.stringify(recipe(named))))));
});

test('version-6 recipes reject malformed colors, invalid budgets, seeds, and unresolved fields', () => {
  const value = recipe(createDesign({ engine: 'surface', seed: 'v6-validation' }));
  for (const invalid of ['#12345', '#ggffff', 'red', '#123456\n', '%F{red}', null, 12]) {
    const colors = [...value.colors]; colors[2] = invalid;
    assert.throws(() => fromRecipe({ ...value, colors }), /seven six-digit hex colors/);
  }
  for (const colors of [null, '#ffffff', [], value.colors.slice(1), [...value.colors, '#abcdef']]) {
    assert.throws(() => fromRecipe({ ...value, colors }), /seven six-digit hex colors/);
  }
  for (const weight of [-0.001, 1.001, Infinity, NaN, 'invalid']) assert.throws(() => fromRecipe({ ...value, weight }), /Weight/);
  for (const seed of ['', 'x'.repeat(257)]) {
    assert.throws(() => fromRecipe({ ...value, seed }), /Seed/);
    assert.throws(() => fromRecipe({ ...value, colorSeed: seed }), /Color seed/);
  }
  for (const key of ['weight', 'colors', 'colorSeed', 'colorProgram']) {
    const incomplete = { ...value }; delete incomplete[key];
    assert.throws(() => fromRecipe(incomplete), /incomplete/);
  }
  assert.throws(() => fromRecipe({ ...value, engine: 'auto' }), /resolved composition engine/);
});

test('saved version-4 and version-5 specimens retain frozen scenes and derivations', () => {
  const hashes = {
    compose: 'd08351b3eb2c2f45c077ce0e039e65aecd872acd40ecc94d1b4e24b6a5e60b97',
    surface: '6da05bb578b072de60f6c452c5acddd76290bf72a36fe8690655e60f4d9cb670',
    'surface-capsule': '8a63c6f5bdf5a1727be54ac1a7a455aedc0ea831ad30712c5ff5cf82ebb643d7',
    'surface-curves': 'df1dbf1103b81d92159bdc6da83875775886ffb574fdb16761cba6c62fe2e4e0',
  };
  for (const [name, expected] of Object.entries(hashes)) {
    const value = saved(name), design = fromRecipe(value);
    assert.equal(design.version, name === 'compose' ? 4 : 5);
    assert.deepEqual(recipe(design), value);
    assert.equal(createHash('sha256').update(JSON.stringify(composition(design))).digest('hex'), expected, name);
  }
});
