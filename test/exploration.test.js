import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesign, recipe, fromRecipe, mutateDesign } from '../src/design.js';
import { createExplorerState, explorerAction, explorerFragments } from '../src/exploration.js';
import { compile } from '../src/compile.js';

const engines = ['surface', 'prompt', 'assembly', 'network'];
const pin = (state, target, id) => explorerAction(state, { type: 'pin', target, id });
const slots = (design) => design.scene.runs.filter((run) => run.kind === 'slot').map(({ ink, ...run }) => run);

test('version-7 component seeds and full exported source round-trip across all families', () => {
  for (const engine of engines) {
    const design = createDesign({ engine, seed: `v7-roundtrip/${engine}`, complexity: 9 });
    assert.equal(design.version, 7);
    const saved = JSON.parse(JSON.stringify(recipe(design)));
    assert.deepEqual(recipe(fromRecipe(saved)), saved);
    assert.equal(compile(design), compile(fromRecipe(saved)));
    const detail = mutateDesign(design, 'detail', 'ornament');
    assert.deepEqual(detail.program.derivation, design.program.derivation);
    assert.deepEqual(detail.program.interactions, design.program.interactions);
    assert.notEqual(mutateDesign(design, 'structure', 'structure').roleSeed, design.roleSeed);
    for (const key of ['artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed', 'fragmentSeeds']) {
      const missing = { ...saved }; delete missing[key];
      assert.throws(() => fromRecipe(missing), /incomplete/);
    }
  }
});

test('shape and color pins keep the exact displayed design when rerolling', () => {
  for (const engine of engines) for (let i = 0; i < 12; i++) {
    const design = createDesign({ engine, seed: `pin-exact/${engine}/${i}`, complexity: 8 });
    let state = createExplorerState({ design });
    state = pin(pin(state, 'shape'), 'colors');
    const changed = explorerAction(state, { type: 'reroll', seed: `after/${i}` }).current;
    assert.deepEqual(changed.scene, design.scene, `${engine}/${i}`);
    assert.equal(changed.cursor, design.cursor);
    assert.equal(changed.rightPrompt, design.rightPrompt);
    assert.deepEqual(changed.colors, design.colors);
  }
});

test('layout pin holds native text reservations while unpinned artwork can change', () => {
  let changedArt = 0;
  for (const engine of engines) for (let i = 0; i < 12; i++) {
    const design = createDesign({ engine, seed: `pin-layout/${engine}/${i}`, complexity: 8 });
    const state = pin(createExplorerState({ design }), 'layout');
    const changed = explorerAction(state, { type: 'reroll', seed: `new-layout/${i}` }).current;
    assert.deepEqual(slots(changed), slots(design), `${engine}/${i}`);
    if (['assembly', 'network'].includes(engine)) changedArt += JSON.stringify(design.program.derivation) !== JSON.stringify(changed.program.derivation);
  }
  assert.ok(changedArt >= 20, 'holding roles must still permit different artwork');
});

test('one assembly fragment can be pinned while other fragment contents change and replay', () => {
  let changedNeighbors = 0;
  for (let i = 0; i < 24; i++) {
    const design = createDesign({ engine: 'assembly', seed: `pin-fragment/${i}`, height: 8, fragments: 6, complexity: 8 });
    const [part] = explorerFragments(design);
    const state = pin(createExplorerState({ design }), 'fragment', part.id);
    const next = explorerAction(state, { type: 'reroll', seed: `neighbors/${i}` });
    const before = design.program.derivation.pieces, after = next.current.program.derivation.pieces;
    assert.deepEqual(after.filter((piece) => piece.fragmentId === part.id), before.filter((piece) => piece.fragmentId === part.id));
    assert.deepEqual(after.map((piece) => piece.rect), before.map((piece) => piece.rect));
    assert.deepEqual(next.current.program.rowMap, design.program.rowMap);
    assert.deepEqual(slots(next.current), slots(design));
    changedNeighbors += JSON.stringify(after.filter((piece) => piece.fragmentId !== part.id)) !== JSON.stringify(before.filter((piece) => piece.fragmentId !== part.id));
    const restored = fromRecipe(JSON.parse(JSON.stringify(recipe(next.current))));
    assert.deepEqual(restored.scene, next.current.scene);
    assert.deepEqual(explorerAction(state, { type: 'reroll', seed: `neighbors/${i}` }).current.scene, next.current.scene);
  }
  assert.ok(changedNeighbors > 20);
});

test('favorites preserve complete pinned discoveries, load exactly, and clear pins', () => {
  let state = createExplorerState({ options: { engine: 'assembly', seed: 'favorites', height: 6, fragments: 4 } });
  state = pin(state, 'fragment', explorerFragments(state.current)[0].id);
  state = explorerAction(state, { type: 'reroll', seed: 'favorite-neighbor' });
  state = explorerAction(state, { type: 'favorite' });
  const saved = recipe(state.current);
  assert.equal(explorerAction(state, { type: 'favorite' }).favorites.length, 1);
  state = explorerAction(state, { type: 'reroll', seed: 'other-neighbor' });
  state = explorerAction(state, { type: 'load-favorite', index: 0 });
  assert.deepEqual(recipe(state.current), saved);
  assert.deepEqual(state.pins, { shape: false, layout: false, colors: false, fragments: [] });
  assert.deepEqual(createExplorerState({ favorites: JSON.parse(JSON.stringify(state.favorites)) }).favorites[0], saved);
  assert.throws(() => explorerAction(state, { type: 'load-favorite', index: -1 }), /available favorite/);
});

test('unrestricted rerolls retain every engine and complexity; color-only pin leaves that range open', () => {
  let state = pin(createExplorerState({ options: { seed: 'open-exploration' } }), 'colors');
  const colors = state.current.colors, families = new Set(), levels = new Set();
  for (let i = 0; i < 100; i++) {
    state = explorerAction(state, { type: 'reroll', seed: `explore-all/${i}` });
    families.add(state.current.engine); levels.add(state.current.complexity);
    assert.deepEqual(state.current.colors, colors);
  }
  assert.equal(families.size, 4); assert.equal(levels.size, 10);
});

test('legacy favorites remain viewable and shape-pinnable without upgrading their recipe', () => {
  for (const options of [{ version: 6, engine: 'surface' }, { style: 'signal' }]) {
    const design = createDesign({ ...options, seed: 'older-favorite' });
    const state = pin(pin(createExplorerState({ design }), 'shape'), 'colors');
    const next = explorerAction(state, { type: 'reroll', seed: 'legacy-reroll' });
    assert.deepEqual(next.current.scene, design.scene);
    assert.deepEqual(recipe(next.current), recipe(design));
    assert.throws(() => pin(state, 'layout'), /version 7/);
  }
});

test('component-seed validation rejects malformed or misplaced pin data', () => {
  const saved = recipe(createDesign({ engine: 'assembly', seed: 'invalid-parts' }));
  for (const field of ['artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed']) for (const value of ['', 12, null, 'x'.repeat(513)]) assert.throws(() => fromRecipe({ ...saved, [field]: value }), /1–512|string/);
  for (const fragmentSeeds of [[], null, { 'piece:-1': 's' }, { 'piece:24': 's' }, { 'piece:0': 2 }]) assert.throws(() => fromRecipe({ ...saved, fragmentSeeds }), /Fragment seeds/);
  assert.throws(() => fromRecipe({ ...saved, engine: 'surface', height: 2 }), /Fragment seeds/);
  for (const field of ['seed', 'complexity', 'height', 'weight', 'info', 'colorSeed', 'colorProgram']) assert.throws(() => fromRecipe({ ...saved, [field]: null }), /recipe|info/i);
  for (const version of [5, 6, 7]) {
    const missingInfo = recipe(createDesign({ version, engine: 'surface', seed: 'explicit-info', info: false, label: 'local' }));
    delete missingInfo.info;
    assert.throws(() => fromRecipe(missingInfo), /info is required/);
  }
});

test('explicit explorer color controls apply to fresh and locally pinned rerolls', () => {
  for (const options of [{ colorSeed: 'fixed-color' }, { palette: 'velvet' }]) {
    let state = createExplorerState({ options: { seed: 'first-color', engine: 'surface', ...options } });
    const before = state.current.colors;
    state = explorerAction(state, { type: 'reroll', seed: 'second-color' });
    assert.deepEqual(state.current.colors, before);
    state = pin(state, 'layout');
    state = explorerAction(state, { type: 'reroll', seed: 'third-color' });
    assert.deepEqual(state.current.colors, before);
  }
});
