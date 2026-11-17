import { Scene } from '../scene.js';
import { random } from '../random.js';
import { ramp, palette, braille, halfBlocks, emit, fixed, clamp, occupied, grid } from './raster.js';
import { roles, line, paint, marker } from './stage.js';

// Growth on the braille dot lattice (two by four dots per cell, square in
// practice). Branches rise from the input marker or the text; frost (diffusion-
// limited aggregation) crystallizes on the text's outline or on the ground.
// Text windows are obstacles: a branch that reaches one stops there.

function branches(rng, { w, h, roots, blocked, complexity, spread, thick }) {
  const dots = [];
  const depthLimit = 3 + Math.floor(complexity / 2);
  const grow = (x, y, angle, length, depth) => {
    let px = x, py = y;
    const bend = (rng.next() - 0.5) * 0.08;
    for (let i = 0; i < length; i++) {
      angle += bend + (rng.next() - 0.5) * 0.12;
      // A shallow canvas turns growth sideways: branches glance off the top
      // and bottom like a vine, and stop at the sides or at a text window.
      if (py + Math.sin(angle) < 0 || py + Math.sin(angle) >= h) angle = -angle;
      const nx = px + Math.cos(angle), ny = clamp(py + Math.sin(angle), 0, h - 1);
      if (nx < 0 || nx >= w || blocked(nx, ny)) return;
      px = nx; py = ny;
      // A two-dot brush keeps the pen line visible; the trunk is wider still.
      for (const [dx, dy] of depth < thick ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0], [1, 0]]) dots.push({ x: Math.round(px) + dx, y: Math.round(py) + dy, depth });
    }
    if (depth >= depthLimit || length < 2) { dots.push({ x: Math.round(px), y: Math.round(py), depth, tip: true }); return; }
    const children = rng.chance(0.25) ? 3 : rng.chance(0.85) ? 2 : 1;
    for (let c = 0; c < children; c++) {
      const turn = children === 1 ? (rng.next() - 0.5) * spread : (c / (children - 1) - 0.5) * spread * 2 + (rng.next() - 0.5) * 0.3;
      grow(px, py, angle + turn, length * (0.62 + rng.next() * 0.28), depth + 1);
    }
  };
  for (const root of roots) grow(root.x, root.y, root.angle, root.length, 0);
  return dots;
}

function frost(rng, { w, h, seeds, blocked, particles, stick }) {
  const stuck = new Map(), key = (x, y) => y * w + x;
  seeds.forEach((s) => stuck.set(key(s.x, s.y), { ...s, depth: 0 }));
  const near = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && stuck.has(key(x + dx, y + dy))) return stuck.get(key(x + dx, y + dy));
    return null;
  };
  const dots = [...stuck.values()];
  // Walkers start close to the aggregate's bounding box, keeping work bounded.
  for (let p = 0; p < particles; p++) {
    const anchor = dots[rng.int(0, dots.length - 1)];
    let x = clamp(anchor.x + rng.int(-12, 12), 0, w - 1), y = clamp(anchor.y + rng.int(-10, 10), 0, h - 1);
    for (let step = 0; step < 400; step++) {
      if (!stuck.has(key(x, y)) && !blocked(x, y)) {
        const parent = near(x, y);
        if (parent && rng.next() < stick) {
          const dot = { x, y, depth: parent.depth + 1 };
          stuck.set(key(x, y), dot); dots.push(dot); break;
        }
      }
      const dir = rng.int(0, 3);
      x = clamp(x + (dir === 0 ? 1 : dir === 1 ? -1 : 0), 0, w - 1);
      y = clamp(y + (dir === 2 ? 1 : dir === 3 ? -1 : 0), 0, h - 1);
    }
  }
  return dots;
}

export function growth(config) {
  const seed = config.artSeed ?? config.seed;
  const rng = random(seed, 'structure:growth');
  const layout = random(config.layoutSeed ?? config.seed, 'structure:growth:layout');
  const material = random(seed, 'material:growth');
  const detail = random(config.ornamentSeed ?? config.seed, 'ornament:growth');
  const { height, complexity } = config;
  const colors = palette(config.colors, material);
  const text = roles(config, layout);
  const scene = new Scene(height, config.glyphs);
  const rows = height - 1, inputRow = height - 1;
  const textWidth = text.reduce((sum, r) => sum + r.width + 2, -2);
  // Frost is a bold half-block coral; branches are a fine braille pen line.
  // The kind of growth decides where the text sits, so it belongs to layout:
  // a layout pin keeps vines or coral while their shapes reroll.
  const kind = layout.pick(['branches', 'frost']), fine = kind === 'branches';
  // Frost always rises from the ground; text above it is an obstacle it
  // reaches toward. Branches leave the marker or the ends of the text line.
  const source = kind === 'frost' ? 'ground' : layout.chance(0.5) ? 'text' : 'marker';
  const above = kind === 'frost' && layout.chance(0.5);
  let markerX;
  if (source === 'text' || above) {
    line(text, above ? 0 : layout.int(0, rows - 1), layout.pick([2, 4, layout.int(2, Math.max(2, 40 - textWidth))]));
    markerX = layout.pick([0, 0, 1]);
  } else {
    line(text, inputRow, 1);
    markerX = textWidth + 3;
  }
  const cols = Math.min(79, Math.max(48, layout.int(textWidth + 24, 79)));
  const sx = fine ? 2 : 1, sy = fine ? 4 : 2, w = cols * sx, h = rows * sy;
  // Text rows are art rows only when the text sits inside the canvas.
  const windows = text.filter((r) => r.row < rows).map((r) => ({ x0: (r.x - 1) * sx, x1: (r.x + r.width + 1) * sx, y0: r.row * sy, y1: r.row * sy + sy }));
  const blocked = (x, y) => windows.some((b) => x >= b.x0 - 1 && x < b.x1 + 1 && y >= b.y0 - 1 && y < b.y1 + 1);
  let dots;
  if (kind === 'branches') {
    const roots = [];
    if (source === 'marker') roots.push({ x: markerX * 2 + 1, y: h - 1, angle: -Math.PI / 2 + 0.2 + rng.next() * 0.6, length: Math.max(h * 0.7, 12) * (0.8 + rng.next() * 0.6) });
    else {
      // Tendrils leave the ends of the text line and travel outward.
      const first = windows[0], last = windows.at(-1), mid = first.y0 + 2;
      roots.push({ x: last.x1 + 1, y: mid, angle: (rng.next() - 0.5) * 0.9, length: 10 + rng.next() * 16 });
      if (first.x0 > 12 && rng.chance(0.6)) roots.push({ x: first.x0 - 2, y: mid, angle: Math.PI + (rng.next() - 0.5) * 0.9, length: 6 + rng.next() * 8 });
    }
    dots = branches(rng, { w, h, roots, blocked, complexity, spread: 0.4 + rng.next() * 0.6, thick: 2 });
  } else {
    const seeds = [], gap = rng.int(3, 8);
    for (let x = rng.int(0, gap); x < w; x += gap + rng.int(0, gap * 2)) seeds.push({ x, y: h - 1 });
    dots = frost(rng, { w, h, seeds, blocked, particles: Math.round(w * h * (0.15 + config.density * 0.35)), stick: 0.3 + rng.next() * 0.6 });
  }
  const depth = Math.max(1, ...dots.map((d) => d.depth));
  const steps = 5, bright = [colors.stops.at(-2) ?? colors.stops[0], colors.stops.at(-1), colors.text];
  const inks = ramp(material.chance(0.5) ? bright : [...bright].reverse(), steps);
  const bloom = detail.chance(0.6) ? colors.accents[detail.int(0, 2)] : null;
  const sub = grid(w, h);
  for (const d of dots) if (d.x >= 0 && d.x < w && d.y >= 0 && d.y < h) sub[d.y][d.x] = d.tip && bloom ? bloom : inks[clamp(Math.floor(d.depth / (depth + 1) * steps), 0, steps - 1)];
  const cells = fine ? braille(sub, (color) => color === bloom ? 9 : inks.indexOf(color)) : halfBlocks(sub);
  emit(scene, cells, fixed(0, 0));
  paint(scene, text);
  const cursor = marker(scene, inputRow, markerX, detail);
  return {
    scene, cursor, rightPrompt: '',
    program: {
      engine: 'growth/1',
      traits: { kind, source, above, palette: colors.family, bloom: !!bloom },
      derivation: { columns: cols, rows, dots: dots.length, depth, roles: text.map(({ role, row, x, width }) => ({ role, row, x, width })) },
      stats: { occupiedCells: occupied(cells) },
    },
  };
}
