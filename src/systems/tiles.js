import { Scene, left } from '../scene.js';
import { random } from '../random.js';
import { materials } from '../ornaments.js';
import { ramp, mix, palette, emit, fixed, smooth, clamp, occupied, grid } from './raster.js';
import { fbm } from './noise.js';
import { roles, line, clearance, paint, marker } from './stage.js';

// Tile fields: every cell chooses a tile from local rules, and the pattern
// emerges from neighbors agreeing. Contours use marching squares on corner
// values, so every line continues into the next cell. The maze is the classic
// diagonal 10-PRINT.
const N = 1, E = 2, S = 4, W = 8;

// A smooth field sampled at cell corners (square units). The live text sits on
// a plateau, so contour lines ring it instead of running through it.
function terrain(rng, cols, rows, complexity, fragments) {
  const source = rng.pick(['noise', 'strata', 'strata', 'peaks']);
  if (source === 'strata') {
    // Sediment: mostly a function of depth, folded by low-frequency noise.
    const n = fbm(rng, 2), fold = 0.2 + rng.next() * 0.5, scale = 8 + rng.next() * 20;
    return { source, f: (x, y) => clamp(y / (rows * 2) * 0.9 + (n(x / scale, y / 9) - 0.5) * fold * 2 + 0.05) };
  }
  if (source === 'noise') {
    const n = fbm(rng, 1 + Math.floor(complexity / 5)), scale = 9 + rng.next() * 22;
    return { source, f: (x, y) => clamp(0.5 + (n(x / scale, y / scale) - 0.5) * 2.4) };
  }
  const peaks = Array.from({ length: clamp(fragments, 1, 4) }, () => ({ x: rng.next() * cols, y: rng.next() * rows * 2, r: rows + rng.next() * cols / 3 }));
  return { source, f: (x, y) => clamp(peaks.reduce((sum, p) => sum + Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / (p.r * p.r)), 0)) };
}

export function tiles(config) {
  const seed = config.artSeed ?? config.seed;
  const rng = random(seed, 'structure:tiles');
  const layout = random(config.layoutSeed ?? config.seed, 'structure:tiles:layout');
  const material = random(seed, 'material:tiles');
  const detail = random(config.ornamentSeed ?? config.seed, 'ornament:tiles');
  const { height, complexity } = config;
  const colors = palette(config.colors, material);
  const text = roles(config, layout);
  const scene = new Scene(height, config.glyphs);
  const rows = height - 1, inputRow = height - 1;
  const kind = rows >= 3 ? rng.pick(['contours', 'contours', 'contours', 'maze']) : 'maze';
  const textWidth = text.reduce((sum, r) => sum + r.width + 2, -2);
  const cols = layout.int(Math.min(79, Math.max(44, textWidth + 18)), 79);
  const side = cols > 70 ? 'left' : layout.pick(['left', 'left', 'center', 'right']);
  const place = side === 'left' ? fixed(0, 0) : side === 'center' ? fixed(500, -Math.floor(cols / 2)) : fixed(1000, 1 - cols);
  const inside = rows > 1 && layout.chance(0.7);
  if (inside) line(text, layout.int(0, rows - 1), layout.pick([1, 2, layout.int(1, Math.max(1, cols - textWidth - 1))]));
  else line(text, inputRow, 1);
  const art = inside ? text : [];
  const near = clearance(art, 1);
  // Density field: where tiles may appear. Text keeps a clearing; the region
  // can dissolve toward one side, gather in an ellipse, or fill the canvas.
  const choice = rng.pick(['full', 'fade', 'fade', 'ellipse', 'halo']), mask = choice === 'halo' && !art.length ? 'full' : choice;
  const reach = 2 + rng.next() * 10, flip = rng.chance(0.5);
  const fill = 0.5 + config.density * 0.8;
  const density = (x, y) => {
    let d = fill;
    if (mask === 'fade') d *= smooth(0, 1, flip ? 1 - x / cols : x / cols) * 1.4;
    if (mask === 'ellipse') d *= 1.3 * smooth(1, 0.55, Math.hypot((x - cols / 2) / (cols / 2), (y - rows) / Math.max(1, rows)));
    if (mask === 'halo') d *= 1.4 * smooth(reach * 3, reach, near(x, y));
    return art.length ? d * smooth(1.5, 1.5 + reach * 0.6, near(x, y)) : d;
  };
  let cells = grid(cols, rows), traits;
  if (kind === 'contours') {
    const land = terrain(rng, cols, rows, complexity, config.fragments ?? 3);
    const bands = 2 + Math.floor(complexity / 3) + rng.int(0, 1);
    const value = (x, y) => {
      const v = land.f(x, y) * clamp(density(x, y) * 1.5);
      return art.length ? v + (1.02 - v) * smooth(reach + 3, 1.5, near(x, y)) : v;
    };
    const band = Array.from({ length: rows + 1 }, (_, y) => Array.from({ length: cols + 1 }, (_, x) => Math.min(bands, Math.floor(value(x, y * 2) * bands))));
    const inks = ramp(colors.stops, bands + 1);
    // Hypsometric tint: optionally shade the bands between the lines.
    const tint = material.chance(0.3 * (config.weight ?? 0.5) + 0.1) ? ramp([colors.ground, mix(colors.ground, colors.stops[1], 0.45)], bands + 2).slice(1) : null;
    const glyphs = materials[material.chance(0.7) ? 'rounded' : config.material ?? 'rounded'];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const [a, b, c, d] = [band[y][x], band[y][x + 1], band[y + 1][x + 1], band[y + 1][x]];
      const bits = (a !== b ? N : 0) | (b !== c ? E : 0) | (c !== d ? S : 0) | (d !== a ? W : 0);
      const top = Math.max(a, b, c, d), low = Math.min(a, b, c, d);
      if (bits) cells[y][x] = tint && low > 0 ? { ch: glyphs[bits], fg: inks[top], bg: tint[low] } : { ch: glyphs[bits], fg: inks[top] };
      else if (tint && low > 0) cells[y][x] = { ch: ' ', bg: tint[low] };
    }
    traits = { kind, source: land.source, bands, tint: !!tint };
  } else {
    const bias = 0.5 + (rng.next() - 0.5) * 0.6;
    const inks = ramp(colors.stops, 6), along = material.pick(['x', 'distance', 'random']);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (rng.next() > density(x + 0.5, y * 2 + 1) * 1.3) continue;
      const t = along === 'x' ? x / cols : along === 'distance' ? clamp(near(x, y * 2 + 1) / (reach * 3)) : material.next();
      cells[y][x] = { ch: rng.next() < bias ? '╱' : '╲', fg: inks[clamp(Math.floor(t * 6), 0, 5)] };
    }
    traits = { kind, bias: +bias.toFixed(3), color: along };
  }
  for (const role of art) for (let x = role.x - 1; x <= role.x + role.width; x++) if (cells[role.row]?.[x]) cells[role.row][x] = null;
  emit(scene, cells, place);
  paint(scene, text, (role) => role.row === inputRow ? left(role.x) : place.at(role.x));
  const markerX = inside ? layout.pick([0, 0, 1]) : Math.max(...text.map((r) => r.x + r.width), 0) + 2;
  const cursor = marker(scene, inputRow, markerX, detail);
  return {
    scene, cursor, rightPrompt: '',
    program: {
      engine: 'tiles/1',
      traits: { ...traits, mask, side, palette: colors.family },
      derivation: { columns: cols, rows, inside, roles: text.map(({ role, row, x, width }) => ({ role, row, x, width })) },
      stats: { occupiedCells: occupied(cells) },
    },
  };
}
