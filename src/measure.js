import { createDesign, recipe } from './design.js';
import { flatten } from './flatten.js';

const WIDTH = 79;
const position = (a) => Math.floor(a.at * (WIDTH - 1) / 1000) + a.offset;
const strokes = /[─━═╌╍┄┅┈┉╴╶│┃║╎╏┆┇┊┋┌┐└┘╭╮╰╯┬┴├┤┼]/;

// Rasterize the final flattened scene at the 79-cell planning width. Each cell
// records its glyph, a coarse kind (1 mark, 2 stroke, 3 filled), live-role
// membership, and ink. Glyph fallback is normalized first, so ASCII mode cannot
// change any measurement.
export function occupancy(input) {
  const design = input.glyphs === 'unicode' ? input : createDesign({ ...recipe(input), glyphs: 'unicode' });
  const rows = design.scene.rows;
  const grid = Array.from({ length: rows }, () => Array(WIDTH).fill(0));
  const roleGrid = Array.from({ length: rows }, () => Array(WIDTH).fill(false));
  const glyphs = Array.from({ length: rows }, () => Array(WIDTH).fill(' '));
  const inks = Array.from({ length: rows }, () => Array(WIDTH).fill(null));
  for (const [y, spans] of flatten(design, WIDTH).entries()) for (const part of spans) {
    const filled = typeof part.ink === 'object' && part.ink.bg != null;
    const chars = [...part.text], origin = position(part.origin);
    for (let x = Math.max(0, position(part.from)); x < Math.min(WIDTH, position(part.to)); x++) {
      const char = chars[((x - origin) % chars.length + chars.length) % chars.length];
      if (filled || part.role || char !== ' ') grid[y][x] = filled ? 3 : part.edges || strokes.test(char) ? 2 : 1;
      roleGrid[y][x] = !!part.role;
      glyphs[y][x] = part.role ? ' ' : char;
      inks[y][x] = part.ink;
    }
  }
  return { design, rows, width: WIDTH, grid, roleGrid, glyphs, inks };
}
