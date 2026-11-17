import { anchor } from '../scene.js';
import { oklchToHex } from '../chromatic.js';

// Shared raster medium for the version-8 systems. A system paints a grid of
// cells ({ ch, fg, bg } or null for empty), then `emit` lowers it to ordinary
// scene runs. Sub-cell buffers give half-block, eighth-block, and braille detail.

export const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
export const smooth = (lo, hi, n) => { const t = clamp((n - lo) / (hi - lo)); return t * t * (3 - 2 * t); };
export const grid = (width, height, fill = null) => Array.from({ length: height }, () => Array(width).fill(fill));

// ---- color: OKLCH interpolation between palette colors ----
const linear = (n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
export function oklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { l: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}
export const lch = (l, c, h) => oklchToHex(clamp(l), Math.max(0, c), h);
export function mix(a, b, t) {
  const p = oklch(a), q = oklch(b);
  // An almost gray end borrows the other hue instead of swinging through red.
  const h = p.c < 0.02 ? q.h : q.c < 0.02 ? p.h : p.h + (((q.h - p.h) % 360 + 540) % 360 - 180) * t;
  return lch(p.l + (q.l - p.l) * t, p.c + (q.c - p.c) * t, h);
}
// n colors through the given stops, evenly spaced.
export function ramp(stops, n) {
  if (n === 1) return [stops.at(-1)];
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(t));
    return mix(stops[k], stops[k + 1], t - k);
  });
}
export const shade = (hex, dl, dc = 1) => { const p = oklch(hex); return lch(p.l + dl, p.c * dc, p.h); };

// Palette roles: 0 quiet, 1 line, 2–4 accents, 5 text, 6 surface (generated only).
// Ramps begin near the dark reference so low values dissolve into the terminal.
export function palette(colors, rng) {
  const accents = [colors[2], colors[3], colors[4]];
  const order = rng.pick([[0, 1, 2], [1, 0, 2], [2, 1, 0], [0, 2, 1]]);
  const [a, b, c] = order.map((i) => accents[i]);
  const ground = colors[6] ?? shade(colors[0], -0.2);
  const dusk = mix(ground, a, 0.35);
  const families = {
    glow: [dusk, a, mix(a, colors[5], 0.6)],
    duet: [shade(a, -0.12), mix(a, b, 0.5), b],
    trio: [a, b, c],
    mono: [shade(a, -0.28, 0.8), a, shade(a, 0.12, 0.7)],
    dusk: [shade(colors[0], -0.08), colors[1], a],
    ember: [dusk, a, b, mix(b, colors[5], 0.5)],
  };
  const family = rng.pick(Object.keys(families));
  return { family, stops: families[family], text: colors[5], accents: [a, b, c], quiet: colors[0], line: colors[1], ground };
}

// ---- sub-cell rasters ----
// pixels: (2 * rows) x width colors or null. Two vertical pixels per cell.
export function halfBlocks(pixels) {
  return Array.from({ length: Math.ceil(pixels.length / 2) }, (_, y) => pixels[2 * y].map((top, x) => {
    const bottom = pixels[2 * y + 1]?.[x] ?? null;
    if (!top && !bottom) return null;
    if (top === bottom) return { ch: ' ', bg: top };
    if (!bottom) return { ch: '▀', fg: top };
    if (!top) return { ch: '▄', fg: bottom };
    return { ch: '▀', fg: top, bg: bottom };
  }));
}

const DOTS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];
// dots: (4 * rows) x (2 * width) of colors or null; the latest painted dot
// in a cell wins its color (one foreground per terminal cell).
export function braille(dots, priority = () => 0) {
  const rows = Math.ceil(dots.length / 4), cols = Math.ceil(dots[0].length / 2);
  return Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
    let bits = 0, color = null, best = -Infinity;
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++) {
      const value = dots[4 * y + dy]?.[2 * x + dx];
      if (!value) continue;
      bits |= DOTS[dy][dx];
      const rank = priority(value);
      if (rank >= best) { best = rank; color = value; }
    }
    return bits ? { ch: String.fromCodePoint(0x2800 + bits), fg: color } : null;
  }));
}

// Silhouettes: layersAt(x) lists layers far to near as { top, color(y) } in
// cell units. Each cell keeps its two most important owners; lower-eighth
// blocks place the boundary between them with eight steps per row.
const LOWER = ' ▁▂▃▄▅▆▇█';
export function silhouettes(cols, rows, layersAt) {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, x) => {
    const layers = layersAt(x + 0.5);
    const owner = (y) => { let found = null; for (const layer of layers) if (y >= layer.top) found = layer; return found; };
    const top = owner(r + 1 / 16), bottom = owner(r + 15 / 16);
    if (!bottom) return top ? { ch: '▀', fg: top.color(r + 0.25) } : null;
    if (top === bottom) return { ch: ' ', bg: bottom.color(r + 0.5) };
    let k = 0;
    while (k < 8 && owner(r + 1 - (k + 0.5) / 8) === bottom) k++;
    // Snap one-eighth slivers: a hairline of a neighboring row's color reads
    // as a seam rather than as a contour.
    if (k >= 7) return { ch: ' ', bg: bottom.color(r + 0.5) };
    if (k <= 1) return top ? { ch: ' ', bg: top.color(r + 0.5) } : null;
    return { ch: LOWER[k], fg: bottom.color(r + 1 - k / 16), ...(top ? { bg: top.color(r + 0.25) } : {}) };
  }));
}

// Halftone: value(x, y) in 0..1 (square units: cell width 1, height 2) is
// thresholded per braille dot by an ordered matrix. Density carries tone; the
// cell's foreground carries its mean value through `color`.
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export function halftone(cols, rows, value, color) {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
    let bits = 0, sum = 0, n = 0;
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++) {
      const v = value(c + (dx + 0.5) / 2, r * 2 + (dy + 0.5) / 2);
      if (!(v > (BAYER[(r * 4 + dy) & 3][(c * 2 + dx) & 3] + 0.5) / 16)) continue;
      bits |= DOTS[dy][dx]; sum += v; n++;
    }
    return bits ? { ch: String.fromCodePoint(0x2800 + bits), fg: color(sum / n, c, r) } : null;
  }));
}

// ---- placement ----
// Fixed: cell x sits at a constant offset from one width-relative anchor.
export const fixed = (at = 0, offset = 0) => ({ fixed: true, at: (x) => anchor(at, offset + x) });
// Stretched: each logical column owns the width-relative interval between
// successive per-mille anchors. At 80 columns every logical column is one
// cell; wider terminals widen the columns, never adding prompt-time work.
export function stretch(from = 0, to = 1000) {
  const c0 = Math.trunc(from * 78 / 1000), c1 = to === 1000 ? 79 : Math.trunc(to * 78 / 1000);
  const columns = c1 - c0;
  return { fixed: false, columns, at: (x) => x <= 0 ? anchor(from) : x >= columns ? (to === 1000 ? anchor(1000, 1) : anchor(to))
    : anchor(Math.min(1000, Math.ceil((c0 + x) * 1000 / 78))) };
}

const inkOf = (cell) => cell.bg ? { fg: cell.fg ?? cell.bg, bg: cell.bg, exact: true } : cell.fg;
const keyOf = (cell) => `${cell.fg}/${cell.bg}`;

// Coalesce equal neighbors into runs. Fixed rows become literal text; stretched
// rows become fills so each logical column scales with the terminal width.
export function emit(scene, cells, place, row = 0) {
  for (const [y, line] of cells.entries()) {
    for (let x = 0; x < line.length;) {
      const cell = line[x];
      if (!cell) { x++; continue; }
      let end = x + 1;
      while (end < line.length && line[end] && keyOf(line[end]) === keyOf(cell) && (place.fixed || line[end].ch === cell.ch)) end++;
      if (place.fixed) scene.text(row + y, place.at(x), line.slice(x, end).map((c) => c.ch).join(''), inkOf(cell));
      else scene.fill(row + y, place.at(x), place.at(end), cell.ch, inkOf(cell));
      x = end;
    }
  }
}

export const occupied = (cells) => cells.reduce((n, line) => n + line.filter(Boolean).length, 0);
