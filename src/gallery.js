import { createDesign } from './design.js';
import { occupancy } from './measure.js';
import { quality } from './quality.js';

// Describe the final occupied medium at several scales. Color names and glyph
// fallback cannot manufacture variety; fields remain measurable reservations.
export function signature(input) {
  const { design, rows, width: WIDTH, grid, roleGrid } = occupancy(input);
  const total = grid.flat().filter(Boolean).length;
  const count = (predicate) => grid.reduce((n, row, y) => n + row.filter((cell, x) => predicate(cell, x, y)).length, 0);
  const rowMass = grid.map((row) => row.filter(Boolean).length / WIDTH);
  const columnMass = Array.from({ length: WIDTH }, (_, x) => grid.filter((row) => row[x]).length / rows);
  let minX = WIDTH, maxX = 0, sumX = 0, sumY = 0, transitions = 0, gaps = 0, maxGap = 0;
  for (let y = 0; y < rows; y++) {
    let gap = 0, started = false;
    for (let x = 0; x < WIDTH; x++) {
      if (grid[y][x]) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); sumX += x; sumY += y;
        if (started && gap) { gaps++; maxGap = Math.max(maxGap, gap); }
        gap = 0; started = true;
      } else if (started) gap++;
      if (x && !!grid[y][x] !== !!grid[y][x - 1]) transitions++;
    }
  }
  const seen = new Set(), components = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < WIDTH; x++) {
    if (!grid[y][x] || seen.has(y * WIDTH + x)) continue;
    let size = 0; const queue = [[x, y]];
    seen.add(y * WIDTH + x);
    for (let i = 0; i < queue.length; i++) {
      const [cx, cy] = queue[i]; size++;
      for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
        if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= rows || !grid[ny][nx] || seen.has(ny * WIDTH + nx)) continue;
        seen.add(ny * WIDTH + nx); queue.push([nx, ny]);
      }
    }
    components.push(size);
  }
  const bins = (nx, ny) => {
    const result = Array(nx * ny).fill(0);
    for (let y = 0; y < rows; y++) for (let x = 0; x < WIDTH; x++) if (grid[y][x]) result[Math.min(ny - 1, Math.floor(y * ny / rows)) * nx + Math.floor(x * nx / WIDTH)]++;
    return result.map((n) => n / Math.ceil(WIDTH / nx) / Math.ceil(rows / ny) * 0.45);
  };
  // Keep vertical scale visible beside the many spatial bins: a tall sparse
  // specimen should not disappear from exploration behind medium-height detail.
  return [rows / 6, (maxX - minX + 1) / WIDTH, total / (rows * WIDTH),
    sumX / Math.max(1, total) / WIDTH, sumY / Math.max(1, total) / rows,
    count((c) => c === 2) / Math.max(1, total), count((c) => c === 3) / Math.max(1, total),
    count((c, x, y) => c && roleGrid[y][x]) / Math.max(1, total),
    Math.min(1, components.length / 24), Math.max(0, ...components) / Math.max(1, total),
    transitions / (rows * WIDTH), Math.min(1, gaps / 20), maxGap / WIDTH,
    design.cursor / WIDTH, ...Array.from({ length: 12 }, (_, i) => (rowMass[i] ?? 0) * 0.6),
    ...Array.from({ length: 16 }, (_, i) => columnMass.slice(i * 5, i * 5 + 5).reduce((a, b) => a + b, 0) / 5 * 0.4),
    ...bins(4, 3), ...bins(16, 6)];
}

export function gallery(options, count) {
  const make = (i) => createDesign({ ...options, seed: `${options.seed}/${i + 1}` });
  const first = make(0);
  const pool = Array.from({ length: count * 8 }, (_, i) => {
    const design = i ? make(i) : first;
    return { design, vector: signature(design), score: quality(design).score, distance: Infinity };
  });
  // Drop each engine's weakest specimens before maximizing variety, so the
  // most distant candidate is not simply the most broken one. Ranking within
  // an engine keeps the engine mix intact.
  const groups = new Map();
  for (const item of pool) groups.set(item.design.engine, [...groups.get(item.design.engine) ?? [], item]);
  const candidates = [...groups.values()].flatMap((group) => {
    const keep = Math.max(1, Math.ceil(group.length * 0.6));
    return [...group].sort((a, b) => b.score - a.score).slice(0, keep);
  }).sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
  const distance = (a, b) => a.reduce((sum, n, i) => sum + (n - b[i]) ** 2, 0);
  // Start near the pool's geometric center, then maximize distance from designs
  // already shown. The first seed has no special privilege in the collection.
  const center = candidates[0].vector.map((_, i) => candidates.reduce((sum, c) => sum + c.vector[i], 0) / candidates.length);
  candidates.sort((a, b) => distance(a.vector, center) - distance(b.vector, center));
  // Distance alone favors the tallest specimens, so tall ones (more than three
  // rows) get the pool's share of the collection. Families that only come tall
  // still get their place.
  const tall = ({ design }) => design.height > 3;
  const onlyTall = new Set(candidates.map(({ design }) => design.engine)
    .filter((engine) => candidates.every((item) => item.design.engine !== engine || tall(item))));
  const tallQuota = Math.max(onlyTall.size, Math.round(count * candidates.filter(tall).length / candidates.length));
  const chosen = [candidates.shift()];
  while (chosen.length < count && candidates.length) {
    const latest = chosen.at(-1).vector;
    for (const candidate of candidates) candidate.distance = Math.min(candidate.distance, distance(candidate.vector, latest));
    const engineCounts = Object.fromEntries(candidates.map(({ design }) => [design.engine, chosen.filter((item) => item.design.engine === design.engine).length]));
    const leastRepresented = Math.min(...Object.values(engineCounts));
    // Families that only come tall keep a reserved place until they appear.
    const reserved = [...onlyTall].filter((engine) => engineCounts[engine] === 0).length;
    const roomForTall = chosen.filter(tall).length + reserved < tallQuota;
    candidates.sort((a, b) => b.distance - a.distance);
    const due = ({ design }) => engineCounts[design.engine] === leastRepresented;
    let index = candidates.findIndex((item) => due(item) && (roomForTall || !tall(item) || (onlyTall.has(item.design.engine) && !engineCounts[item.design.engine])));
    if (index < 0) index = candidates.findIndex(due);
    chosen.push(candidates.splice(index, 1)[0]);
  }
  return chosen.map(({ design }) => design);
}
