import { Scene, left } from './scene.js';
import { random } from './random.js';
import { materials } from './ornaments.js';

// A surface is a small cell program. Its parts have no theme and can be reused
// around any text role: paint, edge, repeat, subtraction, and nested layers.
// In particular a rounded label is not a complete prompt layout.
export const layer = (...children) => ({ op: 'layer', children });
export const surface = (x, y, width, height, tone = 'body') => ({ op: 'surface', x, y, width, height, tone });
export const rule = (x, y, width, tone = 'accent', glyph = 'line') => ({ op: 'rule', x, y, width, tone, glyph });
export const glyph = (x, y, text, tone = 'body') => ({ op: 'glyph', x, y, text, tone });
export const cut = (child, x, y, width, height = 1) => ({ op: 'cut', child, x, y, width, height });
export const repeat = (child, count, dx, dy = 0) => ({ op: 'repeat', child, count, dx, dy });
export const translate = (child, dx, dy) => ({ op: 'translate', child, dx, dy });
export const reflect = (child, at) => ({ op: 'reflect', child, at });
export const contour = (x, y, width, height = 3, profile = 'capsule', tone = 'body', filled = true) => ({ op: 'contour', x, y, width, height, profile, tone, filled });

const reflectedGlyphs = new Map();
for (const [a, b] of [['◖', '◗'], ['▌', '▐'], ['▗', '▖'], ['▝', '▘'], ['╱', '╲'], ['[', ']'], ['<', '>'], ['╭', '╮'], ['╰', '╯'], ['┌', '┐'], ['└', '┘']]) {
  reflectedGlyphs.set(a, b); reflectedGlyphs.set(b, a);
}

export function rasterizeSurface(tree) {
  function draw(node) {
    const cells = new Map();
    const put = (x, y, data) => cells.set(`${x},${y}`, { ...data, x, y });
    const merge = (other, dx = 0, dy = 0) => {
      for (const cell of other.values()) put(cell.x + dx, cell.y + dy, cell);
    };
    switch (node.op) {
      case 'surface':
        for (let y = node.y; y < node.y + node.height; y++) for (let x = node.x; x < node.x + node.width; x++) put(x, y, { text: ' ', tone: node.tone, fill: true });
        break;
      case 'contour': {
        const { x, y, width: w, height: h, profile, tone, filled } = node;
        const mark = (dx, dy, text) => put(x + dx, y + dy, { text, tone, fill: false });
        const band = (dy, start, end, text = ' ') => {
          for (let dx = Math.max(0, start); dx < Math.min(w, end); dx++) put(x + dx, y + dy, { text, tone, fill: text === ' ' });
        };
        if (h < 2 || w < 4) { band(0, 0, w, filled ? ' ' : '─'); break; }
        const bottom = h - 1;
        if (!filled) {
          const corners = ['capsule', 'roundbox', 'arch'].includes(profile) ? ['╭', '╮', '╰', '╯'] : profile === 'bevel' ? ['╱', '╲', '╲', '╱'] : ['┌', '┐', '└', '┘'];
          band(0, 1, w - 1, '─'); mark(0, 0, corners[0]); mark(w - 1, 0, corners[1]);
          if (profile !== 'arch') { band(bottom, 1, w - 1, '─'); mark(0, bottom, corners[2]); mark(w - 1, bottom, corners[3]); }
          for (let row = 1; row < bottom; row++) { mark(0, row, '│'); mark(w - 1, row, '│'); }
          break;
        }
        // Quarter-block shoulders meet half-block ribbons at terminal-cell
        // scale. Their ink matches the center's native background, producing
        // one continuous silhouette without font-specific powerline glyphs.
        if (profile === 'capsule') {
          mark(0, 0, '▗'); band(0, 1, w - 1, '▄'); mark(w - 1, 0, '▖');
          for (let row = 1; row < bottom; row++) { mark(0, row, '▐'); band(row, 1, w - 1); mark(w - 1, row, '▌'); }
          mark(0, bottom, '▝'); band(bottom, 1, w - 1, '▀'); mark(w - 1, bottom, '▘');
        } else if (profile === 'roundbox') {
          mark(0, 0, '▗'); band(0, 1, w - 1); mark(w - 1, 0, '▖');
          for (let row = 1; row < bottom; row++) band(row, 0, w);
          mark(0, bottom, '▝'); band(bottom, 1, w - 1); mark(w - 1, bottom, '▘');
        } else if (profile === 'bevel') {
          mark(0, 0, '╱'); band(0, 1, w - 1); mark(w - 1, 0, '╲');
          for (let row = 1; row < bottom; row++) band(row, 0, w);
          mark(0, bottom, '╲'); band(bottom, 1, w - 1); mark(w - 1, bottom, '╱');
        } else if (profile === 'step') {
          band(0, 2, w); for (let row = 1; row < bottom; row++) band(row, 0, w); band(bottom, 0, w - 2);
        } else if (profile === 'tab') {
          band(0, 0, Math.max(2, Math.floor(w / 2)), '▄');
          for (let row = 1; row < bottom; row++) band(row, 0, w);
          band(bottom, 0, w, '▀');
        } else if (profile === 'arch') {
          mark(0, 0, '▗'); band(0, 1, w - 1, '▄'); mark(w - 1, 0, '▖');
          for (let row = 1; row <= bottom; row++) { mark(0, row, '▐'); band(row, 1, w - 1); mark(w - 1, row, '▌'); }
        } else throw new Error(`Unknown contour profile: ${profile}`);
        break;
      }
      case 'rule':
        for (let x = node.x; x < node.x + node.width; x++) put(x, node.y, { text: node.glyph, tone: node.tone, fill: false });
        break;
      case 'glyph': [...node.text].forEach((text, i) => put(node.x + i, node.y, { text, tone: node.tone, fill: false })); break;
      case 'layer': for (const child of node.children) merge(draw(child)); break;
      case 'translate': merge(draw(node.child), node.dx, node.dy); break;
      case 'repeat': for (let i = 0; i < node.count; i++) merge(draw(node.child), node.dx * i, node.dy * i); break;
      case 'reflect':
        for (const cell of draw(node.child).values()) put(2 * node.at - cell.x, cell.y, { ...cell, text: reflectedGlyphs.get(cell.text) ?? cell.text });
        break;
      case 'cut':
        for (const cell of draw(node.child).values()) if (!(cell.x >= node.x && cell.x < node.x + node.width && cell.y >= node.y && cell.y < node.y + node.height)) put(cell.x, cell.y, cell);
        break;
      default: throw new Error(`Unknown surface operation: ${node.op}`);
    }
    return cells;
  }
  return draw(tree);
}

const profiles = {
  round: ['◖', '◗'], square: ['▌', '▐'], bevel: ['╱', '╲'],
  bracket: ['[', ']'], angle: ['<', '>'], bar: ['│', '│'], open: ['', ''],
};

function statistics(tree) {
  const operations = {};
  let maxDepth = 0, nodes = 0;
  function visit(node, depth) {
    operations[node.op] = (operations[node.op] ?? 0) + 1;
    nodes++; maxDepth = Math.max(maxDepth, depth);
    for (const child of node.children ?? []) visit(child, depth + 1);
    if (node.child) visit(node.child, depth + 1);
  }
  visit(tree, 0);
  return { operations, nodes, maxDepth };
}

function roleShape(part, rng, config, artRows) {
  const { complexity, density = 0.5, fragments = 1, symmetry } = config;
  const { width, row, x, profile, padding, filled } = part;
  const edge = profile === 'open' ? 0 : 1;
  const bodyX = x + edge, bodyWidth = width - edge * 2;
  const layers = [], holes = [];
  if (part.contour) {
    const child = contour(x, row - 1, width, 3, part.contour, 'body', filled);
    const children = [child];
    part.caps.push({ row: row - 1, x, width, treatment: 'contour' }, { row: row + 1, x, width, treatment: 'contour' });
    if (fragments > 1 && width > 5) {
      const count = Math.min(fragments - 1, Math.floor((width - 2) / 3));
      const upper = rng.chance(0.5), y = row + (upper ? -1 : 1);
      const text = filled ? upper ? '▄' : '▀' : 'line';
      // Insets keep the curved corners intact as small colored ribbons split
      // the border. No stripe crosses the live-field reservation.
      children.push(repeat(rule(x + 2, y, 1, 'accent', text), count, 3));
      part.satellites.push({ row: y, x: x + 2, count, size: 1, pitch: 3 });
    }
    const tree = layer(...children);
    return symmetry === 'mirror' ? layer(tree, reflect(tree, x + (width - 1) / 2)) : tree;
  }
  if (filled) layers.push(surface(bodyX, row, bodyWidth, 1));
  // Caps can be attached above, below, or both. They are local geometry; the
  // arrangement of the other text roles is sampled independently.
  const available = [row - 1, row + 1].filter((y) => y >= 0 && y < artRows);
  const capRows = [];
  for (const y of available) if (rng.chance(0.25 + density * 0.65)) capRows.push(y);
  if (capRows.length === 2 && rng.chance(0.35)) capRows.pop();
  if (available.length === 2 && ['round', 'square', 'bar'].includes(profile) && rng.chance(0.65)) capRows.splice(0, capRows.length, ...available);
  const framed = capRows.length === 2;
  const ends = framed ? ['│', '│'] : profiles[profile];
  if (edge) layers.push(glyph(x, row, ends[0]), glyph(x + width - 1, row, ends[1]));
  for (const y of capRows) {
    const above = y < row;
    const inset = framed ? 0 : rng.int(0, Math.max(0, Math.min(2, Math.floor((width - 3) / 2))));
    const capX = x + inset, capWidth = width - inset * 2;
    const treatment = framed ? 'rule' : rng.pick(['rule', 'rule', 'paint', 'steps', 'tiles']);
    let child;
    if (treatment === 'paint') child = surface(capX, y, capWidth, 1, 'accent');
    else if (treatment === 'steps') {
      const step = Math.max(1, Math.floor(capWidth / 3));
      child = layer(rule(capX, y, step, 'accent', above ? '▄' : '▀'), rule(capX + step, y, capWidth - step * 2, 'body', above ? '▀' : '▄'), rule(capX + capWidth - step, y, step, 'accent', above ? '▄' : '▀'));
    } else if (treatment === 'tiles') {
      const size = rng.int(1, Math.min(3, capWidth)), spacing = size + 1;
      child = repeat(surface(capX, y, size, 1, 'accent'), Math.max(1, Math.floor((capWidth + 1) / spacing)), spacing);
    } else {
      const corners = profile === 'round' ? above ? ['╭', '╮'] : ['╰', '╯'] : above ? ['┌', '┐'] : ['└', '┘'];
      child = layer(rule(capX + 1, y, Math.max(0, capWidth - 2), 'body'), glyph(capX, y, corners[0]), glyph(capX + capWidth - 1, y, corners[1]));
    }
    if (!framed && complexity > 3 && capWidth > 6 && rng.chance(0.65)) {
      const notch = capX + rng.int(2, capWidth - 3);
      const hole = { x: notch, y, width: rng.int(1, Math.min(3, capX + capWidth - 1 - notch)) };
      holes.push(hole);
      child = cut(child, hole.x, hole.y, hole.width);
    }
    layers.push(child);
    part.caps.push({ row: y, x: capX, width: capWidth, treatment });
  }

  // Partition only padding or cap rows. Dynamic text reservations never cross
  // a seam, hole, texture, or another role's painting operation.
  if (padding && complexity >= 3 && rng.chance(0.7)) {
    const side = rng.chance(0.5) ? bodyX : bodyX + bodyWidth - padding;
    layers.push(surface(side, row, padding, 1, 'accent'));
  }
  if (complexity >= 6 && width > 2 && capRows.length && rng.chance(0.7)) {
    const y = rng.pick(capRows), length = rng.int(1, Math.max(1, Math.floor(width / 3)));
    layers.push(rule(x + rng.int(1, Math.max(1, width - length - 1)), y, length, 'detail', '─'));
  }
  // Fragment count is a target for subordinate pieces, bounded by the role's
  // own footprint. More pieces add local visual rhythm without widening it.
  if (fragments > 1 && available.length && !framed) {
    const y = rng.pick(available), size = rng.int(1, Math.min(3, width)), pitch = size + rng.int(1, 2);
    const count = Math.min(fragments - 1, 1 + Math.floor((width - size) / pitch));
    const start = x + rng.int(0, Math.max(0, width - (count - 1) * pitch - size));
    const swatches = repeat(surface(start, y, size, 1, 'accent'), count, pitch);
    layers.push(swatches);
    part.satellites.push({ row: y, x: start, count, size, pitch });
  } else if (fragments > 1 && padding) {
    layers.push(surface(bodyX, row, padding, 1, 'accent'));
    if (fragments > 2) layers.push(surface(bodyX + bodyWidth - padding, row, padding, 1, 'accent'));
  }
  const tree = layer(...layers);
  let result = symmetry === 'mirror' ? layer(tree, reflect(tree, x + (width - 1) / 2)) : tree;
  // Negative-space reservations survive later paint and repeated decoration.
  for (const hole of holes) {
    result = cut(result, hole.x, hole.y, hole.width);
    if (symmetry === 'mirror') result = cut(result, x * 2 + width - hole.x - hole.width, hole.y, hole.width);
  }
  return result;
}

export function composeSurface(config) {
  const { height, complexity, glyphs, label = '' } = config;
  const rng = random(config.seed, 'structure:surface');
  const inputRng = random(config.seed, 'structure:surface:input');
  const material = random(config.seed, 'material:surface');
  const finish = random(config.seed, 'material:surface:finish').pick(['solid', 'tinted']);
  const detail = random(config.ornamentSeed ?? config.seed, 'detail:surface');
  const scene = new Scene(height, glyphs);
  const inputRow = height - 1;
  const contourMode = height === 3 && rng.chance(0.46);
  const trailing = height === 1 || contourMode || (height === 3 && rng.chance(0.24));
  const artRows = trailing ? height : height - 1;
  const budget = trailing ? 35 : 57;
  const roles = config.info === false ? [] : [
    { role: 'username', capacity: rng.int(6, 9), min: 4 },
    { role: 'directory', capacity: rng.int(12, 19), min: 6 },
  ];
  if (label || !roles.length) roles.splice(rng.int(0, roles.length), 0, { role: 'label', text: label || 'prompt', capacity: (label || 'prompt').length, min: (label || 'prompt').length });
  const parts = roles.map((role, id) => ({ ...role, id, profile: rng.pick(Object.keys(profiles)), contour: contourMode && (id === 0 || rng.chance(0.75)) ? rng.pick(['capsule', 'roundbox', 'bevel', 'step', 'tab', 'arch']) : null, padding: rng.chance(0.7) ? 1 : 0, filled: rng.chance(0.75), caps: [], satellites: [] }));
  for (const part of parts) if (part.contour && part.profile === 'open') part.profile = 'bar';
  const partWidth = (part) => part.capacity + part.padding * 2 + (part.profile === 'open' ? 0 : 2);
  const totalWidth = () => parts.reduce((sum, part) => sum + partWidth(part), Math.max(0, parts.length - 1));
  while (totalWidth() > budget) {
    const part = parts.filter((p) => p.capacity > p.min).sort((a, b) => b.capacity - b.min - (a.capacity - a.min))[0];
    if (part) { part.capacity--; continue; }
    const padded = parts.find((p) => p.padding);
    if (padded) { padded.padding = 0; continue; }
    const edged = parts.find((p) => p.profile !== 'open');
    if (edged) { edged.profile = 'open'; edged.contour = null; continue; }
    break;
  }

  const relations = [], trees = [], annotations = [];
  const rows = Array.from({ length: artRows }, () => []);
  let previous = null;
  for (const part of parts) {
    part.width = partWidth(part);
    // Relative placement, rather than a named finished layout: a role can sit
    // beside the previous one, begin a new line, or shift on a separate line.
    const relation = previous && !contourMode && artRows > 1 && rng.chance(0.5) ? rng.pick(['below', 'offset', 'align']) : 'after';
    part.row = previous ? relation === 'after' ? previous.row : (previous.row + 1) % artRows : artRows === 3 ? 1 : rng.int(0, artRows - 1);
    part.x = previous && relation === 'after' ? previous.x + previous.width + rng.int(0, trailing ? 1 : Math.max(1, Math.round((config.spread ?? 0.5) * 5))) : relation === 'align' ? previous.x : relation === 'offset' ? rng.int(1, Math.max(1, Math.round((config.spread ?? 0.5) * 8))) : 0;
    if (part.x + part.width > budget) part.x = Math.max(0, budget - part.width);
    // Every piece owns a disjoint rectangle on its text row; stacked parts can
    // share x positions because their caps are clipped against role reservations.
    for (const other of rows[part.row]) if (part.x < other.x + other.width + 1 && part.x + part.width > other.x - 1) part.x = other.x + other.width + 1;
    if (part.x + part.width > budget) {
      part.row = previous.row;
      part.x = previous.x + previous.width + 1;
    }
    rows[part.row].push(part);
    part.fieldX = part.x + (part.profile === 'open' ? 0 : 1) + part.padding;
    relations.push({ op: relation, from: previous?.id ?? null, to: part.id });
    previous = part;
  }

  // A large explicit label can exhaust a one-line budget. Compact the gaps as
  // one atomic packing fallback; capacities and the reserved command area stay
  // valid even for the longest supported label.
  if (parts.some((part) => part.x + part.width > budget)) {
    let x = 0;
    for (const part of parts) {
      part.row = parts[0].row; part.x = x;
      part.fieldX = x + (part.profile === 'open' ? 0 : 1) + part.padding;
      x += part.width + 1;
    }
    relations.push({ op: 'pack', axis: 'x', gap: 1 });
  }

  const reserved = (x, y, owner) => parts.some((p) => p.id !== owner && y === p.row && x >= p.x && x < p.x + p.width);
  const claimed = new Set();
  const colorPairs = material.pick([[2, 3], [3, 4], [4, 2], [2, 4], [1, 3], [3, 2]]);
  const colorMode = material.pick(['alternating', 'alternating', 'shared', 'independent']);
  let painted = 0, filledCells = 0;
  const toneColors = [];
  for (const part of parts) {
    const tree = roleShape(part, rng, config, artRows);
    trees.push(tree);
    const body = colorMode === 'shared' ? colorPairs[0] : colorMode === 'independent' ? material.pick([1, 2, 3, 4]) : colorPairs[part.id % 2];
    const accent = colorPairs[(part.id + 1) % 2];
    const tinted = finish === 'tinted' && part.filled;
    const textInk = body === 1 ? 2 : body;
    const tones = { body: tinted ? 0 : body, accent, detail: 5 };
    toneColors.push({ id: part.id, tones, text: tinted ? textInk : part.filled ? 'contrast' : body });
    for (const cell of rasterizeSurface(tree).values()) {
      if (reserved(cell.x, cell.y, part.id)) continue;
      const key = `${cell.x},${cell.y}`;
      if (claimed.has(key)) continue;
      claimed.add(key); painted++; filledCells += Number(cell.fill);
      const ink = cell.fill ? { fg: 'contrast', bg: tones[cell.tone] } : tones[cell.tone];
      const text = cell.text === 'line' ? materials[config.material][10] : cell.text;
      scene.text(cell.y, left(cell.x), text, ink);
    }
    const ink = part.filled ? { fg: tinted ? textInk : 'contrast', bg: tones.body } : body;
    if (part.role === 'label') scene.text(part.row, left(part.fieldX), part.text, ink);
    else scene.slot(part.row, left(part.fieldX), part.role, part.capacity, ink);
    // A single detail reservation sits in existing padding. Its content changes
    // independently of the complete structural derivation and occupied bounds.
    if (part.padding && !part.filled && complexity >= 4) {
      const text = detail.pick(['·', ':', '-', ' ']);
      const x = part.fieldX - 1;
      scene.text(part.row, left(x), text, accent);
      annotations.push({ role: part.id, x, row: part.row, text });
    }
  }

  const rightmost = Math.max(...parts.map((part) => part.x + part.width));
  const marker = { row: inputRow, x: trailing ? rightmost + 1 : inputRng.int(0, 4), width: 1 };
  const attachments = [];
  if (!trailing && marker.x > 1 && inputRng.chance(config.connectivity ?? 0.3)) {
    scene.text(inputRow, left(0), '└' + '─'.repeat(marker.x - 1), colorPairs[0]);
    attachments.push({ op: 'lead', role: 'input', x: 0, width: marker.x });
  } else if (!trailing && marker.x > 1 && inputRng.chance(0.55)) {
    scene.text(inputRow, left(marker.x - 2), ' ', { fg: 'contrast', bg: colorPairs[1] });
    attachments.push({ op: 'swatch', role: 'input', x: marker.x - 2, width: 1 });
  }
  const pointer = detail.pick(['›', '>', '❯']);
  scene.text(inputRow, left(marker.x), pointer, finish === 'tinted' ? 4 : colorPairs[0]);
  annotations.push({ role: 'input', text: pointer });

  const tree = layer(...trees);
  return {
    scene, cursor: marker.x + 2, rightPrompt: '',
    program: {
      engine: 'surface-composition/1', lattice: { columns: 79, rows: height },
      traits: { material: config.material, symmetry: config.symmetry, density: config.density, spread: config.spread, fragments: config.fragments, connectivity: config.connectivity, colorMode, finish },
      derivation: { roles: parts, relations, geometry: tree, marker, attachments, trailing },
      annotations, tones: toneColors,
      stats: { ...statistics(tree), fragments: parts.length, links: attachments.filter((p) => p.op === 'lead').length, span: rightmost, occupiedCells: painted, filledCells },
    },
  };
}
