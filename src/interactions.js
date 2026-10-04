import { anchor, left, right } from './scene.js';
import { random } from './random.js';
import { materials } from './ornaments.js';
import { rasterize } from './marks.js';

const value = (x, width = 79) => Math.floor(x.at * (width - 1) / 1000) + x.offset;
const at = (part, dx = 0) => anchor(part.at ?? 0, part.x + dx - Math.floor((part.at ?? 0) * 78 / 1000));
const plus = (x, delta) => ({ ...x, offset: x.offset + delta });
const wireId = (wire) => `wire:${wire.from.row}:${wire.from.x.at}:${wire.from.x.offset}:${wire.to.row}:${wire.to.x.at}:${wire.to.x.offset}`;

export function rolePorts(roles) {
  return roles.flatMap((role) => [
    { id: `${role.id}:left`, role: role.id, side: 'left', row: role.row, x: at(role, -1) },
    { id: `${role.id}:right`, role: role.id, side: 'right', row: role.row, x: at(role, role.width) },
  ]);
}

export function roleMasks(roles, padding = 1) {
  return roles.map((role) => ({ role: role.id, purpose: 'protected-text', row: role.row,
    x: role.x - padding, width: role.width + padding * 2, at: role.at ?? 0 }));
}

// Ports come from structural cells, never from the chosen ornament strings.
// Masking is a presentation operation: the original graph remains untouched.
export function artworkPorts(composition) {
  const result = [], seen = new Set(), finalRow = composition.scene.rows - 1;
  const add = (row, x, source, boundary = true) => {
    const key = `${row}:${x.at}:${x.offset}`;
    if (row < 0 || row >= finalRow || seen.has(key)) return;
    seen.add(key); result.push({ id: `art:${source}:${key}`, row, x, source, boundary });
  };
  if (composition.program.engine.startsWith('spatial-assembly/')) {
    for (const piece of composition.program.derivation.pieces) {
      const byRow = new Map();
      for (const cell of rasterize(piece.tree).values()) {
        if (cell.kind === 'text') continue;
        const row = cell.y + piece.rect.y;
        if (!byRow.has(row)) byRow.set(row, []);
        byRow.get(row).push(cell.x);
      }
      const origin = Math.round((piece.rect.x + (piece.rect.width - 1) / 2) * 1000 / 78);
      for (const [sourceRow, columns] of byRow) {
        const row = composition.program.rowMap[sourceRow];
        if (row === undefined) continue;
        for (const x of [Math.min(...columns), Math.max(...columns)]) add(row, anchor(origin, piece.rect.x + x - Math.floor(origin * 78 / 1000)), piece.fragmentId ?? `piece:${piece.id}`, x === 0 || x === piece.rect.width - 1);
      }
    }
  } else {
    for (const run of composition.scene.runs) if (run.kind === 'wire') {
      add(run.from.row, run.from.x, 'network');
      add(run.to.row, run.to.x, 'network');
    }
  }
  return result;
}

function fragmentReservations(composition, row) {
  if (!composition.program.engine.startsWith('spatial-assembly/')) return [];
  return composition.program.derivation.pieces.filter((piece) => {
    for (let y = piece.rect.y; y < piece.rect.y + piece.rect.height; y++) if (composition.program.rowMap[y] === row) return true;
    return false;
  }).map((piece) => {
    const { rect } = piece;
    const origin = Math.round((rect.x + (rect.width - 1) / 2) * 1000 / 78);
    return { x: anchor(origin, rect.x - Math.floor(origin * 78 / 1000)), width: rect.width };
  });
}

// Reuse the same text geometry inside or next to art. A short connection and
// blank masks are added as overlays; no network edge is removed or rerouted.
export function integrateRoleBand(composition, band, config) {
  const { scene } = composition, finalRow = scene.rows - 1;
  const offset = config.engine === 'network' ? 4 : 0;
  const rng = random(config.interactionSeed ?? config.seed, 'structure:art-role-interactions');
  const art = artworkPorts(composition);
  const body = band.scene.runs.filter((run) => run.purpose !== 'input');
  const roles = band.program.derivation.roles;
  // Reserve possible side treatments, not just the decorations painted today.
  // A changed motif or weight therefore cannot move the pinned role layout.
  const min = Math.max(0, Math.min(...roles.map((role) => role.x)) - 2);
  const max = Math.min(79, Math.max(...roles.map((role) => role.x + role.width)) + 2);
  const width = max - min;
  const mode = config.weight === 0 ? 'detached' : rng.pick(['detached', 'detached', 'attach', 'occlude', 'occlude']);
  const embedded = mode !== 'detached' && finalRow > 0;
  // Place the text before inspecting available artwork. Regenerating an art
  // fragment can invalidate a route, but cannot move a pinned role or mask.
  const row = embedded ? rng.int(0, finalRow - 1) : finalRow;
  const start = embedded ? rng.pick([1, 1, 78 - width, rng.int(1, 78 - width)]) : min + offset;
  const originAt = embedded ? rng.pick([0, 0, 500, 1000]) : 0;
  const shift = start - min;
  const origin = anchor(originAt, shift - Math.floor(originAt * 78 / 1000));
  const translate = (x) => anchor(origin.at, value(x) + origin.offset);
  const translatedRoles = roles.map((role) => ({ ...role, row, at: origin.at, x: role.x + shift }));
  const ports = rolePorts(translatedRoles), masks = roleMasks(translatedRoles);
  const attachments = [], occluded = [];
  const wires = scene.runs.filter((run) => run.kind === 'wire');
  const protectedAt = (port, width = 79) => masks.some((mask) => mask.row === port.row
    && value(port.x, width) >= value(at(mask), width) && value(port.x, width) < value(at(mask), width) + mask.width);
  if (embedded) {
    for (const mask of masks) {
      const lo = value(at(mask)), hi = lo + mask.width;
      for (const wire of wires) {
        const a = wire.from, b = wire.to;
        const hit = a.row === b.row ? a.row === row && Math.min(value(a.x), value(b.x)) < hi && Math.max(value(a.x), value(b.x)) >= lo
          : row >= Math.min(a.row, b.row) && row <= Math.max(a.row, b.row) && value(a.x) >= lo && value(a.x) < hi;
        if (hit) occluded.push({ source: wireId(wire), role: mask.role });
      }
      for (const port of art) if (port.row === row && value(port.x) >= lo && value(port.x) < hi) occluded.push({ source: port.id, role: mask.role });
    }
  }
  if (embedded && mode === 'attach' && (config.connectivity ?? 1) > 0) {
    const candidates = [];
    const reserved = fragmentReservations(composition, row);
    const clearRoute = (from, target) => [79, 119, 999].every((width) => {
      const a = value(from, width), b = value(target, width), step = Math.sign(b - a);
      if (!step) return false;
      const lo = Math.min(a + step, b), hi = Math.max(a + step, b) + 1;
      return reserved.every((rect) => hi <= value(rect.x, width) || lo >= value(rect.x, width) + rect.width);
    });
    for (const side of ['left', 'right']) {
      const target = plus(origin, side === 'left' ? min : max - 1);
      const before = (x, width) => side === 'left' ? value(x, width) < value(target, width) : value(x, width) > value(target, width);
      for (const port of art) {
        if (!port.boundary || port.row !== row || !clearRoute(port.x, target) || [79, 119, 999].some((width) => protectedAt(port, width) || !before(port.x, width) || Math.abs(value(port.x, width) - value(target, width)) > Math.max(18, width * 0.22))) continue;
        candidates.push({ source: port.id, side, from: port.x, target });
      }
      // A responsive point lying on an existing wire is also an explicit port.
      // It keeps a short attachment short at every supported terminal width.
      const from = plus(target, side === 'left' ? -2 : 2);
      for (const wire of wires) {
        if (wire.from.row !== row || wire.to.row !== row) continue;
        if (!clearRoute(from, target)) continue;
        if ([79, 119, 999].some((width) => value(from, width) < 0 || value(from, width) >= width
          || value(from, width) < Math.min(value(wire.from.x, width), value(wire.to.x, width))
          || value(from, width) > Math.max(value(wire.from.x, width), value(wire.to.x, width)))) continue;
        candidates.push({ source: wireId(wire), side, from, target });
      }
    }
    if (candidates.length) {
      for (const candidate of candidates) candidate.priority = random(config.interactionSeed ?? config.seed,
        `structure:attachment:${candidate.source}:${candidate.side}:${candidate.from.at}:${candidate.from.offset}`).next();
      const selected = candidates.filter((candidate) => candidate.priority < (config.connectivity ?? 1)).sort((a, b) => b.priority - a.priority)[0];
      if (selected) {
        const path = [{ row, x: selected.from }, { row, x: selected.target }];
        const paintFrom = { row, x: plus(selected.from, Math.sign(value(selected.target) - value(selected.from))) };
        scene.wire(paintFrom, path[1], 1, materials[config.material ?? 'square']);
        attachments.push({ source: selected.source, target: `role-band:${selected.side}`, path, paintFrom });
      }
    }
  }
  // Structural wires are kept even where a later field masks them, preserving
  // the graph and its connectivity proof. Only the old input glyphs are retired.
  scene.runs = scene.runs.filter((run) => run.kind === 'wire' || run.row !== finalRow)
    .filter((run) => config.label || run.kind || !run.text.includes('username'));
  if (embedded) {
    for (const mask of masks) scene.text(mask.row, at(mask), ' '.repeat(mask.width), 0);
    scene.fill(finalRow, left(offset), right(1), ' ', 0);
  }
  for (const run of body) scene.runs.push({ ...run, row, x: translate(run.x) });
  const input = band.scene.runs.find((run) => run.purpose === 'input');
  const inputX = embedded ? offset : input.x.offset + offset;
  scene.runs.push({ ...input, row: finalRow, x: left(inputX) });
  const inputMask = { purpose: 'input', row: finalRow, x: inputX + 1, width: 79 - inputX - 1, at: 0 };
  const interactions = { mode, ports: [...art, ...ports], masks: [...masks, inputMask], attachments,
    placement: { row, origin }, occluded };
  return { ...composition, cursor: inputX + 2,
    program: { ...composition.program, identity: { offset: { row, column: shift }, ...band.program }, interactions } };
}
