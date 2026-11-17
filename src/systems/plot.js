import { Scene, left } from '../scene.js';
import { random } from '../random.js';
import { ramp, palette, braille, emit, fixed, clamp, smooth, occupied, grid } from './raster.js';
import { fbm } from './noise.js';
import { roles, line, clearance, paint, marker } from './stage.js';
import { compact } from './compact.js';

// Pen plots on the braille lattice: stacked ridgelines with hidden-line
// occlusion, damped harmonograph orbits around the text, and oscilloscope
// traces. A dot inside a text window is never drawn; curves pass behind it.

function trace(sub, points, ink, blocked) {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 1.5));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n);
      if (y >= 0 && y < sub.length && x >= 0 && x < sub[0].length && !blocked(x, y)) sub[y][x] = ink(i / points.length, x, y);
    }
  }
}

function ridgelines(rng, { w, h, sub, inks, blocked, quiet, complexity }) {
  const count = clamp(Math.floor(h / rng.int(3, 5)), 2, 9);
  const peaks = Array.from({ length: rng.int(1, 3) }, () => ({ x: w * (0.15 + rng.next() * 0.7), r: w * (0.12 + rng.next() * 0.2) }));
  const noise = fbm(rng, 2 + Math.floor(complexity / 4)), amp = h * (0.25 + rng.next() * 0.35), scale = 3 + rng.next() * 8;
  const horizon = Array(w).fill(Infinity);
  // Front lines (lower) first; a line behind is visible only above them.
  for (let i = count - 1; i >= 0; i--) {
    const base = h * (0.35 + 0.6 * i / Math.max(1, count - 1));
    let previous = null;
    for (let x = 0; x < w; x++) {
      const bump = peaks.reduce((sum, p) => sum + Math.exp(-(((x - p.x) / p.r) ** 2)), 0);
      // A restless baseline everywhere, and the signal where the peaks rise.
      const lift = (0.08 + clamp(bump) * 0.92) * (0.3 + noise(x / scale, i * 3.7) * 1.4) * quiet(x);
      const y = clamp(Math.round(base - amp * lift), 0, h - 1);
      // Flat stretches stay quiet; the signal brightens where it rises.
      const ink = inks[clamp(Math.round(clamp(lift) * (inks.length - 1)), 0, inks.length - 1)];
      if (y < horizon[x]) {
        const from = previous !== null && Math.abs(previous - y) > 1 ? previous : y;
        for (let k = Math.min(from, y); k <= Math.max(from, y); k++) if (k < horizon[x] && !blocked(x, k)) sub[k][x] = ink;
      }
      previous = y;
      horizon[x] = Math.min(horizon[x], y);
    }
  }
  return { form: 'ridgelines', lines: count };
}

function harmonograph(rng, { w, h, sub, inks, blocked, center, complexity }) {
  const rx = w / 2 - 1, ry = h / 2 - 0.5;
  const f1 = rng.int(1, 4), f2 = f1 + rng.pick([1, 1, 2, 3]), detune = (rng.next() - 0.5) * 0.04;
  const p1 = rng.next() * 6.28, p2 = rng.next() * 6.28, decay = 0.001 + rng.next() * 0.003, turns = 3 + complexity;
  const points = [];
  for (let t = 0; t < turns * 6.283; t += 0.02) {
    const d = Math.exp(-decay * t * 60);
    points.push([center.x + rx * d * Math.sin(f1 * t + p1), center.y + ry * d * Math.sin((f2 + detune) * t + p2)]);
  }
  trace(sub, points, (t) => inks[clamp(Math.floor(t * inks.length), 0, inks.length - 1)], blocked);
  return { form: 'harmonograph', ratio: `${f1}:${f2}` };
}

function oscilloscope(rng, { w, h, sub, inks, blocked }) {
  const waves = rng.int(1, 2), carrier = 2 + rng.next() * 10, beat = rng.next() * 2;
  for (let k = 0; k < waves; k++) {
    const phase = rng.next() * 6.28, amp = (h / 2 - 0.6) * (k ? 0.5 : 1);
    const points = Array.from({ length: w * 2 }, (_, i) => {
      const x = i / 2, t = x / w;
      return [x, h / 2 - 0.5 + amp * Math.sin(t * carrier * 6.283 + phase) * Math.sin(t * Math.PI) ** 0.6 * (1 - beat * 0.4 * (1 + Math.cos(t * beat * 6.283)) / 2)];
    });
    trace(sub, points, (t) => inks[clamp(Math.floor(t * inks.length), 0, inks.length - 1)], blocked);
  }
  return { form: 'oscilloscope', waves };
}

export function plot(config) {
  // One to three rows: a braille wave beside the text, or a small harmonograph.
  // One to three rows: a single clean trace, two dots thick, its ink running
  // along a gradient; it sits beside or above the text, never cut through.
  if (config.height <= 3) return compact(config, 'plot', { kinds: ['trace'], arrangements: ['trail', 'beside', 'above'], fades: false, art: (kind, rng, options) => {
    const w = options.width * 2, h = options.rows * 4, sub = grid(w, h);
    const inks = ramp([options.colors.stops[1], options.colors.stops.at(-1), options.colors.text], 8);
    const cycles = 0.8 + rng.next() * (1 + options.detail * 2), phase = rng.next() * 6.283, amp = (h - 2) / 2;
    let last = null;
    for (let x = 0; x < w; x++) {
      const y = Math.round((h - 2) / 2 + amp * Math.sin(x / w * cycles * 6.283 + phase));
      for (let k = Math.min(y, last ?? y); k <= Math.max(y, last ?? y) + 1; k++) sub[clamp(k, 0, h - 1)][x] = inks[Math.min(7, Math.floor(x / w * 8))];
      last = y;
    }
    return braille(sub);
  } });
  const seed = config.artSeed ?? config.seed;
  const rng = random(seed, 'structure:plot');
  const layout = random(config.layoutSeed ?? config.seed, 'structure:plot:layout');
  const material = random(seed, 'material:plot');
  const detail = random(config.ornamentSeed ?? config.seed, 'ornament:plot');
  const { height, complexity } = config;
  const colors = palette(config.colors, material);
  const text = roles(config, layout);
  const scene = new Scene(height, config.glyphs);
  const textWidth = text.reduce((sum, r) => sum + r.width + 2, -2);
  const inks = ramp(material.chance(0.5) ? colors.stops.slice(1) : [...colors.stops].reverse().slice(0, -1), 6);
  const rows = height - 1, inputRow = height - 1;
  // The form decides where the text sits, so it is a layout choice.
  const form = layout.pick(['ridgelines', 'ridgelines', 'harmonograph', 'oscilloscope']);
  let cols, place, inside;
  if (form === 'harmonograph') {
    // The orbit is centered on the text, which sits at its quiet middle.
    cols = clamp(textWidth + layout.int(16, 40), 30, 79);
    const side = layout.pick(['left', 'left', 'center']);
    place = side === 'left' ? fixed(0, 0) : fixed(500, -Math.floor(cols / 2));
    inside = true;
    line(text, Math.floor(rows / 2), Math.floor((cols - textWidth) / 2));
  } else {
    cols = layout.int(Math.min(79, Math.max(36, textWidth + 20)), 79);
    place = layout.chance(0.7) || cols > 70 ? fixed(0, 0) : fixed(1000, 1 - cols);
    inside = form === 'ridgelines' ? layout.chance(0.5) : false;
    if (inside) line(text, 0, layout.pick([1, 2, 3]));
    else line(text, inputRow, 1);
  }
  const w = cols * 2, h = rows * 4, sub = grid(w, h);
  const art = inside ? text : [];
  const near = clearance(art, 1);
  const blocked = (x, y) => art.length > 0 && near(x / 2 + 0.25, y / 2 + 0.25) < 0.6;
  const center = { x: art.length ? (art[0].x + textWidth / 2) * 2 : w / 2, y: h / 2 };
  const quiet = (x) => art.length ? smooth(2, 10, near(x / 2, 1)) : 1;
  const traits = form === 'ridgelines' ? ridgelines(rng, { w, h, sub, inks, blocked, quiet, complexity })
    : form === 'harmonograph' ? harmonograph(rng, { w, h, sub, inks, blocked, center, complexity })
      : oscilloscope(rng, { w, h, sub, inks, blocked });
  const cells = braille(sub);
  for (const role of art) for (let x = role.x - 1; x <= role.x + role.width; x++) if (cells[role.row]?.[x]) cells[role.row][x] = null;
  emit(scene, cells, place);
  paint(scene, text, (role) => role.row === inputRow ? left(role.x) : place.at(role.x));
  const markerX = inside ? layout.pick([0, 0, 1]) : textWidth + 3;
  const cursor = marker(scene, inputRow, markerX, detail);
  return {
    scene, cursor, rightPrompt: '',
    program: {
      engine: 'plot/1',
      traits: { ...traits, palette: colors.family },
      derivation: { columns: cols, rows, inside, roles: text.map(({ role, row, x, width }) => ({ role, row, x, width })) },
      stats: { occupiedCells: occupied(cells) },
    },
  };
}
