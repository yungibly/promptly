import test from 'node:test';
import assert from 'node:assert/strict';
import { composeRelations, planRoleBand } from '../src/relations.js';
import { createDesign, recipe, fromRecipe, mutateDesign } from '../src/design.js';
import { compile } from '../src/compile.js';
import { preview } from '../src/preview.js';

const config = (seed, extra = {}) => ({ seed, height: 2, engine: 'surface', weight: 0.5, complexity: 6, glyphs: 'unicode', material: 'square', alphabet: 'geometric', ...extra });
const position = (r, width = 79) => Math.floor((r.at ?? 0) * (width - 1) / 1000) + r.x - Math.floor((r.at ?? 0) * 78 / 1000);
const overlap = (a, b, width = 79) => a.row === b.row && position(a, width) < position(b, width) + b.width && position(b, width) < position(a, width) + a.width;

test('role plans preserve full fields, width-relative gaps, labels, and command reservations', () => {
  let rightAnchors = 0;
  for (let i = 0; i < 360; i++) {
    const options = config(`plan/${i}`, { height: 1 + i % 3, label: i % 2 ? 'twenty-character-tag' : '' });
    const plan = planRoleBand(options);
    assert.ok(plan.rows >= 1 && plan.rows <= options.height);
    assert.equal(Math.min(...plan.roles.map((role) => role.row)), 0);
    assert.ok(plan.marker.x + 2 <= 45);
    assert.deepEqual(plan.roles.filter((r) => r.role !== 'label').map((r) => r.role).sort(), ['directory', 'username']);
    if (options.label) assert.equal(plan.roles.find((r) => r.role === 'label').width, 20);
    rightAnchors += plan.roles.some((r) => r.at === 1000);
    for (const width of [79, 119, 199]) for (const [index, role] of plan.roles.entries()) {
      assert.ok(position(role, width) >= 0 && position(role, width) + role.width <= width);
      assert.ok(role.row < options.height);
      for (const other of plan.roles.slice(index + 1)) assert.ok(!overlap(role, other, width));
      if (role.row === plan.marker.row) assert.ok(position(role, width) + role.width < plan.marker.x);
    }
  }
  assert.ok(rightAnchors > 20, 'right-hand roles retain genuine affine positions');
});

test('zero visual weight produces bare information and complexity does not change role layout', () => {
  for (let i = 0; i < 40; i++) {
    const options = config(`quiet/${i}`, { height: 1 + i % 3, weight: 0 });
    const quiet = composeRelations(options);
    assert.equal(quiet.program.stats.filledCells, 0);
    assert.equal(quiet.program.stats.edgeCells, 0);
    assert.equal(quiet.program.derivation.accepted.length, 0);
    assert.equal(quiet.scene.runs.length, quiet.program.derivation.roles.length + 1);
    const simple = composeRelations({ ...options, complexity: 1, weight: 0.8 });
    const detailed = composeRelations({ ...options, complexity: 10, weight: 0.8 });
    assert.deepEqual(simple.program.derivation.roles, detailed.program.derivation.roles);
    assert.deepEqual(simple.program.derivation.marker, detailed.program.derivation.marker);
    assert.deepEqual(simple.program.derivation.budgets, detailed.program.derivation.budgets);
  }
});

test('accepted atomic proposals respect global weight and never build tall painted contours', () => {
  const reasons = new Set();
  let nestedRules = 0;
  for (let i = 0; i < 240; i++) {
    const result = composeRelations(config(`proposals/${i}`, { height: 1 + i % 3, weight: (i % 11) / 10, complexity: 10 }));
    const plan = result.program.derivation;
    assert.ok(plan.used.fill <= plan.budgets.fill);
    assert.ok(plan.used.edge <= plan.budgets.edge);
    assert.ok(plan.used.treatments <= plan.budgets.treatments);
    for (const proposal of plan.proposals) {
      if (!proposal.accepted) { reasons.add(proposal.reason); continue; }
      nestedRules += proposal.expression?.op === 'repeat';
      if (proposal.bounds) {
        assert.ok(proposal.roles.every((id) => plan.roles[id].row === proposal.bounds.row));
        assert.ok(proposal.roles.every((id) => {
          const role = plan.roles[id];
          return role.x >= proposal.bounds.x && role.x + role.width <= proposal.bounds.x + proposal.bounds.width;
        }));
      }
      for (const mark of proposal.cells) {
        assert.ok(!plan.roles.some((role) => overlap({ ...mark, width: 1 }, role)));
        assert.ok(mark.row >= 0 && mark.row < plan.rows);
      }
    }
    for (const run of result.scene.runs) assert.doesNotMatch(run.text, /[▗▖▝▘▀▄▌▐╭╮╰╯█]/);
    const fills = result.scene.runs.filter((run) => typeof run.ink === 'object' && run.kind !== 'slot');
    assert.ok(fills.every((run) => plan.roles.some((role) => result.program.rowMap[role.row] === run.row)), 'fills stay on meaningful text baselines');
    assert.equal(new Set(result.scene.runs.map((run) => run.row)).size, result.scene.rows, 'unused rows are compacted');
  }
  for (const reason of ['visual-weight-budget', 'text-reservation', 'outside-reserved-art', 'role-already-treated']) assert.ok(reasons.has(reason));
  assert.ok(nestedRules > 0);
});

test('normalized batches vary relationships rather than counting every changed cell as novel', () => {
  const signatures = new Set(), kinds = new Set();
  let shared = 0, separatedRows = 0, distant = 0, bare = 0;
  for (let i = 0; i < 240; i++) {
    const result = composeRelations(config(`normalized/${i}`, { height: 1 + i % 3, complexity: 7, weight: 0.9 }));
    const plan = result.program.derivation;
    // Discard colors, glyph choices, exact capacities, and small x differences.
    signatures.add(JSON.stringify({
      input: [plan.marker.row, Math.floor(plan.marker.x / 8)], rows: result.scene.rows,
      roles: plan.roles.map((r) => [r.role, r.row, r.at, Math.floor(r.x / 8)]),
      treatments: plan.accepted.map((p) => [p.op, p.roles.length, p.cells.some((c) => c.row !== plan.roles[p.roles[0]].row)]),
    }));
    plan.accepted.forEach((p) => kinds.add(p.op));
    shared += plan.accepted.some((p) => p.roles.length > 1);
    separatedRows += new Set(plan.roles.map((r) => r.row)).size > 1;
    distant += plan.roles.some((r) => r.at);
    bare += plan.accepted.length === 0;
  }
  assert.ok(signatures.size > 80, `${signatures.size} normalized relational compositions`);
  assert.deepEqual([...kinds].sort(), ['bracket', 'edge', 'join', 'rail', 'rule', 'surface']);
  assert.ok(shared > 60 && separatedRows > 20 && distant > 15 && bare > 5);
});

test('group count, links, detail, and line material controls retain their distinct jobs', () => {
  let joins = 0, differentPaint = 0, repeated = 0;
  for (let i = 0; i < 60; i++) {
    const options = config(`controls/${i}`, { height: 3, complexity: 10, weight: 0.8, connectivity: 1 });
    const single = composeRelations({ ...options, fragments: 1 });
    const many = composeRelations({ ...options, fragments: 8 });
    assert.equal(single.program.derivation.targets.length, 1);
    assert.ok(many.program.derivation.targets.length <= many.program.derivation.roles.length);
    const disconnected = composeRelations({ ...options, connectivity: 0 });
    assert.ok(disconnected.program.derivation.accepted.every((p) => !['rail', 'join'].includes(p.op)));
    const alternate = composeRelations({ ...options, material: 'double', alphabet: 'runic' });
    const ordinary = composeRelations(options);
    assert.deepEqual(alternate.program.derivation, ordinary.program.derivation);
    differentPaint += JSON.stringify(alternate.scene.runs) !== JSON.stringify(ordinary.scene.runs);
    joins += ordinary.program.annotations.details.length;
    repeated += ordinary.program.derivation.accepted.filter((p) => p.expression?.op === 'repeat').length;
  }
  assert.ok(differentPaint > 10 && joins > 0 && repeated > 0);
});

test('version6 retains exact relation derivation across material and ornament changes', () => {
  const design = createDesign({ version: 6, engine: 'surface', seed: 'relation-contract', height: 3, weight: 0.8, complexity: 9 });
  assert.equal(design.version, 6);
  assert.equal(design.program.engine, 'role-relations/1');
  assert.equal(compile(design), compile(fromRecipe(recipe(design))));
  for (const change of [{ palette: 'ember' }, { material: 'heavy' }, { alphabet: 'runic' }, { glyphs: 'ascii' }, { glyphs: 'powerline' }]) {
    assert.deepEqual(createDesign({ ...recipe(design), ...change }).program.derivation, design.program.derivation);
  }
  assert.deepEqual(mutateDesign(design, 'variation', 'ornament').program.derivation, design.program.derivation);
  const a = composeRelations(config('candidate', { variation: 1 }));
  const b = composeRelations(config('candidate', { variation: 2 }));
  assert.notDeepEqual(a.program.derivation, b.program.derivation);
  const staticDesign = createDesign({ engine: 'surface', seed: 'static-relations', info: false, label: 'local', height: 1, weight: 0 });
  assert.ok(staticDesign.scene.runs.every((run) => run.kind !== 'slot'));
  assert.ok(preview(staticDesign, { color: false }).includes('local'));
});

test('role composition supports both dark and light finishes without changing geometry', () => {
  let dark = 0, light = 0;
  for (let i = 0; i < 120; i++) {
    const options = config(`finishes/${i}`, { weight: 1, colors: Array(7).fill('#123456') });
    const result = composeRelations(options);
    for (const paint of result.program.paint) {
      dark += paint.background === 6;
      light += [2, 3, 4].includes(paint.background);
    }
    const legacyColors = composeRelations({ ...options, colors: Array(6).fill('#abcdef') });
    assert.deepEqual(legacyColors.program.derivation, result.program.derivation);
  }
  assert.ok(dark > 10 && light > 5);
  const band = composeRelations(config('metadata', { height: 1, label: 'project' }));
  assert.equal(band.scene.rows, 1);
  assert.ok(band.cursor <= 45);
});
