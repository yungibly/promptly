import { Scene } from '../scene.js';
import { random } from '../random.js';
import { palette, emit, fixed, clamp, occupied } from './raster.js';
import { texture } from './texture.js';
import { roles, line, paint, marker } from './stage.js';

// The primary form of every version-8 system: live text and one bounded
// piece of art share one to three rows. The art attaches to the text (never
// more than about forty cells of it at 80 columns) and the input row holds
// only the marker, or the text and the marker. Arrangements:
//   trail    text, then art, then the marker (one row)
//   lead     art, then text, then the marker (one row)
//   beside   text with art after it; the marker below
//   above    art over the text; text and marker on the input row
//   through  art running through the text line, the text knocked out of it
//   bed      text on a gradient bed that dissolves past it
const ARRANGEMENTS = { 1: ['trail', 'trail', 'lead', 'through'], 2: ['beside', 'above', 'above', 'through'], 3: ['beside', 'above', 'through'] };

export function compact(config, name, { kinds, art = texture, bed = false }) {
  const seed = config.artSeed ?? config.seed;
  const rng = random(seed, `structure:${name}`);
  const layout = random(config.layoutSeed ?? config.seed, `structure:${name}:layout`);
  const material = random(seed, `material:${name}`);
  const detail = random(config.ornamentSeed ?? config.seed, `ornament:${name}`);
  const { height } = config, ascii = config.glyphs === 'ascii';
  const colors = palette(config.colors, material);
  const text = roles(config, layout);
  const scene = new Scene(height, config.glyphs);
  const choices = [...ARRANGEMENTS[height], ...(bed && height <= 2 ? ['bed'] : [])];
  const arrangement = layout.pick(choices);
  const tw = text.reduce((sum, r) => sum + r.width + 2, -2);
  const last = height - 1;
  let box, anchor, fade, markerX, textRow;
  if (arrangement === 'trail') {
    textRow = 0; line(text, 0, 1);
    box = { x: tw + 3, y: 0, width: clamp(layout.int(8, 16), 6, 44 - tw), rows: 1 };
    anchor = 0; fade = layout.pick(['none', 'right']); markerX = box.x + box.width + 1;
  } else if (arrangement === 'lead') {
    const width = layout.int(6, 10);
    textRow = 0; line(text, 0, width + 2);
    box = { x: 0, y: 0, width, rows: 1 };
    anchor = width - 1; fade = layout.pick(['none', 'left']); markerX = width + 2 + tw + 2;
  } else if (arrangement === 'beside') {
    textRow = height === 3 ? layout.int(0, 1) : 0; line(text, textRow, 1);
    box = { x: tw + 3, y: 0, width: clamp(layout.int(12, 30), 8, 76 - tw), rows: height - 1 };
    anchor = 0; fade = layout.pick(['none', 'right', 'right']); markerX = layout.pick([0, 1]);
  } else if (arrangement === 'above') {
    textRow = last; line(text, last, 1);
    box = { x: layout.pick([0, 1, 2]), y: 0, width: clamp(tw + layout.int(-6, 10), 16, 40), rows: height - 1 };
    // Grow from the text's start or end, and never dissolve that side.
    const end = layout.chance(0.5);
    anchor = end ? box.width - 1 : 0; fade = layout.pick(['none', end ? 'left' : 'right']); markerX = tw + 3;
  } else if (arrangement === 'through') {
    const rows = Math.max(1, height - 1), start = layout.int(2, 4);
    textRow = height === 1 ? 0 : layout.int(0, rows - 1); line(text, textRow, start);
    box = { x: 0, y: 0, width: clamp(start + tw + layout.int(10, 20), 0, height === 1 ? 46 : 64), rows };
    anchor = Math.floor(start + tw / 2); fade = 'right'; markerX = height === 1 ? box.width + 1 : layout.pick([0, 1]);
  } else {
    // The bed is brightest under the first field and darkens toward the ground.
    textRow = 0; line(text, 0, 1);
    box = { x: 0, y: 0, width: tw + 2 + layout.int(4, 10), rows: 1 };
    anchor = 0; fade = 'none'; markerX = height === 1 ? box.width + 1 : layout.pick([0, 1]);
  }
  // Kinds may depend on the art's row count. Art running through the text
  // has no anchor: the knocked-out text would hide whatever grew from it.
  const kind = arrangement === 'bed' ? 'gradient' : rng.pick(typeof kinds === 'function' ? kinds(box.rows) : kinds);
  if (arrangement === 'through') anchor = undefined;
  if (kind === 'dissolve') fade = 'none';
  // Complexity adds detail to the art without changing its box.
  const level = (config.complexity - 1) / 9;
  const halo = (x, y) => box.y + y === textRow && text.some((role) => box.x + x >= role.x - 1 && box.x + x <= role.x + role.width);
  const area = box.width * box.rows - (arrangement === 'bed' ? 0 : Array.from({ length: box.width }, (_, x) => halo(x, textRow - box.y)).filter(Boolean).length);
  const draw = (options) => {
    const cells = art(kind, rng, { width: box.width, rows: box.rows, colors, ascii, fade, anchor, detail: level, ...options });
    // Knock the text out of the art with a one-cell halo.
    if (arrangement !== 'bed') cells.forEach((line, y) => line.forEach((_, x) => { if (halo(x, y)) line[x] = null; }));
    return cells;
  };
  // A fade, an anchor, or the knocked-out text must not leave only a speck:
  // redraw whole and unanchored when too little of the art remains.
  let cells = draw();
  if (occupied(cells) < Math.max(3, Math.round(area * 0.2))) cells = draw({ fade: 'none', anchor: undefined });
  if (arrangement === 'bed') {
    // Each live field takes the bed's color where it starts; the slot then
    // carries that background across its whole reservation. Behind and
    // between the text the bed is flat; its lit top edge begins past it.
    const flat = (x) => cells[0][x]?.bg ?? cells[0].slice(0, x + 1).reverse().find(Boolean)?.bg ?? colors.ground;
    for (const role of text) role.ink = { fg: role.ink, bg: flat(role.x) };
    for (let x = 0; x <= Math.min(cells[0].length - 1, tw + 1); x++) if (cells[0][x]) cells[0][x] = { ch: ' ', bg: cells[0][x].bg };
  }
  // On a single row the marker follows both the art and the text.
  if (height === 1) markerX = Math.max(markerX, ...text.map((r) => r.x + r.width + 2));
  emit(scene, cells, fixed(0, box.x), box.y);
  paint(scene, text);
  const cursor = marker(scene, last, markerX, detail);
  return {
    scene, cursor, rightPrompt: '',
    program: {
      engine: `${name}/compact`,
      traits: { form: 'compact', arrangement, kind, fade, detail: +level.toFixed(3), palette: colors.family },
      derivation: { box, anchor, roles: text.map(({ role, row, x, width }) => ({ role, row, x, width })) },
      stats: { occupiedCells: occupied(cells) },
    },
  };
}
