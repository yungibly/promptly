import { Scene, left } from '../scene.js';
import { random } from '../random.js';
import { ramp, mix, palette, silhouettes, halftone, emit, stretch, fixed, smooth, clamp, occupied } from './raster.js';
import { fbm } from './noise.js';
import { roles, line, clearance, paint, marker } from './stage.js';

const SPARK = '▁▂▃▄▅▆▇█';
const contrast = (n, k = 2.2) => clamp(0.5 + (n - 0.5) * k);

// Layered ridges in eighth-block precision. Far layers are drawn first; each
// fades toward the dark ground below its crest, so land dissolves downward.
function horizon(rng, material, { cols, rows, complexity, colors, valley }) {
  // A short band holds one silhouette whose color travels along it.
  const count = rows <= 2 ? 1 : 2 + Math.min(3, Math.floor(rng.next() * (1 + complexity / 2.5)));
  const shape = rng.pick(['smooth', 'ridged', 'dunes', 'swell']);
  const inks = ramp(colors.stops, count + 1).slice(1);
  if (material.chance(0.5)) inks.reverse();
  // Paper-cut layers stay flat; atmospheric layers sink toward the ground.
  const fall = material.chance(0.5) ? 0 : 0.8 + material.next() * 2;
  const layers = Array.from({ length: count }, (_, i) => {
    const noise = fbm(rng, shape === 'ridged' ? 2 + Math.ceil(complexity / 3) : 2);
    const scale = cols / (shape === 'dunes' || shape === 'swell' ? 2 + rng.next() * 4 : 1.2 + rng.next() * 4), phase = rng.next() * 60;
    const top = count === 1 ? 0 : rows * (0.02 + 0.55 * i / count), amp = count === 1 ? rows * 0.95 : rows * (0.75 - 0.35 * i / count);
    const ridge = (x) => {
      let n = contrast(noise(x / scale + phase));
      if (shape === 'ridged') n = 1 - Math.abs(2 * n - 1) ** 0.8;
      if (shape === 'dunes') n = (1 - Math.abs(Math.sin(x / scale * 2 + phase))) * 0.7 + n * 0.3;
      if (shape === 'swell') n = (Math.sin(x / scale * 5 + phase + Math.sin(x / scale * 2)) + 1) / 2 * 0.6 + n * 0.4;
      return Math.max(top + amp * (1 - n), valley(x));
    };
    // Color depends on the row only, so equal neighbors coalesce into runs.
    const color = fall ? (y) => mix(inks[i], colors.ground, clamp(Math.floor(y - top) / (rows * fall / count + 1)) * 0.8) : () => inks[i];
    return { ridge, color };
  });
  // One silhouette travels between two neighboring stops, not the whole ramp.
  const along = count === 1 ? ramp(colors.stops.slice(-2), 10) : null;
  return { traits: { form: 'horizon', shape, layers: count }, layersAt: (x) => layers.map((l) => ({ top: l.ridge(x),
    color: along ? () => along[clamp(Math.floor(x / cols * 10), 0, 9)] : l.color })) };
}

// Ripples as braille halftone: density carries the wave, foreground color
// its strength. They spread from the text (or the input marker) and fade.
function ripples(rng, { cols, rows, text }) {
  const h = rows * 2, c = text ? { x: text.center, y: text.middle } : { x: 1, y: h + 1 };
  const wavelength = 3 + rng.next() * 4, reach = cols * (0.4 + rng.next() * 0.6), sharp = 0.6 + rng.next() * 1.6;
  const second = rng.chance(0.35) ? { x: cols * (0.6 + rng.next() * 0.35), y: rng.next() * h } : null;
  const ring = (p, x, y) => { const d = Math.hypot(x - p.x, (y - p.y) * 1.1); return [((Math.cos(d * 6.283 / wavelength) + 1) / 2) ** sharp, clamp(1.3 - d / reach)]; };
  return { kind: second ? 'interference' : 'rings', value: (x, y) => {
    const [a, fa] = ring(c, x, y);
    if (!second) return a * fa;
    const [b, fb] = ring(second, x, y);
    return Math.max(a * fa, b * fb * 0.8) * (0.6 + 0.4 * a * b);
  } };
}

function sparkline(scene, text, layout, rng, colors, detail) {
  const first = layout.chance(0.7), span = text.reduce((sum, r) => sum + r.width + 2, 0);
  // The strip ends at the input marker and leaves room to type.
  const width = clamp(layout.int(8, 16), 6, 43 - span);
  let x = first ? line(text, 0, 1) + 2 : 1;
  const noise = fbm(rng, 2), scale = 1.5 + rng.next() * 4;
  const values = Array.from({ length: width }, (_, i) => noise(i / scale));
  const lo = Math.min(...values), hi = Math.max(...values), inks = ramp(colors.stops, width);
  emit(scene, [values.map((v, i) => ({ ch: SPARK[Math.round((v - lo) / Math.max(1e-6, hi - lo) * 7)], fg: inks[first ? i : width - 1 - i] }))], fixed(0, x));
  x += width + 2;
  if (!first) x = line(text, 0, x) + 2;
  paint(scene, text);
  return { cursor: marker(scene, 0, x, detail), traits: { form: 'sparkline', palette: colors.family }, derivation: { width } };
}

export function field(config) {
  const seed = config.artSeed ?? config.seed;
  const rng = random(seed, 'structure:field');
  const layout = random(config.layoutSeed ?? config.seed, 'structure:field:layout');
  const material = random(seed, 'material:field');
  const detail = random(config.ornamentSeed ?? config.seed, 'ornament:field');
  const { height, complexity } = config;
  const colors = palette(config.colors, material);
  const text = roles(config, layout);
  const scene = new Scene(height, config.glyphs);
  if (height === 1) {
    const result = sparkline(scene, text, layout, rng, colors, detail);
    return { scene, cursor: result.cursor, rightPrompt: '', program: { engine: 'field/1', traits: result.traits, derivation: result.derivation, stats: { occupiedCells: result.derivation.width } } };
  }
  const rows = height - 1, inputRow = height - 1;
  // The form decides the canvas and text placement, so it is a layout choice.
  const form = rows >= 4 && layout.chance(0.3) ? 'ripples' : 'horizon';
  // A short band leaves its rows to the land and keeps the text at the input.
  const mode = rows <= 2 || layout.chance(form === 'horizon' ? 0.45 : 0.2) ? 'inline' : 'inside';
  const textWidth = text.reduce((sum, r) => sum + r.width + 2, -2);
  let place, cols;
  if (form === 'horizon') {
    const from = layout.chance(0.75) ? 0 : layout.int(80, 300), to = layout.chance(0.65) ? 1000 : layout.int(Math.max(from + 450, 700), 1000);
    // Text inside the land must fit within it; otherwise the land spans the row.
    place = stretch(from, to);
    if (mode === 'inside' && place.columns < textWidth + 4) place = stretch(0, 1000);
    cols = place.columns;
  } else {
    // The dot lattice stays exact, so ripples do not stretch; they are
    // anchored to the left edge, the center, or the right edge instead.
    cols = layout.int(Math.min(79, Math.max(48, textWidth + 20)), 79);
    const side = layout.pick(['left', 'left', 'center', 'right']);
    place = side === 'left' ? fixed(0, 0) : side === 'center' ? fixed(500, -Math.floor(cols / 2)) : fixed(1000, 1 - cols);
  }
  if (mode === 'inline') line(text, inputRow, 1);
  else line(text, form === 'horizon' ? 0 : layout.int(0, rows - 1), layout.pick([1, 2, 3, layout.int(1, Math.max(1, cols - textWidth - 1))]));
  const inside = mode === 'inside' ? text : [];
  const near = clearance(inside, 1);
  const right = Math.max(...inside.map((r) => r.x + r.width), 0);
  const info = inside.length ? { center: (inside[0].x + right) / 2, middle: inside[0].row * 2 + 1, right } : null;
  const reach = 2 + rng.next() * 8;
  let cells, traits;
  if (form === 'horizon') {
    // A valley opens under text in the sky; at ground level it simply rests.
    const valley = info ? (x) => (inside[0].row + 1.25) * (1 - smooth(1, 4 + reach, near(x, inside[0].row * 2 + 1))) : () => 0;
    // Mirror symmetry becomes still water: solid land above the waterline and
    // a dotted reflection below it, broken by ripples and fading with depth.
    const water = config.symmetry === 'mirror' && rows >= 4 ? Math.floor(rows * 0.4) : 0, sky = rows - water;
    const land = horizon(rng, material, { cols, rows: sky, complexity, colors, valley });
    cells = silhouettes(cols, sky, land.layersAt);
    if (water) {
      const inks = ramp([colors.ground, ...colors.stops], 6).slice(1);
      cells.push(...halftone(cols, water, (x, y) => {
        const depth = y / 2, layers = land.layersAt(x + Math.sin(y * 1.9 + x * 0.15) * 0.9);
        const index = layers.findLastIndex((layer) => sky - depth >= layer.top);
        return index < 0 ? 0 : (0.2 + 0.45 * (index + 1) / layers.length) * (1 - depth / (water + 1));
      }, (v) => inks[clamp(Math.floor(v * 5), 0, 4)]));
    }
    traits = { ...land.traits, water };
  } else {
    const field = ripples(rng, { cols, rows, text: info });
    // Density already carries the value; inks stay in the luminous half.
    const steps = 3 + Math.floor(complexity / 3), inks = ramp([colors.stops[1], ...colors.stops.slice(2), colors.accents[1]], steps);
    const gain = 1.2 + (config.weight ?? 0.5) * 0.8, edge = Math.max(4, cols * 0.12);
    const value = (x, y) => {
      if (inside.length && near(x, y) < 1.2) return 0;
      return clamp(field.value(x, y) * gain * smooth(1.2, 1.2 + reach, inside.length ? near(x, y) : 99)
        * (place.at(0).at === 0 ? 1 : smooth(0, edge, x)) * (place.at(0).at === 1000 ? 1 : smooth(cols, cols - edge, x)));
    };
    cells = halftone(cols, rows, value, (v) => inks[clamp(Math.floor(v * steps), 0, steps - 1)]);
    traits = { form: 'ripples', kind: field.kind, steps };
  }
  for (const role of inside) for (let x = role.x - 1; x <= role.x + role.width; x++) if (cells[role.row]?.[x]) cells[role.row][x] = null;
  emit(scene, cells, place);
  paint(scene, text, (role) => role.row === inputRow ? left(role.x) : place.at(role.x));
  const markerX = mode === 'inline' ? Math.max(...text.map((r) => r.x + r.width), 0) + 2 : layout.pick([0, 0, 1]);
  const cursor = marker(scene, inputRow, markerX, detail);
  return {
    scene, cursor, rightPrompt: '',
    program: {
      engine: 'field/1',
      traits: { ...traits, mode, palette: colors.family },
      derivation: { columns: cols, rows, roles: text.map(({ role, row, x, width }) => ({ role, row, x, width })) },
      stats: { occupiedCells: occupied(cells) },
    },
  };
}
