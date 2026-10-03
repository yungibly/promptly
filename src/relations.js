import { Scene, anchor, left } from './scene.js';
import { random } from './random.js';
import { materials, expression, renderExpression } from './ornaments.js';

const intersects = (a, b) => a.row === b.row && a.x < b.x + b.width && b.x < a.x + a.width;
const contains = (a, b) => a.row === b.row && a.x <= b.x && a.x + a.width >= b.x + b.width;
const structuralSeed = (config) => config.variation === undefined ? config.seed : `${config.seed}\0candidate:${config.variation}`;
const coordinate = (role, offset = 0) => anchor(role.at ?? 0, role.x + offset - Math.floor((role.at ?? 0) * 78 / 1000));
const extent = (roles) => ({ row: roles[0].row, x: Math.min(...roles.map((r) => r.x)), width: Math.max(...roles.map((r) => r.x + r.width)) - Math.min(...roles.map((r) => r.x)) });

// Roles constrain the composition; they do not implicitly create containers.
// This plan can also be used as a metadata band by another art engine.
export function planRoleBand(config) {
  const height = config.height ?? 2;
  const rng = random(structuralSeed(config), 'structure:relations');
  const followsText = height === 1 || rng.chance(0.42);
  const rowCount = followsText ? height : height - 1;
  const available = followsText ? 40 : 78;
  const roles = config.info === false ? [] : [
    { role: 'username', width: 8, minimum: 4 },
    { role: 'directory', width: rng.int(18, 24), minimum: 6 },
  ];
  if (config.label || !roles.length) roles.push({ role: 'label', text: config.label || 'prompt', width: (config.label || 'prompt').length, minimum: (config.label || 'prompt').length });
  // The order is a compositional decision, independent of inks and ornaments.
  for (let i = roles.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  const maxText = Math.min(available - roles.length * 3 - 2, followsText ? 34 : 58);
  while (roles.reduce((sum, r) => sum + r.width, 0) > maxText) {
    const next = roles.filter((r) => r.width > r.minimum).sort((a, b) => b.width - b.minimum - (a.width - a.minimum))[0];
    if (!next) break;
    next.width--;
  }
  const relations = [];
  let previous;
  for (const [id, role] of roles.entries()) {
    role.id = id; role.at = 0;
    role.row = previous ? previous.row : rng.int(0, rowCount - 1);
    const relation = !previous ? 'origin' : rng.pick(rowCount > 1 ? ['beside', 'beside', 'separate', 'align', 'indent'] : ['beside', 'separate']);
    role.x = previous ? previous.x + previous.width + (relation === 'separate' ? rng.int(4, 9) : rng.int(2, 4)) : rng.int(1, height === 1 ? 2 : 5);
    if (previous && ['align', 'indent'].includes(relation)) {
      role.row = (previous.row + 1) % rowCount;
      role.x = previous.x + (relation === 'indent' ? rng.int(3, 12) : 0);
    }
    // Distant information may use a native width-relative position. Its empty
    // corridor is preserved, rather than filled by a compulsory connecting bar.
    if (previous && !followsText && relation === 'separate' && rng.chance(config.spread ?? 0.5)) {
      role.x = 77 - role.width; role.at = 1000;
    }
    const occupied = roles.slice(0, id).filter((r) => r.row === role.row);
    for (const other of occupied) if (intersects({ ...role, x: role.x - 1, width: role.width + 2 }, other)) role.x = other.x + other.width + 3;
    if (role.x + role.width > available) {
      if (rowCount > 1 && !roles.slice(0, id).some((r) => r.row === (role.row + 1) % rowCount)) {
        role.row = (role.row + 1) % rowCount; role.x = rng.int(1, 5); role.at = 0;
      } else {
        // Bounded repair packs just this baseline. It does not erase another
        // role or introduce a new layout selected outside the recorded plan.
        const peers = [...occupied, role];
        let x = 1;
        for (const peer of peers) { peer.x = x; peer.at = 0; x += peer.width + 2; }
      }
    }
    relations.push({ op: relation, from: previous?.id ?? null, to: id });
    previous = role;
  }
  const firstRow = Math.min(...roles.map((role) => role.row));
  for (const role of roles) role.row -= firstRow;
  // Every leaf is a meaningful role. Groups can acquire a shared treatment;
  // decoration is never required at every leaf of the tree.
  let tree = { op: 'role', id: roles[0].id };
  const groups = roles.map((r) => ({ id: `role:${r.id}`, roles: [r.id] }));
  for (let i = 1; i < roles.length; i++) {
    tree = { op: 'group', relation: relations[i].op, children: [tree, { op: 'role', id: roles[i].id }] };
    groups.push({ id: `group:${i}`, roles: roles.slice(0, i + 1).map((r) => r.id) });
  }
  const lastRow = Math.max(...roles.map((role) => role.row));
  const marker = { row: followsText ? lastRow : height - 1, x: followsText ? Math.max(...roles.filter((r) => r.row === lastRow).map((r) => r.x + r.width)) + 2 : rng.pick([0, 0, 1, roles[0].x]), width: 1 };
  return { rows: marker.row + 1, heightBudget: height, followsText, roles, groups, relations, tree, marker,
    reservations: roles.map(({ id, row, x, width, at }) => ({ id, row, x, width, at })),
    rules: { minimumGap: 2, fieldPadding: 1, maximumCursor: 45, singleRowSurfaces: true } };
}

// Atomic proposals work on groups of text intervals. A quality gate enforces
// protected fields, one visual treatment per group, and one global ink budget.
export function proposeRoleBand(plan, config) {
  const rng = random(structuralSeed(config), 'structure:relations:proposals');
  const preference = random(structuralSeed(config), 'structure:relations:preference');
  const weight = config.weight ?? 0.28;
  const totalText = plan.roles.reduce((sum, r) => sum + r.width, 0);
  const linePreference = config.engine === 'prompt';
  const budgets = { fill: Math.floor(weight ** 1.45 * (totalText + 10) * (linePreference ? 0.32 : 1)), edge: Math.floor(weight * 20), treatments: weight === 0 ? 0 : Math.ceil(weight * 4) };
  const used = { fill: 0, edge: 0, treatments: 0 };
  const proposals = [], accepted = [], decorated = new Set();
  const occupied = [];
  const descendants = (node) => node.op === 'role' ? [node.id] : node.children.flatMap(descendants);
  // Choose the level of grouping before choosing a treatment. Shared treatment
  // competes with other treatments of that group, not with an already decorated
  // first leaf. This keeps grouping a real compositional choice.
  const targetCount = rng.int(1, Math.min(config.fragments ?? 2, plan.roles.length));
  const nodes = [plan.tree];
  while (nodes.length < targetCount) {
    const choices = nodes.filter((node) => node.op === 'group');
    if (!choices.length) break;
    const next = rng.pick(choices);
    nodes.splice(nodes.indexOf(next), 1, ...next.children);
  }
  const targets = nodes.map((node) => {
    const ids = descendants(node);
    return plan.groups.find((group) => group.roles.length === ids.length && group.roles.every((id, i) => id === ids[i]));
  });
  const attemptLimit = 5 + (config.complexity ?? 3) * 3;
  for (let attempt = 0; attempt < attemptLimit; attempt++) {
    const group = rng.pick(targets);
    const roles = group.roles.map((id) => plan.roles[id]);
    const sameRow = roles.every((r) => r.row === roles[0].row);
    const sameAnchor = roles.every((r) => r.at === roles[0].at);
    const bounds = extent(roles);
    const choice = rng.pick(linePreference ? ['surface', 'edge', 'edge', 'bracket', 'rule', 'rule', 'rail', 'join'] : ['surface', 'surface', 'edge', 'edge', 'bracket', 'rule', 'rail', 'join']);
    const proposal = { id: attempt, group: group.id, roles: group.roles, op: choice, cells: [], fill: 0, edge: 0 };
    // Preference is sampled over a bounded candidate batch. Geometric safety is
    // mandatory; a first cheap edge cannot consume a role before a considered
    // shared surface, aligned rail, or typographic join has been evaluated.
    proposal.priority = Number((preference.next() + ({ surface: weight * 0.5, edge: 0.02, bracket: 0.12, rule: 0.2, rail: 0.3, join: 0.25 }[choice])).toFixed(6));
    let reason;
    const cell = (x, row, text, side = 'edge') => proposal.cells.push({ x, row, text, side, at: roles[0].at });
    if (choice === 'surface') {
      if (!sameRow || !sameAnchor) reason = 'surface-needs-one-baseline';
      else {
        proposal.bounds = { ...bounds, x: bounds.x - 1, width: bounds.width + 2, at: roles[0].at };
        proposal.fill = proposal.bounds.width;
        proposal.cap = rng.chance(0.6) ? 'round' : 'flat';
        if (proposal.cap === 'round') {
          cell(proposal.bounds.x - 1, bounds.row, '◖', 'cap');
          cell(proposal.bounds.x + proposal.bounds.width, bounds.row, '◗', 'cap');
          proposal.edge = 2;
        }
      }
    } else if (choice === 'edge' || choice === 'bracket') {
      if (!sameRow || !sameAnchor) reason = 'edge-needs-one-baseline';
      else {
        const side = rng.chance(0.5) ? 'left' : 'right';
        if (side === 'left' || choice === 'bracket' || config.symmetry === 'mirror') cell(bounds.x - 1, bounds.row, choice === 'bracket' ? '[' : '│');
        if (side === 'right' || choice === 'bracket' || config.symmetry === 'mirror') cell(bounds.x + bounds.width, bounds.row, choice === 'bracket' ? ']' : '│');
        proposal.edge = proposal.cells.length;
      }
    } else if (choice === 'rule') {
      if (!sameRow || !sameAnchor) reason = 'rule-needs-one-baseline';
      else {
        const row = bounds.row + (rng.chance(0.5) ? -1 : 1);
        const count = Math.min(config.fragments ?? 3, 1 + Math.floor((config.complexity ?? 3) / 4));
        const unit = rng.int(1, Math.max(1, Math.round((config.density ?? 0.5) * 5))), length = Math.min(bounds.width, count * unit + count - 1);
        const start = rng.chance(0.5) ? bounds.x : bounds.x + bounds.width - length;
        for (let x = start; x < start + length; x++) if ((x - start) % (unit + 1) < unit) cell(x, row, '─');
        proposal.expression = { op: 'repeat', count, gap: 1, child: { op: 'stroke', width: unit } };
        proposal.edge = proposal.cells.length;
      }
    } else if (choice === 'join') {
      if (!sameRow || !sameAnchor || roles.length < 2) reason = 'join-needs-neighboring-roles';
      else {
        const ordered = [...roles].sort((a, b) => a.x - b.x);
        const a = ordered[0], b = ordered[1];
        const room = b.x - a.x - a.width - 2;
        if (room < 1) reason = 'quiet-gap-too-small';
        else {
          const count = Math.min(room, 1 + Math.floor((config.complexity ?? 3) / 3));
          const start = a.x + a.width + 1 + Math.floor((room - count) / 2);
          for (let i = 0; i < count; i++) cell(start + i, a.row, '─');
          proposal.expression = { op: 'group', relation: 'join', children: [{ op: 'stroke', width: count }] };
          proposal.edge = count;
        }
      }
    } else {
      if (sameRow || !sameAnchor) reason = 'rail-needs-separate-baselines';
      else {
        const x = Math.min(...roles.map((r) => r.x)) - 1;
        for (let row = Math.min(...roles.map((r) => r.row)); row <= Math.max(...roles.map((r) => r.row)); row++) cell(x, row, '│');
        proposal.edge = proposal.cells.length;
      }
    }
    const marks = proposal.cells.map((c) => ({ ...c, width: 1 }));
    if (proposal.bounds) marks.push(proposal.bounds);
    if (!reason && ['join', 'rail'].includes(choice) && !rng.chance(config.connectivity ?? 0.5)) reason = 'connection-control';
    if (!reason && marks.some((m) => m.x < 0 || m.x + m.width > 79 || m.row < 0 || m.row >= plan.rows || (m.row === plan.marker.row && m.x + m.width > plan.marker.x))) reason = 'outside-reserved-art';
    if (!reason && marks.some((m) => plan.reservations.some((r) => intersects(m, r) && !(m === proposal.bounds && group.roles.includes(r.id) && contains(m, r))))) reason = 'text-reservation';
    proposal.accepted = false; proposal.reason = reason ?? 'eligible';
    proposals.push(proposal);
  }
  const ranked = [...proposals].filter((p) => p.reason === 'eligible').sort((a, b) => b.priority - a.priority || a.id - b.id);
  for (const proposal of ranked) {
    const roles = proposal.roles.map((id) => plan.roles[id]);
    const marks = proposal.cells.map((c) => ({ ...c, width: 1 }));
    if (proposal.bounds) marks.push(proposal.bounds);
    let reason;
    if (used.treatments >= budgets.treatments) reason = 'treatment-budget';
    if (!reason && (used.fill + proposal.fill > budgets.fill || used.edge + proposal.edge > budgets.edge)) reason = 'visual-weight-budget';
    if (!reason && roles.some((r) => decorated.has(r.id))) reason = 'role-already-treated';
    if (!reason && marks.some((m) => occupied.some((o) => intersects(m, o)))) reason = 'existing-treatment';
    proposal.accepted = !reason; proposal.reason = reason ?? 'accepted';
    if (!reason) {
      accepted.push(proposal); occupied.push(...marks); roles.forEach((r) => decorated.add(r.id));
      used.fill += proposal.fill; used.edge += proposal.edge; used.treatments++;
    }
  }
  return { budgets, used, targets: targets.map((group) => group.id), proposals, accepted };
}

export function paintRoleBand(plan, config) {
  const scene = new Scene(plan.rows, config.glyphs);
  const material = random(config.seed, 'material:relations');
  const detail = random(config.ornamentSeed ?? config.seed, 'ornament:relations');
  const treatment = proposeRoleBand(plan, config);
  const inks = material.chance(0.7) ? { username: 2, directory: 3, label: 4 } : { username: 3, directory: 2, label: 4 };
  const surfaces = new Map();
  const paint = [], details = [];
  for (const proposal of treatment.accepted) {
    const roleInk = inks[plan.roles[proposal.roles[0]].role];
    const dark = config.colors?.length > 6 ? 6 : 0;
    const background = material.chance(0.72) ? dark : material.pick([2, 3, 4]);
    if (proposal.bounds) {
      const b = proposal.bounds;
      scene.text(b.row, coordinate(b), ' '.repeat(b.width), { fg: 'contrast', bg: background });
      proposal.roles.forEach((id) => surfaces.set(id, { background, dark: background === dark }));
    }
    const joinDetail = proposal.op === 'join' ? expression(detail, config.alphabet ?? 'punctuation', 1, 1) : null;
    if (joinDetail) details.push({ proposal: proposal.id, expression: joinDetail });
    for (const mark of proposal.cells) {
      const text = joinDetail ? renderExpression(joinDetail) : mark.text === '─' ? materials[config.material ?? 'square'][10] : mark.text === '│' ? materials[config.material ?? 'square'][5] : mark.text;
      scene.text(mark.row, coordinate(mark), text, mark.side === 'cap' ? background : roleInk);
    }
    paint.push({ proposal: proposal.id, ink: roleInk, background: proposal.bounds ? background : null });
  }
  for (const role of plan.roles) {
    const foreground = inks[role.role];
    const finish = surfaces.get(role.id);
    const ink = finish ? { fg: finish.dark ? foreground : 'contrast', bg: finish.background } : foreground;
    if (role.role === 'label') scene.text(role.row, coordinate(role), role.text, ink);
    else scene.slot(role.row, coordinate(role), role.role, role.width, ink);
  }
  const pointer = detail.pick(['›', '>', '❯']);
  scene.text(plan.marker.row, left(plan.marker.x), pointer, 4);
  const rows = [...new Set(scene.runs.map((run) => run.row))].sort((a, b) => a - b);
  const rowMap = Object.fromEntries(rows.map((row, index) => [row, index]));
  for (const run of scene.runs) run.row = rowMap[run.row];
  scene.rows = rows.length;
  return {
    scene, cursor: plan.marker.x + 2, rightPrompt: '',
    program: {
      engine: 'role-relations/1', lattice: { columns: 79, rows: plan.rows },
      traits: { weight: config.weight ?? 0.28, material: config.material, alphabet: config.alphabet, density: config.density },
      derivation: { ...plan, ...treatment, edges: treatment.accepted.flatMap((p) => p.cells.map((cell) => ({ ...cell, proposal: p.id }))) },
      annotations: { pointer, details }, paint, rowMap,
      stats: { fragments: plan.roles.length, groups: plan.groups.length, links: treatment.accepted.filter((p) => ['rail', 'join'].includes(p.op)).length,
        filledCells: treatment.used.fill, edgeCells: treatment.used.edge, treatments: treatment.accepted.length,
        accepted: treatment.accepted.length, rejected: treatment.proposals.length - treatment.accepted.length,
        span: Math.max(...plan.roles.map((r) => r.x + r.width)),
        occupiedCells: plan.roles.reduce((n, r) => n + r.width, 0) + treatment.used.fill + treatment.used.edge
          - treatment.accepted.filter((p) => p.bounds).reduce((n, p) => n + p.roles.reduce((sum, id) => sum + plan.roles[id].width, 0), 0) },
    },
  };
}

export function composeRelations(config) {
  return paintRoleBand(planRoleBand(config), config);
}
