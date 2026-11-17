import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createDesign, recipe, fromRecipe, mutateDesign, LATEST } from '../src/design.js';
import { compile } from '../src/compile.js';
import { random } from '../src/random.js';
import { engines as table } from '../src/engines.js';

const engines = Object.keys(table);
const legacy = ['surface', 'prompt', 'assembly', 'network'];
const cli = fileURLToPath(new URL('../bin/promptly.js', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 20000 });
const unrelated = (design) => Object.fromEntries(['engine', 'height', 'weight', 'palette', 'colorSeed', 'colors', 'material', 'alphabet', 'symmetry', 'density', 'spread', 'fragments', 'connectivity'].map((key) => [key, design[key]]));

test('fresh default sampling reaches the full complexity range in every procedural engine', () => {
  const levels = Object.fromEntries(engines.map((engine) => [engine, new Set()]));
  const counts = Array(11).fill(0);
  let compactDetailed = false, tallSimple = false;
  for (let i = 0; i < 720; i++) {
    const design = createDesign({ seed: `full-range/${i}` });
    assert.equal(design.version, LATEST);
    assert.ok(Number.isInteger(design.complexity) && design.complexity >= 1 && design.complexity <= 10);
    levels[design.engine].add(design.complexity);
    counts[design.complexity]++;
    compactDetailed ||= design.height <= 3 && design.complexity >= 9;
    tallSimple ||= design.height >= 4 && design.complexity <= 2;
  }
  for (const engine of engines) assert.deepEqual([...levels[engine]].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], engine);
  assert.ok(compactDetailed, 'high detail can have a compact row budget');
  assert.ok(tallSimple, 'a tall row budget can have low complexity');
  assert.ok(counts.slice(1).every((count) => count > 20), 'sampling must not concentrate around the previous default');
});

test('explicit modern engines still sample complexity and footprint independently', () => {
  for (const engine of engines) {
    const levels = new Set(), heights = new Set();
    for (let i = 0; i < 96; i++) {
      const options = { seed: `explicit-range/${engine}/${i}`, engine };
      const sampled = createDesign(options);
      levels.add(sampled.complexity); heights.add(sampled.height);
      const simple = createDesign({ ...options, complexity: 1 });
      const detailed = createDesign({ ...options, complexity: 10 });
      assert.deepEqual(unrelated(simple), unrelated(sampled));
      assert.deepEqual(unrelated(detailed), unrelated(sampled));
      assert.equal(simple.complexity, 1);
      assert.equal(detailed.complexity, 10);
    }
    assert.ok(levels.has(1) && levels.has(10), `${engine}: both complexity extremes`);
    const expected = [...new Set(table[engine].footprint)].sort((a, b) => a - b);
    assert.deepEqual([...heights].sort((a, b) => a - b), expected);
  }
});

test('complexity overrides leave all other resolved choices and automatic engine selection alone', () => {
  for (let i = 0; i < 48; i++) {
    const options = { seed: `independent-detail/${i}` };
    const sampled = createDesign(options);
    for (const complexity of [1, 3, 7, 10]) {
      const fixed = createDesign({ ...options, complexity });
      assert.equal(fixed.complexity, complexity);
      assert.deepEqual(unrelated(fixed), unrelated(sampled));
    }
    const fixedEngine = createDesign({ ...options, engine: sampled.engine });
    assert.equal(fixedEngine.complexity, sampled.complexity);
    assert.deepEqual(unrelated(fixedEngine), unrelated(sampled));
  }
});

test('sampled complexity is frozen in recipes, mutation, and deterministic exported source', () => {
  for (const engine of engines) {
    const design = createDesign({ seed: `resolved-slot/${engine}`, engine });
    const saved = recipe(design);
    assert.equal(saved.complexity, design.complexity);
    assert.deepEqual(recipe(fromRecipe(saved)), saved);
    const source = compile(design);
    assert.equal(compile(fromRecipe(saved)), source);
    assert.equal(compile(createDesign({ seed: design.seed, engine })), source);
    for (const scope of ['all', 'structure', 'ornament']) assert.equal(mutateDesign(design, 'next', scope).complexity, design.complexity);
    const incomplete = { ...saved };
    delete incomplete.complexity;
    assert.throws(() => fromRecipe(incomplete), /incomplete/);
  }
});

test('retired versions fail clearly and invalid complexity is rejected', () => {
  for (const version of [1, 2, 3, 4, 5]) {
    assert.throws(() => createDesign({ version, seed: 'retired' }), /version 1–5/);
    assert.throws(() => fromRecipe({ version, style: 'compose', seed: 'retired' }), /version 1–5/);
  }
  assert.throws(() => createDesign({ style: 'signal' }), /Classic named styles were retired/);
  for (const complexity of [0, 11, -1, 1.5, 'invalid', NaN, Infinity]) assert.throws(() => createDesign({ complexity }), /Complexity/);
});

test('bare and seed-only CLI exports contain complete resolved recipes', () => {
  for (const args of [[], ['--seed', 'slot-machine-default']]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const line = result.stdout.match(/^# Recipe: (.+)$/m);
    assert.ok(line, 'source includes its recipe');
    const saved = JSON.parse(line[1]);
    assert.equal(saved.version, LATEST);
    assert.ok(engines.includes(saved.engine));
    assert.ok(Number.isInteger(saved.complexity) && saved.complexity >= 1 && saved.complexity <= 10);
    assert.ok(Number.isInteger(saved.height));
    assert.equal(typeof saved.weight, 'number');
    assert.equal(compile(fromRecipe(saved)), result.stdout);
    if (args.length) {
      assert.equal(run(...args).stdout, result.stdout);
      assert.deepEqual(JSON.parse(run('inspect', ...args).stdout), saved);
    }
  }
  const fixed = run('--seed', 'slot-machine-default', '--complexity', '7');
  assert.equal(JSON.parse(fixed.stdout.match(/^# Recipe: (.+)$/m)[1]).complexity, 7);
  const invalid = run('--complexity', '11');
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
  assert.match(invalid.stderr, /Complexity/);
});

test('version 8 keeps legacy engine choices stable and samples only mark-like alphabets', () => {
  for (let i = 0; i < 64; i++) {
    const seed = `engine-table/${i}`;
    const old = createDesign({ version: 7, seed });
    assert.equal(old.engine, random(seed, 'trait:engine').pick(legacy), 'v7 automatic engine moved');
    const fresh = createDesign({ seed });
    assert.equal(fresh.version, LATEST);
    assert.ok(Object.hasOwn(table, fresh.engine));
    assert.ok(['geometric', 'granular'].includes(fresh.alphabet), `${seed}: ${fresh.alphabet}`);
  }
  // Explicit alphabets remain available.
  assert.equal(createDesign({ seed: 'explicit', alphabet: 'technical' }).alphabet, 'technical');
});
