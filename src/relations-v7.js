import { Scene, anchor, left } from './scene.js';
import { random } from './random.js';
import { materials, expression, renderExpression } from './ornaments.js';
import { planRoleBand, proposeRoleBand } from './relations.js';
import { rolePorts, roleMasks } from './interactions.js';
import { deriveMotif, evolveMotif } from './motifs.js';

const coordinate = (part) => anchor(part.at ?? 0, part.x - Math.floor((part.at ?? 0) * 78 / 1000));
const overlaps = (a, b) => a.row === b.row && a.x < b.x + b.width && b.x < a.x + a.width;
const covers = (a, b) => a.row === b.row && a.x <= b.x && a.x + a.width >= b.x + b.width;
const ends = { left: { round: '◖', angle: '◀' }, right: { round: '◗', angle: '▶' } };
const selectable = new Set(['accepted', 'visual-weight-budget', 'treatment-budget', 'role-already-treated', 'existing-treatment']);

// A surface is a list of intervals, not an inseparable rectangle. Negative
// intervals may interrupt its quiet gaps but can never cut through live text.
export function surfaceIntervals(bounds, masks) {
  let spans = [{ ...bounds }];
  for (const mask of masks) spans = spans.flatMap((span) => {
    if (!overlaps(span, mask)) return [span];
    const out = [];
    if (mask.x > span.x) out.push({ ...span, width: mask.x - span.x });
    if (mask.x + mask.width < span.x + span.width) out.push({ ...span, x: mask.x + mask.width, width: span.x + span.width - mask.x - mask.width });
    return out;
  });
  return spans;
}

export function proposeRelationsV7(plan, config) {
  const geometry = { ...config, seed: config.roleSeed ?? config.seed };
  const base = proposeRoleBand(plan, geometry);
  const rng = random(geometry.seed, 'structure:relations-v7:surfaces');
  const motif = deriveMotif(config.motifSeed ?? config.seed);
  const proposals = base.proposals.map((original) => {
    const p = structuredClone(original);
    p.accepted = false;
    p.reason = selectable.has(p.reason) ? 'eligible' : p.reason;
    p.layer = ['surface', 'edge', 'bracket'].includes(p.op) ? 'body' : 'accent';
    if (p.op === 'surface' && p.bounds) {
      p.cells = [];
      p.ends = { left: rng.pick(['round', 'flat', 'angle']), right: rng.pick(['round', 'flat', 'angle']) };
      const b = p.bounds;
      for (const side of ['left', 'right']) {
        const x = side === 'left' ? b.x - 1 : b.x + b.width;
        if (x < 0 || x >= 79 || b.row === plan.marker.row && x >= plan.marker.x) p.ends[side] = 'flat';
        const text = ends[side][p.ends[side]];
        if (text) p.cells.push({ x, row: b.row, at: b.at, text, side: 'cap' });
      }
      p.cutouts = [];
      const roles = p.roles.map((id) => plan.roles[id]).sort((a, b) => a.x - b.x);
      for (let i = 1; i < roles.length; i++) {
        const start = roles[i - 1].x + roles[i - 1].width;
        const room = roles[i].x - start;
        if (room >= 2 && rng.chance(0.6)) {
          const width = rng.int(1, Math.min(3, room));
          p.cutouts.push({ row: b.row, x: start + Math.floor((room - width) / 2), width, at: b.at, purpose: 'surface-cutout' });
        }
      }
      p.spans = surfaceIntervals(b, p.cutouts);
      p.fill = p.spans.reduce((sum, span) => sum + span.width, 0);
      p.edge = p.cells.length;
      delete p.cap;
    }
    // Interrupt a border without imposing another surrounding box. The gap
    // belongs to the operator and survives material/alphabet changes exactly.
    if (p.op === 'rule' && p.cells.length >= 3 && rng.chance(0.65)) {
      const index = rng.int(1, p.cells.length - 2);
      p.interruption = { ...p.cells[index], width: 1 };
      p.cells.splice(index, 1);
      p.edge = p.cells.length;
    }
    if (['rule', 'join'].includes(p.op) && p.cells.length) {
      const start = Math.min(...p.cells.map((cell) => cell.x)), end = Math.max(...p.cells.map((cell) => cell.x));
      const first = p.cells[0];
      const evolution = evolveMotif(motif, { width: end - start + 1, step: p.roles.length - 1 });
      p.motif = evolution.evolution;
      p.cells = evolution.cells.map((cell) => ({ ...cell, x: start + cell.x, row: first.row, at: first.at, text: '·', side: 'motif' }))
        .filter((cell) => !p.interruption || cell.x !== p.interruption.x);
      p.edge = p.cells.length;
    }
    // A previously round cap may have failed the boundary check. The v7 ends
    // can repair it to flat, so evaluate geometry again with the actual shape.
    if (p.op === 'surface' && p.bounds && ['outside-reserved-art', 'text-reservation'].includes(p.reason)) p.reason = 'eligible';
    const marks = [...p.cells.map((c) => ({ ...c, width: 1 })), ...(p.spans ?? (p.bounds ? [p.bounds] : []))];
    if (p.reason === 'eligible' && marks.some((m) => m.x < 0 || m.x + m.width > 79 || m.row < 0 || m.row >= plan.rows || m.row === plan.marker.row && m.x + m.width > plan.marker.x)) p.reason = 'outside-reserved-art';
    if (p.reason === 'eligible' && marks.some((m) => plan.reservations.some((r) => overlaps(m, r) && !(p.spans?.includes(m) && p.roles.includes(r.id) && covers(m, r))))) p.reason = 'text-reservation';
    return p;
  });
  const occupied = [], decorated = new Set(), accepted = [];
  const used = { fill: 0, edge: 0, treatments: 0 };
  // Compatible layers may share a role. Actual occupied cells, protected text,
  // and the global budget decide compatibility, rather than a leaf-wide veto.
  for (const p of proposals.filter((p) => p.reason === 'eligible').sort((a, b) => b.priority - a.priority || a.id - b.id)) {
    const marks = [...p.cells.map((c) => ({ ...c, width: 1 })), ...(p.spans ?? [])];
    let reason;
    if (used.treatments >= base.budgets.treatments) reason = 'treatment-budget';
    if (!reason && (used.fill + p.fill > base.budgets.fill || used.edge + p.edge > base.budgets.edge)) reason = 'visual-weight-budget';
    if (!reason && p.roles.some((id) => decorated.has(`${id}:${p.layer}`))) reason = 'role-layer-already-treated';
    if (!reason && marks.some((m) => occupied.some((o) => overlaps(m, o)))) reason = 'existing-treatment';
    p.accepted = !reason; p.reason = reason ?? 'accepted';
    if (!reason) {
      accepted.push(p); occupied.push(...marks); p.roles.forEach((id) => decorated.add(`${id}:${p.layer}`));
      used.fill += p.fill; used.edge += p.edge; used.treatments++;
    }
  }
  return { budgets: base.budgets, used, targets: base.targets, motif, proposals, accepted };
}

export function composeRelationsV7(config) {
  const geometry = { ...config, seed: config.roleSeed ?? config.seed };
  const plan = planRoleBand(geometry);
  const treatment = proposeRelationsV7(plan, config);
  const scene = new Scene(plan.rows, config.glyphs);
  const material = random(config.roleSeed ?? config.seed, 'material:relations-v7');
  const ornament = random(config.ornamentSeed ?? config.seed, 'ornament:relations-v7');
  const inks = material.chance(0.7) ? { username: 2, directory: 3, label: 4 } : { username: 3, directory: 2, label: 4 };
  const surfaces = new Map(), paint = [], details = [];
  for (const proposal of treatment.accepted) {
    const ink = inks[plan.roles[proposal.roles[0]].role];
    const dark = config.colors?.length > 6 ? 6 : 0;
    const background = material.chance(0.72) ? dark : material.pick([2, 3, 4]);
    for (const span of proposal.spans ?? []) scene.text(span.row, coordinate(span), ' '.repeat(span.width), { fg: 'contrast', bg: background });
    if (proposal.spans) proposal.roles.forEach((id) => surfaces.set(id, { background, dark: background === dark }));
    const join = proposal.op === 'join' ? expression(ornament, config.alphabet ?? 'punctuation', 1, 1) : null;
    if (join) details.push({ proposal: proposal.id, expression: join });
    for (const mark of proposal.cells) {
      const text = mark.side === 'motif' ? mark.kind === 'stroke' && mark.bits ? materials[config.material ?? 'square'][mark.bits] : renderExpression(join ?? expression(ornament, config.alphabet ?? 'punctuation', 1, 1))
        : mark.text === '─' ? materials[config.material ?? 'square'][10] : mark.text === '│' ? materials[config.material ?? 'square'][5] : mark.text;
      scene.text(mark.row, coordinate(mark), text, mark.side === 'cap' ? background : ink);
    }
    paint.push({ proposal: proposal.id, ink, background: proposal.spans ? background : null });
  }
  for (const role of plan.roles) {
    const surface = surfaces.get(role.id), foreground = inks[role.role];
    const ink = surface ? { fg: surface.dark ? foreground : 'contrast', bg: surface.background } : foreground;
    if (role.role === 'label') scene.text(role.row, coordinate(role), role.text, ink);
    else scene.slot(role.row, coordinate(role), role.role, role.width, ink);
  }
  const pointer = ornament.pick(['›', '>', '❯']);
  scene.text(plan.marker.row, left(plan.marker.x), pointer, 4);
  scene.runs.at(-1).purpose = 'input';
  const rows = [...new Set(scene.runs.map((run) => run.row))].sort((a, b) => a - b);
  const rowMap = Object.fromEntries(rows.map((row, index) => [row, index]));
  for (const run of scene.runs) run.row = rowMap[run.row];
  scene.rows = rows.length;
  const roles = plan.roles.map((role) => ({ ...role, row: rowMap[role.row] }));
  const masks = [...roleMasks(roles), ...treatment.accepted.flatMap((p) => (p.cutouts ?? []).map((cut) => ({ ...cut, row: rowMap[cut.row] })))];
  return {
    scene, cursor: plan.marker.x + 2, rightPrompt: '',
    program: {
      engine: 'role-relations/2', lattice: { columns: 79, rows: plan.rows },
      motif: treatment.motif,
      traits: { weight: config.weight ?? 0.28, material: config.material, alphabet: config.alphabet, density: config.density },
      derivation: { ...plan, ...treatment, edges: treatment.accepted.flatMap((p) => p.cells.map((cell) => ({ ...cell, proposal: p.id }))) },
      annotations: { pointer, details }, paint, rowMap,
      interactions: { mode: 'roles', ports: rolePorts(roles), masks, attachments: [] },
      stats: { fragments: plan.roles.length, groups: plan.groups.length,
        links: treatment.accepted.filter((p) => ['rail', 'join'].includes(p.op)).length,
        filledCells: treatment.used.fill, edgeCells: treatment.used.edge, treatments: treatment.accepted.length,
        accepted: treatment.accepted.length, rejected: treatment.proposals.length - treatment.accepted.length,
        span: Math.max(...plan.roles.map((r) => r.x + r.width)),
        occupiedCells: plan.roles.reduce((sum, r) => sum + r.width, 0) + treatment.used.edge + treatment.used.fill
          - treatment.accepted.filter((p) => p.spans).reduce((sum, p) => sum + p.roles.reduce((n, id) => n + plan.roles[id].width, 0), 0) },
    },
  };
}
