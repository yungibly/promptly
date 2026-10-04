import test from 'node:test';
import assert from 'node:assert/strict';
import { composeRelationsV7, surfaceIntervals } from '../src/relations-v7.js';
import { integrateRoleBand } from '../src/interactions.js';
import { createDesign, recipe, fromRecipe, mutateDesign } from '../src/design.js';
import { flatten } from '../src/flatten.js';
import { compile } from '../src/compile.js';
import { Scene, left, right } from '../src/scene.js';
import { materials } from '../src/ornaments.js';

const config = (seed, extra = {}) => ({ seed, roleSeed: seed, motifSeed: seed, interactionSeed: seed,
  engine: 'surface', height: 2, weight: 0.85, complexity: 8, glyphs: 'unicode',
  material: 'square', alphabet: 'geometric', connectivity: 1, ...extra });
const intersects = (a, b) => a.row === b.row && a.x < b.x + b.width && b.x < a.x + a.width;
const value = (x, width = 79) => Math.floor(x.at * (width - 1) / 1000) + x.offset;

function assertFields(result) {
  for (const width of [79, 119, 199, 999]) {
    const fields = flatten(result, width).flat().filter((span) => span.role);
    assert.deepEqual(fields.map((field) => field.role).sort(), ['directory', 'username']);
    for (const field of fields) {
      assert.deepEqual(field.from, field.origin);
      assert.equal(value(field.to, width) - value(field.from, width), field.text.length);
    }
  }
}

test('v7 surfaces vary their ends independently and preserve live text through gap cutouts', () => {
  const ends = new Set();
  let cutouts = 0, layered = 0, motifs = 0;
  for (let i = 0; i < 300; i++) {
    const options = config(`v7/${i}`, { height: 1 + i % 3, weight: 0.9 });
    const result = composeRelationsV7(options), plan = result.program.derivation;
    assertFields(result);
    assert.ok(result.scene.rows <= options.height && result.cursor <= 45);
    assert.equal(new Set(result.scene.runs.map((run) => run.row)).size, result.scene.rows);
    assert.ok(plan.used.fill <= plan.budgets.fill && plan.used.edge <= plan.budgets.edge);
    const treated = plan.accepted.flatMap((proposal) => proposal.roles);
    layered += new Set(treated).size < treated.length;
    for (const proposal of plan.accepted) {
      if (proposal.ends) ends.add(`${proposal.ends.left}/${proposal.ends.right}`);
      motifs += !!proposal.motif;
      for (const cut of proposal.cutouts ?? []) {
        cutouts++;
        assert.ok(plan.roles.every((role) => !intersects(cut, role)));
        assert.ok(proposal.spans.every((span) => !intersects(cut, span)));
      }
      for (const cell of proposal.cells) assert.ok(plan.roles.every((role) => !intersects({ ...cell, width: 1 }, role)));
    }
    for (const run of result.scene.runs) assert.doesNotMatch(run.text, /[▗▖▝▘▀▄▌▐╭╮╰╯█]/);
  }
  assert.equal(ends.size, 9);
  assert.ok(cutouts > 20 && layered > 30 && motifs > 40);
  assert.deepEqual(surfaceIntervals({ row: 0, x: 2, width: 10 }, [{ row: 0, x: 5, width: 2 }]),
    [{ row: 0, x: 2, width: 3 }, { row: 0, x: 7, width: 5 }]);
});

test('v7 relation geometry remains independent of paints and can remain entirely untreated', () => {
  for (let i = 0; i < 30; i++) {
    const options = config(`independent-v7/${i}`, { height: 1 + i % 3 });
    const original = composeRelationsV7(options);
    for (const change of [{ material: 'double' }, { alphabet: 'runic' }, { glyphs: 'ascii' }, { ornamentSeed: 'different' }, { colors: Array(7).fill('#ffffff') }]) {
      const changed = composeRelationsV7({ ...options, ...change });
      assert.deepEqual(changed.program.derivation, original.program.derivation);
      assert.deepEqual(changed.program.interactions, original.program.interactions);
    }
    const bare = composeRelationsV7({ ...options, weight: 0 });
    assert.equal(bare.program.derivation.accepted.length, 0);
    assert.equal(bare.scene.runs.length, bare.program.derivation.roles.length + 1);
  }
});

function artwork() {
  const scene = new Scene(4);
  for (let row = 0; row < 3; row++) scene.wire({ row, x: left(0) }, { row, x: right(-1) }, 1, materials.square);
  scene.text(3, left(0), 'old input');
  return { scene, cursor: 10, rightPrompt: '', program: { engine: 'graph-rewrite/1', derivation: [{ op: 'untouched-route' }], stats: { components: 1 } } };
}

test('art interactions genuinely attach or occlude while retaining the underlying graph', () => {
  let attached = 0, occluded = 0, detached = 0;
  for (let i = 0; i < 90; i++) {
    const options = config(`interaction-unit/${i}`, { engine: 'network', height: 1 });
    const art = artwork(), originalWires = structuredClone(art.scene.runs.filter((run) => run.kind === 'wire'));
    const band = composeRelationsV7(options);
    const result = integrateRoleBand(art, band, options);
    assertFields(result);
    assert.deepEqual(result.program.derivation, [{ op: 'untouched-route' }]);
    assert.equal(result.program.stats.components, 1);
    for (const wire of originalWires) assert.ok(result.scene.runs.some((run) => JSON.stringify(run) === JSON.stringify(wire)));
    attached += result.program.interactions.attachments.length > 0;
    occluded += result.program.interactions.occluded.length > 0;
    detached += result.program.interactions.mode === 'detached';
    for (const attachment of result.program.interactions.attachments) {
      assert.equal(attachment.path.length, 2);
      assert.notDeepEqual(attachment.paintFrom, attachment.path[0], 'artwork source cell remains unchanged');
    }
  }
  assert.ok(attached > 5 && occluded > 30 && detached > 15);
});

test('pinned role placement is independent of regenerated art, motif extent, and finish', () => {
  for (let i = 0; i < 45; i++) {
    const options = config(`pinned-band/${i}`, { engine: 'network', height: 1 });
    const original = integrateRoleBand(artwork(), composeRelationsV7(options), options);
    const changedOptions = { ...options, seed: 'new-root', motifSeed: 'another motif' };
    const otherArt = artwork();
    otherArt.scene.runs = otherArt.scene.runs.filter((run) => run.kind !== 'wire' || run.from.row === 0);
    const changed = integrateRoleBand(otherArt, composeRelationsV7(changedOptions), changedOptions);
    assert.deepEqual(changed.program.interactions.placement, original.program.interactions.placement);
    assert.deepEqual(changed.program.interactions.masks, original.program.interactions.masks);
    assert.deepEqual(changed.program.identity.derivation.roles, original.program.identity.derivation.roles);
    assert.deepEqual(changed.program.identity.paint.map((part) => [part.ink, part.background]), original.program.identity.paint.map((part) => [part.ink, part.background]));
  }
});

test('v7 generated families preserve fields, exact recipes, and structural metadata under ornament mutation', () => {
  const modes = new Set();
  for (const engine of ['surface', 'prompt', 'assembly', 'network']) for (let i = 0; i < 24; i++) {
    const design = createDesign({ version: 7, seed: `integration-v7/${i}`, engine, height: engine === 'network' ? 6 : engine === 'assembly' ? 5 : 3, complexity: 8, weight: 0.85 });
    assertFields(design);
    assert.equal(design.version, 7);
    modes.add(design.program.interactions.mode);
    const changed = mutateDesign(design, 'ornament-only', 'ornament');
    assert.deepEqual(changed.program.derivation, design.program.derivation);
    assert.deepEqual(changed.program.interactions, design.program.interactions);
    if (i === 0) assert.equal(compile(fromRecipe(recipe(design))), compile(design));
  }
  for (const mode of ['roles', 'detached', 'attach', 'occlude']) assert.ok(modes.has(mode));
});

test('assembly attachments stay in fragment gaps and obey the disconnected control', () => {
  const options = { version: 7, seed: 'art-v7/343', engine: 'assembly', height: 5, complexity: 8, weight: 0.8, connectivity: 1 };
  const design = createDesign(options);
  assert.ok(design.program.interactions.attachments.length);
  assert.equal(createDesign({ ...options, connectivity: 0 }).program.interactions.attachments.length, 0);
  for (const attachment of design.program.interactions.attachments) for (const width of [79, 119, 199, 999]) {
    const a = value(attachment.paintFrom.x, width), b = value(attachment.path[1].x, width);
    const lo = Math.min(a, b), hi = Math.max(a, b) + 1;
    for (const piece of design.program.derivation.pieces) {
      const rect = piece.rect;
      if (!Array.from({ length: rect.height }, (_, row) => design.program.rowMap[rect.y + row]).includes(attachment.paintFrom.row)) continue;
      const at = Math.round((rect.x + (rect.width - 1) / 2) * 1000 / 78);
      const start = Math.floor(at * (width - 1) / 1000) + rect.x - Math.floor(at * 78 / 1000);
      assert.ok(hi <= start || lo >= start + rect.width, 'attachment cannot paint a neighbor’s reserved rectangle');
    }
  }
});
