import { createDesign } from './design.js';
import { rasterize } from './marks.js';

// Compare actual geometry, not palette or alphabet names. A gallery should help
// explore possibility instead of accidentally showing five similar silhouettes.
export function signature(design) {
  const bins = Array(32).fill(0), kinds = { stroke: 0, pixel: 0, mark: 0, text: 0 };
  let count = 0, sumX = 0;
  for (const piece of design.program.derivation.pieces) for (const cell of rasterize(piece.tree).values()) {
    const x = piece.rect.x + cell.x, y = design.program.rowMap[piece.rect.y + cell.y];
    if (y === undefined) continue;
    bins[Math.min(3, Math.floor(y / Math.max(1, design.scene.rows - 1) * 4)) * 8 + Math.min(7, Math.floor(x / 79 * 8))]++;
    kinds[cell.kind]++; count++; sumX += x;
  }
  return [
    design.scene.rows / 12, design.program.stats.span / 76,
    Math.min(1, design.program.stats.fragments / 10), design.program.stats.links ? 1 : 0,
    sumX / Math.max(1, count) / 79,
    ...Object.values(kinds).map((n) => n / Math.max(1, count)),
    ...bins.map((n) => Math.min(1, n / 16) * 0.4),
  ];
}

export function gallery(options, count) {
  const make = (i) => createDesign({ ...options, seed: `${options.seed}/${i + 1}` });
  const first = make(0);
  if (first.engine !== 'assembly') return Array.from({ length: count }, (_, i) => i ? make(i) : first);
  const candidates = Array.from({ length: count * 8 }, (_, i) => {
    const design = i ? make(i) : first;
    return { design, vector: signature(design), distance: Infinity };
  });
  const chosen = [candidates.shift()];
  while (chosen.length < count) {
    const latest = chosen.at(-1).vector;
    for (const candidate of candidates) {
      const distance = candidate.vector.reduce((sum, n, i) => sum + (n - latest[i]) ** 2, 0);
      candidate.distance = Math.min(candidate.distance, distance);
    }
    candidates.sort((a, b) => b.distance - a.distance);
    chosen.push(candidates.shift());
  }
  return chosen.map(({ design }) => design);
}
