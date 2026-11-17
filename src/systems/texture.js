import { clamp, ramp, mix, shade, grid, halfBlocks, braille } from './raster.js';
import { fbm } from './noise.js';
import { evolve } from './automaton.js';

// Small textures for compact prompts: one or two rows, six to forty cells,
// always palette colored. A texture is a raster grid (rows x width of
// { ch, fg, bg } or null); emit it with raster.emit(). `anchor` is the column
// the texture grows from (the label, the marker), when the caller has one.

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const threshold = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;
const LOWER = ' ▁▂▃▄▅▆▇█';
const steps = (width) => clamp(Math.round(width / 3), 3, 12);
// Equal colors coalesce into runs, so ramps are quantized along the width.
// Thin strokes (braille, single lines) stay in the luminous half of the ramp.
const bright = (colors) => [colors.stops[1], colors.stops.at(-1), mix(colors.stops.at(-1), colors.text, 0.35)];
// Single-dot braille strokes need the lightest inks to read at all.
const brightest = (colors) => [colors.stops.at(-1), mix(colors.stops.at(-1), colors.text, 0.45)];
const along = (inks, x, width) => inks[clamp(Math.floor(x / width * inks.length), 0, inks.length - 1)];
const dots = (h, w) => grid(w, h);

const kinds = {
  // A truecolor bed. Each cell is two pixels: even one row carries a lit top
  // edge over the horizontal gradient. Text can sit on it.
  gradient(rng, { width, rows, colors, anchor }) {
    const deep = [mix(colors.ground, colors.stops[0], 0.55), mix(colors.ground, colors.stops[1], 0.7), mix(colors.stops.at(-1), colors.ground, 0.25)];
    // Unanchored beds run either way; anchored ones are brightest at the anchor.
    const flip = rng.chance(0.5) && anchor === undefined;
    const inks = ramp(flip ? [...deep].reverse() : deep, steps(width));
    const lift = 0.03 + rng.next() * 0.06;
    const at = anchor === undefined ? null : clamp(anchor, 0, width - 1);
    return grid(width, rows).map((line, y) => line.map((_, x) => {
      // With an anchor the bed is brightest there and dims away from it.
      const base = at === null ? along(inks, x, width) : inks[clamp(inks.length - 1 - Math.round(Math.abs(x - at) / width * inks.length), 0, inks.length - 1)];
      const top = shade(base, lift * (rows - y)), bottom = shade(base, lift * (rows - y - 1));
      return top === bottom ? { ch: ' ', bg: bottom } : { ch: '▀', fg: top, bg: bottom };
    }));
  },
  // A silhouette in lower eighths: eight steps of height per row.
  ridge(rng, { width, rows, colors }) {
    const noise = fbm(rng, 2), scale = 2 + rng.next() * 6, phase = rng.next() * 40;
    const inks = ramp(colors.stops, steps(width));
    return grid(width, rows).map((line, y) => line.map((_, x) => {
      const n = clamp(0.5 + (noise(x / scale + phase) - 0.5) * 2.2), top = rows * (0.85 - 0.85 * n);
      const fill = clamp(y + 1 - top, 0, 1);
      const k = Math.round(fill * 8);
      return k ? (k === 8 ? { ch: ' ', bg: along(inks, x, width) } : { ch: LOWER[k], fg: along(inks, x, width) }) : null;
    }));
  },
  // An elementary automaton, time running down. One row shows two half-block
  // generations sliced from a run that has already developed (from the
  // anchor's span, when there is one); two rows show four, or eight in braille.
  automaton(rng, { width, rows, colors, anchor }) {
    const fine = rows > 1 && rng.chance(0.35), sx = fine ? 2 : 1, sy = fine ? 4 : 2;
    const w = width * sx, shown = rows * sy, warm = rows === 1 ? rng.int(6, 18) : 0;
    // An anchor seeds a span around it, so the strip reads as coming from the
    // label; a random start always keeps at least one live cell.
    const at = anchor === undefined ? null : clamp(anchor, 0, width - 1) * sx, span = Math.max(3 * sx, Math.round(w / 3));
    const init = Array.from({ length: w }, (_, i) => (at === null || Math.abs(i - at) <= span / 2) && rng.chance(at === null ? 0.45 : 0.55) ? 1 : 0);
    if (!init.includes(1)) init[at ?? rng.int(0, w - 1)] = 1;
    let rule, history;
    for (let attempt = 0; attempt < 6; attempt++) {
      rule = rng.pick(anchor === undefined ? [30, 54, 60, 62, 86, 90, 106, 110, 122, 126, 150] : [18, 22, 26, 30, 60, 90, 102, 122, 126, 146, 150, 182]);
      history = evolve(rule, init, warm + shown).slice(warm);
      const live = history.flat().filter(Boolean).length / (w * shown);
      if (live > 0.08 && live < 0.6) break;
    }
    // A slice is colored along its length; a taller strip by generation.
    const inks = rows === 1 ? ramp(bright(colors), steps(width)) : ramp([...bright(colors)].reverse(), Math.max(2, shown));
    const sub = dots(shown, w);
    history.forEach((row, g) => row.forEach((on, i) => { if (on) sub[g][i] = rows === 1 ? along(inks, i / sx, width) : inks[g]; }));
    if (!sub.flat().some(Boolean)) sub[shown - 1][at ?? 0] = inks[0];
    return fine ? braille(sub) : halfBlocks(sub);
  },
  // Quarter-arc chains: caps and cups in one row, a meander between two.
  truchet(rng, { width, rows, colors }) {
    const inks = ramp(bright(colors), steps(width)), cells = grid(width, rows);
    const put = (x, y, ch) => { if (x < width && cells[y]) cells[y][x] = { ch, fg: along(inks, x, width) }; };
    if (rows === 1) {
      for (let x = 0; x < width;) {
        const run = rng.int(0, 2), cap = rng.chance(0.5);
        put(x, 0, cap ? '╭' : '╰');
        for (let i = 1; i <= run; i++) put(x + i, 0, '─');
        put(x + run + 1, 0, cap ? '╮' : '╯');
        x += run + 2 + (rng.chance(0.25) ? 1 : 0);
      }
      return cells;
    }
    // One strand weaving between the top and bottom rows of the band.
    let y = rng.int(0, rows - 1);
    for (let x = 0; x < width;) {
      const run = rng.int(1, 4);
      for (let i = 0; i < run && x < width; i++, x++) put(x, y, '─');
      if (x >= width) break;
      const next = y === 0 ? 1 : y === rows - 1 ? y - 1 : y + (rng.chance(0.5) ? 1 : -1);
      put(x, y, next > y ? '╮' : '╯'); put(x, next, next > y ? '╰' : '╭');
      y = next; x++;
    }
    return cells;
  },
  // Diagonal 10-PRINT, dropping out where density thins.
  maze(rng, { width, rows, colors }) {
    const inks = ramp(bright(colors), steps(width)), bias = 0.35 + rng.next() * 0.3, density = 0.7 + rng.next() * 0.3;
    const tile = (x) => ({ ch: rng.next() < bias ? '╱' : '╲', fg: along(inks, x, width) });
    const cells = grid(width, rows).map((line) => line.map((_, x) => rng.next() < density ? tile(x) : null));
    // A narrow run never drops every tile.
    if (!cells.flat().some(Boolean)) { const x = rng.int(0, width - 1); cells[0][x] = tile(x); }
    return cells;
  },
  // Braille waves: four dot rows per cell row, one or two strands.
  wave(rng, { width, rows, colors, anchor }) {
    const h = rows * 4, w = width * 2, sub = dots(h, w), inks = ramp(brightest(colors), steps(width));
    const strands = rng.chance(0.35) ? 2 : 1, cycles = 1 + rng.next() * width / 8;
    for (let s = 0; s < strands; s++) {
      const phase = rng.next() * 6.28, amp = (h - 1) / 2 * (s ? 0.6 : 1), beat = rng.next();
      let last = null;
      for (let x = 0; x < w; x++) {
        // The swing grows away from the anchor, so the wave leaves the text.
        const from = anchor === undefined ? 1 : clamp(Math.abs(x / 2 - anchor) / (width * 0.4));
        const y = Math.round((h - 1) / 2 + amp * from * Math.sin(x / w * cycles * 6.283 + phase) * (1 - beat * 0.5 * (1 + Math.cos(x / w * 6.283))));
        // In two rows the main strand is two dots thick to read at prompt size.
        for (let k = Math.min(y, last ?? y); k <= Math.max(y, last ?? y) + (s || rows === 1 ? 0 : 1); k++) sub[clamp(k, 0, h - 1)][x] = along(inks, x / 2, width);
        last = y;
      }
    }
    return braille(sub);
  },
  // Sprigs: stems rising from the base, leaves on alternating sides, and a
  // bloom. Two-dot stems keep them legible in a single row of braille.
  sprig(rng, { width, rows, colors, anchor }) {
    const h = rows * 4, w = width * 2, sub = dots(h, w);
    const stem = mix(colors.stops[1], colors.stops.at(-1), 0.4), leaf = brightest(colors)[1], bloom = colors.accents[rng.int(0, 2)];
    const count = clamp(Math.round(width / rng.int(3, 6)), 1, 10);
    for (let i = 0; i < count; i++) {
      // Sprigs spread across the strip; with an anchor they are tallest there.
      const base = Math.round((i + 0.2 + rng.next() * 0.6) * w / count);
      let x = base, lean = (rng.next() - 0.5) * 0.5, side = rng.chance(0.5) ? 1 : -1;
      const near = anchor === undefined ? 1 : 1 - clamp(Math.abs(base / 2 - anchor) / width) * 0.7;
      const tall = Math.max(2, Math.round(rng.int(Math.max(2, h - 3), h) * near));
      for (let y = h - 1; y >= h - tall; y--) {
        x = clamp(x + lean, 0, w - 2); lean += (rng.next() - 0.5) * 0.25;
        const cx = Math.round(x);
        sub[y][cx] = stem; if (y > h - tall / 2) sub[y][cx + 1] = stem;
        if (y < h - 1 && y > h - tall && rng.chance(0.45)) { const lx = cx + (side > 0 ? 2 : -1); if (lx >= 0 && lx < w) sub[y - 1][lx] = leaf; side = -side; }
      }
      if (rng.chance(0.55)) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const bx = Math.round(x) + dx, by = h - tall + dy - 1; if (by >= 0 && bx < w) sub[by][bx] = bloom; }
    }
    return braille(sub, (color) => color === bloom ? 2 : color === leaf ? 1 : 0);
  },
  // A dithered dissolve: solid at one end, scattering into pixels at the other.
  dissolve(rng, { width, rows, colors }) {
    const inks = ramp(colors.stops, steps(width)), flip = rng.chance(0.5), sub = dots(rows * 2, width);
    for (let y = 0; y < rows * 2; y++) for (let x = 0; x < width; x++) {
      const t = (flip ? width - 1 - x : x) / Math.max(1, width - 1);
      if (threshold(x, y) < 1 - t * 0.95) sub[y][x] = along(inks, x, width);
    }
    return halfBlocks(sub);
  },
};

export const textureKinds = Object.keys(kinds);

// ASCII keeps the exact occupied cells and picks a glyph for each one's shape.
function asciiCell(cell, kind) {
  const { ch } = cell, code = ch.codePointAt(0);
  // Beds stay plain color behind text; tall ridge cells become solid color.
  if (kind === 'gradient' || kind === 'ridge' && '▆▇'.includes(ch)) return { ch: ' ', bg: cell.bg ?? cell.fg, fg: cell.bg ?? cell.fg };
  let out = ch;
  if (code >= 0x2800 && code <= 0x28ff) {
    const bits = code - 0x2800, rows = [0x09, 0x12, 0x24, 0xc0].map((mask) => (bits & mask) !== 0);
    const count = bits.toString(2).replaceAll('0', '').length, top = rows.indexOf(true), low = rows.lastIndexOf(true);
    out = count >= 6 ? '#' : low - top >= 2 ? ':' : low === 0 ? "'" : top === 3 ? '_' : top >= 2 ? '.' : '-';
  } else if (ch === '▀') out = cell.bg ? ':' : "'";
  else if (ch === '▄') out = '.';
  else if ('▁▂'.includes(ch)) out = '_';
  else if ('▃▄▅'.includes(ch)) out = '=';
  else if ('▆▇'.includes(ch)) out = '#';
  else if (ch === '╱') out = '/';
  else if (ch === '╲') out = '\\';
  else if ('╭╯'.includes(ch)) out = '/';
  else if ('╮╰'.includes(ch)) out = '\\';
  else if (ch === '─') out = '-';
  return { ...cell, ch: out };
}

function fadeMask(cells, fade) {
  if (!fade || fade === 'none') return cells;
  const width = cells[0]?.length ?? 0, edge = Math.max(2, width * 0.35);
  const visible = (x) => Math.min(fade === 'right' ? 1 : clamp((x + 1) / edge), fade === 'left' ? 1 : clamp((width - x) / edge));
  return cells.map((line, y) => line.map((cell, x) => cell && threshold(x, y) < visible(x) ? cell : null));
}

export function texture(kind, rng, { width, rows = 1, colors, ascii = false, fade = 'none', anchor } = {}) {
  if (!Object.hasOwn(kinds, kind)) throw new Error(`Unknown texture: ${kind}. Choose ${textureKinds.join(', ')}.`);
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(rows) || rows < 1) throw new Error('Texture width and rows must be positive integers.');
  const cells = fadeMask(kinds[kind](rng, { width, rows, colors, anchor }), fade);
  return ascii ? cells.map((line) => line.map((cell) => cell && asciiCell(cell, kind))) : cells;
}

// Short periodic patterns for responsive pads and leaders: repeat `text`
// across a width-relative fill in a single quiet ink.
const rhythms = {
  dots: ['·  ', '.  '], beads: ['·∘', '.o'], dashes: ['╌', '-'], ticks: ['╵ ', "' "],
  wave: ['⠉⠒⠤⣀⠤⠒', "'-._.-"], chain: ['╭╮╰╯', '/\\_/'], zigzag: ['╱╲', '/\\'], shade: ['░', ':'],
};
export const rhythmKinds = Object.keys(rhythms);

export function rhythm(kind, rng, { colors, ascii = false } = {}) {
  if (!Object.hasOwn(rhythms, kind)) throw new Error(`Unknown rhythm: ${kind}. Choose ${rhythmKinds.join(', ')}.`);
  const ink = mix(colors.quiet, colors.stops[rng.int(0, colors.stops.length - 1)], 0.25 + rng.next() * 0.35);
  return { text: rhythms[kind][ascii ? 1 : 0], ink };
}
