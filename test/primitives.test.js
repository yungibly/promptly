import test from 'node:test';
import assert from 'node:assert/strict';
import { Network, point as p, key, trace, reflect, translate, repeat } from '../src/primitives.js';
import { expression, renderExpression, materials, alphabets } from '../src/ornaments.js';
import { random } from '../src/random.js';
import { createDesign, fromRecipe, recipe, mutateDesign } from '../src/design.js';
import { Scene, anchor, left } from '../src/scene.js';
import { preview } from '../src/preview.js';
import { compile } from '../src/compile.js';

test('path transforms compose and reflect without changing connectivity', () => {
  const path = [p(0, 0), p(3, 0), p(3, 2)];
  assert.equal(trace(path).length, 6);
  assert.deepEqual(reflect(reflect(path, 10), 10), path);
  assert.deepEqual(translate(translate(path, 2, 3), -2, -3), path);
  assert.deepEqual(repeat(path, 3, 4)[2], translate(path, 8, 0));
  assert.throws(() => trace([p(0, 0), p(3, 2)]), /one axis/);
});

test('new strokes can touch explicit ports but cannot silently cross or overwrite', () => {
  const network = new Network(10, 6, [{ x: 0, right: 3, y: 0, bottom: 0 }]);
  const initial = [p(1, 3), p(8, 3)];
  network.add([initial]);
  assert.equal(network.canAdd([[p(4, 3), p(4, 1)]], [p(4, 3)]), true);
  assert.equal(network.canAdd([[p(4, 5), p(4, 1)]], []), false);
  assert.equal(network.canAdd([initial], initial), false);
  assert.equal(network.canAdd([[p(1, 3), p(1, 0)]], [p(1, 3)]), false);
  assert.equal(network.canAdd([[p(8, 3), p(12, 3)]], [p(8, 3)]), false);
  const before = [...network.edges.keys()];
  network.canAdd([[p(4, 5), p(4, 1)]], []);
  assert.deepEqual([...network.edges.keys()], before);
});

test('junctions emerge from edge masks at the real width, independently of stroke order', () => {
  for (const width of [80, 120, 200]) {
    const design = createDesign({ style: 'signal', seed: 'junction' });
    const scene = new Scene(4);
    const strokes = [
      [{ row: 1, x: anchor(250) }, { row: 1, x: anchor(750) }],
      [{ row: 0, x: anchor(500) }, { row: 2, x: anchor(500) }],
    ];
    for (const [a, b] of strokes) scene.wire(a, b, 2, materials.rounded);
    scene.text(3, left(), '>');
    const a = preview({ ...design, scene, cursor: 2 }, { width, color: false });
    assert.equal(a.split('\n')[1][Math.floor((width - 2) / 2)], '┼');
    scene.runs.reverse();
    const b = preview({ ...design, scene, cursor: 2 }, { width, color: false });
    assert.equal(a, b);
  }
});

test('recursive ornaments respect their cell budget for every alphabet', () => {
  const rng = random('ornaments');
  let recursive = 0;
  for (const alphabet of Object.keys(alphabets)) {
    for (let budget = 1; budget <= 15; budget++) {
      for (let i = 0; i < 15; i++) {
        const tree = expression(rng, alphabet, budget);
        const text = renderExpression(tree);
        assert.ok([...text].length <= budget, `${alphabet}: ${text} exceeds ${budget}`);
        assert.ok(!/[\x00-\x1f\x7f]/.test(text));
        recursive += tree.child?.child ? 1 : 0;
      }
    }
  }
  assert.ok(recursive > 20, 'must actually compose nested expression trees');
  for (const charset of Object.values(materials)) assert.equal([...charset].length, 16);
});

test('the default is a versioned, reproducible primitive program', () => {
  const design = createDesign({ seed: 'program' });
  assert.equal(design.style, 'compose');
  assert.equal(design.version, 3);
  assert.equal(design.program.engine, 'spatial-assembly/1');
  assert.equal(compile(design), compile(fromRecipe(recipe(design))));
  assert.throws(() => fromRecipe({ ...recipe(design), version: 1 }));
});

test('composition controls are validated before planning geometry', () => {
  for (const options of [{ height: 1 }, { height: 13 }, { height: 4.5 }, { density: 0 }, { density: 1 }, { material: 'constructor' }, { alphabet: '__proto__' }, { symmetry: 'sometimes' }, { ornamentSeed: '' }, { engine: 'constructor' }, { spread: -1 }, { spread: 1.1 }, { fragments: 0 }, { fragments: 1.5 }, { connectivity: -1 }, { connectivity: 'NaN' }]) {
    assert.throws(() => createDesign({ seed: 'invalid', ...options }));
  }
  assert.throws(() => createDesign({ style: 'signal', complexity: 10 }));
  assert.throws(() => createDesign({ style: 'signal', material: 'heavy' }));
  assert.throws(() => createDesign({ engine: 'network', height: 2 }));
  assert.throws(() => createDesign({ engine: 'network', spread: 0.5 }));
});

test('surface overrides and detail mutations leave topology exactly unchanged', () => {
  const original = createDesign({ seed: 'independent', complexity: 7 });
  for (const override of [{ material: 'heavy' }, { alphabet: 'punctuation' }, { palette: 'abyss' }]) {
    const design = createDesign({ seed: original.seed, complexity: 7, ...override });
    assert.deepEqual(design.program.derivation, original.program.derivation);
    assert.equal(design.height, original.height);
    assert.equal(design.symmetry, original.symmetry);
  }
  const detail = mutateDesign(original, 'new-detail', 'ornament');
  assert.deepEqual(detail.program.derivation, original.program.derivation);
  assert.notDeepEqual(detail.program.annotations, original.program.annotations);
  const structural = mutateDesign(original, 'new-structure', 'structure');
  assert.notDeepEqual(structural.program.derivation, original.program.derivation);
  assert.equal(structural.ornamentSeed, original.ornamentSeed);
  assert.equal(detail.seed, original.seed);
});

test('64 seeds grow varied, connected graphs with bounded, replayable recursive rewrites', () => {
  const signatures = new Set();
  const observed = new Set();
  let deepest = 0;
  for (let i = 0; i < 64; i++) {
    const design = createDesign({ seed: `growth/${i}`, complexity: 8, engine: 'network' });
    const { program } = design;
    assert.equal(program.stats.components, 1);
    assert.ok(program.stats.rewrites <= 35);
    assert.ok(program.stats.vertices <= 41 * 11);
    assert.ok(program.stats.cycles >= 0);
    signatures.add(JSON.stringify(program.derivation));
    const network = new Network(program.lattice.planningColumns, program.lattice.rows, program.reservations);
    for (const step of program.derivation) {
      observed.add(step.op);
      deepest = Math.max(deepest, step.depth);
      if (step.id > 0) {
        assert.ok(step.parent < step.id);
        assert.ok(network.canAdd(step.paths, step.ports), `${i}: invalid ${step.op}`);
        if (step.remove) network.remove(step.remove);
      }
      network.add(step.paths, { owner: step.id, depth: step.depth });
      assert.equal(network.components(), 1, `seed ${i}, step ${step.id} disconnected`);
    }
  }
  assert.equal(signatures.size, 64);
  assert.equal(observed.size, 7); // one initial route and all six rewrite operators
  assert.ok(deepest >= 4, `recursive descendants expected, got depth ${deepest}`);
});

test('reflection is a geometric transformation of the generated graph', () => {
  const design = createDesign({ seed: 'bilateral', symmetry: 'mirror', complexity: 8, engine: 'network' });
  const network = new Network(41, design.height - 1);
  for (const step of design.program.derivation) {
    if (step.remove) network.remove(step.remove);
    network.add(step.paths);
  }
  const reflected = new Network(41, design.height - 1);
  for (const edge of network.edges.values()) {
    reflected.add([[edge.a, edge.b], reflect([edge.a, edge.b], 20)]);
  }
  for (const node of reflected.nodes.values()) assert.ok(reflected.nodes.has(key(p(40 - node.x, node.y))));
  assert.equal(reflected.nodes.size, design.program.stats.vertices);
});

test('the most complex programs fit narrow/wide terminals and preserve ASCII parity', () => {
  for (const seed of ['maximum', 'silk', 'chamber', 'leaf']) {
    const design = createDesign({ seed, complexity: 10, density: 0.85, height: 12 });
    const ascii = createDesign({ ...recipe(design), glyphs: 'ascii' });
    for (const width of [80, 81, 120, 200]) {
      const a = preview(design, { width, color: false });
      const b = preview(ascii, { width, color: false });
      assert.equal(a.trimEnd().split('\n').length, design.scene.rows);
      assert.ok(design.scene.rows <= 12 && design.scene.rows >= 2);
      assert.ok(a.split('\n').every((line) => [...line].length < width));
      assert.deepEqual(a.split('\n').map((line) => [...line].length), b.split('\n').map((line) => line.length));
      assert.match(b, /^[\x20-\x7e\n]*$/);
    }
  }
});
