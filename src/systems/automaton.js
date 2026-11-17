import { Scene } from '../scene.js';
import { random } from '../random.js';
import { ramp, palette, halfBlocks, braille, emit, fixed, clamp, occupied, grid } from './raster.js';
import { roles, line, paint, marker } from './stage.js';
import { compact } from './compact.js';

// Elementary cellular automata. Time runs away from a source: down from the
// live text, up from the input marker, or rightward out of the text. Even
// rules keep empty space empty, so negative space survives every generation.
const SEEDED = [18, 22, 26, 30, 60, 90, 102, 110, 122, 126, 146, 150, 154, 182];
const RANDOM = [18, 22, 30, 54, 60, 62, 86, 102, 106, 110, 122, 124, 126, 146, 150, 154];

export function evolve(rule, init, generations, wrap = false) {
  const out = [init];
  for (let g = 1; g < generations; g++) {
    const row = out[g - 1], n = row.length;
    out.push(row.map((c, i) => {
      const l = i > 0 ? row[i - 1] : wrap ? row[n - 1] : 0, r = i < n - 1 ? row[i + 1] : wrap ? row[0] : 0;
      return (rule >> (l << 2 | c << 1 | r)) & 1;
    }));
  }
  return out;
}

export function automaton(config) {
  // One to three rows: a strip of generations, seeded where the text is.
  if (config.height <= 3) return compact(config, 'automaton', { kinds: ['automaton'] });
  const seed = config.artSeed ?? config.seed;
  const rng = random(seed, 'structure:automaton');
  const layout = random(config.layoutSeed ?? config.seed, 'structure:automaton:layout');
  const material = random(seed, 'material:automaton');
  const detail = random(config.ornamentSeed ?? config.seed, 'ornament:automaton');
  const { height } = config;
  const colors = palette(config.colors, material);
  const text = roles(config, layout);
  const scene = new Scene(height, config.glyphs);
  const textWidth = text.reduce((sum, r) => sum + r.width + 2, -2);
  const fine = material.chance(0.15);
  const px = fine ? 2 : 1, py = fine ? 4 : 2;
  const rows = height - 1, inputRow = height - 1;
  const flow = layout.pick(['down', 'down', 'up', 'right']);
  // Lay out text before the automaton, so its cells are the sources.
  let cols, start = 0;
  if (flow === 'right') {
    const row = layout.int(0, rows - 1);
    start = line(text, row, 1) + 2;
    cols = layout.int(Math.min(79 - start, 24), height <= 5 ? Math.min(79 - start, 32) : 79 - start);
  } else {
    // Up to five rows the strip stays near the text; taller runs may widen.
    if (flow === 'down') line(text, 0, layout.pick([1, 2, 4]));
    else line(text, inputRow, 1);
    cols = layout.int(Math.min(79, Math.max(40, textWidth + 20)), height <= 5 ? Math.min(79, Math.max(40, textWidth + 24)) : 79);
  }
  const markerX = flow === 'up' ? textWidth + 3 : layout.pick([0, 0, 1]);
  // The lattice: one cell per sub-pixel column (or per sub-pixel row when time
  // runs rightward). Sources come from the text and the marker positions.
  const seeded = rng.chance(flow === 'right' ? 0.3 : 0.6);
  const top = flow === 'down' ? 1 : 0, artRows = flow === 'down' ? rows - 1 : rows;
  const width = flow === 'right' ? artRows * py : cols * px;
  const generations = flow === 'right' ? cols * px : artRows * py;
  const init = Array(width).fill(0);
  if (seeded) {
    if (flow === 'down') {
      const mode = rng.pick(['center', 'ends', 'span']);
      for (const role of text) {
        const a = role.x * px, b = (role.x + role.width) * px - 1;
        if (mode === 'center') init[Math.floor((a + b) / 2)] = 1;
        else if (mode === 'ends') { init[a] = 1; init[b] = 1; }
        else for (let i = a; i <= b; i++) init[i] = rng.chance(0.35) ? 1 : 0;
      }
    } else if (flow === 'up') init[markerX * px] = 1;
    else for (let i = 0; i < width; i += rng.int(2, 6)) init[i] = 1;
  } else for (let i = 0; i < width; i++) init[i] = rng.chance(0.2 + config.density * 0.6) ? 1 : 0;
  // Some rules collapse into a solid bar or die out from a given start. Try
  // a few rules from the same stream and keep the first living texture.
  let rule, history;
  for (let attempt = 0; attempt < 6; attempt++) {
    rule = rng.pick(seeded ? SEEDED : RANDOM);
    history = evolve(rule, init, generations);
    const live = history.flat().filter(Boolean).length / (width * generations);
    if (live > (seeded ? 0.03 : 0.08) && live < 0.62) break;
  }
  // Color follows time: bright at the source, receding into the palette's dark.
  const steps = 4 + Math.floor(config.complexity / 2);
  const inks = ramp([...colors.stops].reverse(), steps);
  const ink = (g) => inks[clamp(Math.floor(g / generations * steps), 0, steps - 1)];
  const sub = grid(flow === 'right' ? generations : width, flow === 'right' ? width : generations);
  for (let g = 0; g < generations; g++) for (let i = 0; i < width; i++) {
    if (!history[g][i]) continue;
    if (flow === 'right') sub[i][g] = ink(g);
    else sub[flow === 'up' ? generations - 1 - g : g][i] = ink(g);
  }
  const cells = fine ? braille(sub) : halfBlocks(sub);
  const place = fixed(0, flow === 'right' ? start : 0);
  emit(scene, cells, place, top);
  paint(scene, text);
  const cursor = marker(scene, inputRow, markerX, detail);
  return {
    scene, cursor, rightPrompt: '',
    program: {
      engine: 'automaton/1',
      traits: { rule, flow, seeded, render: fine ? 'braille' : 'half', palette: colors.family },
      derivation: { columns: cols, generations, lattice: width, roles: text.map(({ role, row, x, width }) => ({ role, row, x, width })) },
      stats: { occupiedCells: occupied(cells), live: history.flat().filter(Boolean).length },
    },
  };
}
