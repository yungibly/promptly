import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createDesign, recipe, fromRecipe } from '../src/design.js';
import { deriveMotif } from '../src/motifs.js';
import { compile } from '../src/compile.js';
import { preview } from '../src/preview.js';

test('network motif echoes reuse the shared seed inside optional fixed annotation slots', () => {
  let motifs = 0, expressions = 0, evolving = 0;
  const roles = new Set();
  for (let i = 0; i < 96; i++) {
    const design = createDesign({ engine: 'network', version: 7, seed: `network-echo/${i}`, height: 8, complexity: 8 });
    assert.deepEqual(design.program.motif, deriveMotif(design.motifSeed));
    for (const [index, annotation] of design.program.annotations.entries()) {
      const slot = design.program.annotationPlan[index];
      assert.equal(annotation.width, slot.width);
      assert.equal(annotation.x, slot.x); assert.equal(annotation.y, slot.y);
      if (!annotation.motif) { expressions++; continue; }
      motifs++; roles.add(annotation.role);
      const { evolution } = annotation.motif;
      const padding = slot.role === 'inline' ? 2 : 0;
      assert.equal(evolution.width, slot.width - padding);
      assert.equal(evolution.height, 1);
      assert.ok(evolution.span <= slot.width - padding);
      evolving += evolution.step > 0 && evolution.span < evolution.width;
    }
  }
  assert.ok(motifs > 100 && expressions > motifs, 'motifs supplement ordinary expressions rather than replacing every ornament');
  assert.ok(evolving > 50);
  for (const role of ['terminal', 'inline', 'free']) assert.ok(roles.has(role), role);
});

test('network graph and annotation reservations are independent of motif, material, alphabet, and detail paint', () => {
  let changedPaint = 0;
  for (let i = 0; i < 32; i++) {
    const design = createDesign({ engine: 'network', version: 7, seed: `network-independent/${i}`, height: 6, complexity: 9 });
    const saved = recipe(design);
    assert.equal(design.program.stats.components, 1);
    for (const override of [{ material: 'heavy' }, { alphabet: 'runic' }, { ornamentSeed: `detail/${i}` }, { motifSeed: `motif/${i}` }]) {
      const other = createDesign({ ...saved, ...override });
      assert.deepEqual(other.program.derivation, design.program.derivation);
      assert.deepEqual(other.program.reservations, design.program.reservations);
      assert.deepEqual(other.program.annotationPlan, design.program.annotationPlan);
      assert.deepEqual(other.program.stats, design.program.stats);
      changedPaint += JSON.stringify(other.program.annotations) !== JSON.stringify(design.program.annotations);
    }
    const { artSeed, layoutSeed, roleSeed, motifSeed, interactionSeed, fragmentSeeds, ...older } = saved;
    const legacy = createDesign({ ...older, version: 6 });
    assert.deepEqual(legacy.program.derivation, design.program.derivation, 'the new motif stage cannot consume the graph RNG');
    assert.deepEqual(legacy.program.reservations, design.program.reservations);
  }
  assert.ok(changedPaint > 80);
});

test('network motif annotations remain sourceable, responsive, and exactly replayable', () => {
  for (let i = 0; i < 6; i++) {
    const design = createDesign({ engine: 'network', seed: `echo-render/${i}`, height: 4 + i, complexity: 10, glyphs: i % 2 ? 'ascii' : 'unicode' });
    assert.equal(compile(fromRecipe(JSON.parse(JSON.stringify(recipe(design))))), compile(design));
    for (const width of [80, 120, 240]) {
      const text = preview(design, { width, color: false });
      const lines = text.trimEnd().split('\n');
      assert.equal(lines.length, design.scene.rows);
      assert.ok(lines.every((line) => [...line].length < width));
      assert.doesNotMatch(text, /[\x00-\x09\x0b-\x1f\x7f]/);
      if (design.glyphs === 'ascii') assert.match(text, /^[\x20-\x7e\n]*$/);
    }
  }
});

test('version-6 network source and composition hashes remain frozen', () => {
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  const fixtures = JSON.parse(readFileSync(new URL('./fixtures/v6-baseline.json', import.meta.url)));
  for (const fixture of fixtures.filter(({ recipe }) => recipe.engine === 'network')) {
    const design = fromRecipe(fixture.recipe);
    assert.equal(design.program.annotationPlan, undefined);
    assert.equal(hash(compile(design)), fixture.source);
    const { scene, cursor, rightPrompt, program } = design;
    assert.equal(hash(JSON.stringify({ scene, cursor, rightPrompt, program })), fixture.composition);
  }
});
