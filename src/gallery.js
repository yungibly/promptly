import { createDesign } from './design.js';
import { rasterize } from './marks.js';

// Compare actual geometry, not palette or alphabet names. A gallery should help
// explore possibility instead of accidentally showing five similar silhouettes.
export function signature(design) {
  if (design.engine !== 'assembly') {
    const bins = Array(32).fill(0);
    let stroke = 0, text = 0, sumX = 0, count = 0, span = 0;
    const position = (a) => Math.floor(a.at * 78 / 1000) + a.offset;
    const put = (x, y, wire) => {
      if (x < 0 || x >= 79 || y < 0 || y >= design.scene.rows) return;
      bins[Math.min(3, Math.floor(y / design.scene.rows * 4)) * 8 + Math.floor(x / 79 * 8)]++;
      count++; sumX += x; span = Math.max(span, x); if (wire) stroke++; else text++;
    };
    for (const run of design.scene.runs) {
      if (run.kind === 'wire') {
        const x1 = position(run.from.x), x2 = position(run.to.x);
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let y = Math.min(run.from.row, run.to.row); y <= Math.max(run.from.row, run.to.row); y++) put(x, y, true);
      } else {
        let start = position(run.x);
        if (run.align === 'right') start -= run.text.length - 1;
        if (run.align === 'center') start -= Math.floor(run.text.length / 2);
        const end = run.end ? position(run.end) : start + run.text.length;
        for (let x = start; x < end; x++) put(x, run.row, !!run.end);
      }
    }
    return [design.scene.rows / 12, span / 78, Math.min(1, (design.program?.stats.fragments ?? 1) / 10),
      design.program?.stats.links || design.engine === 'network' ? 1 : 0, sumX / Math.max(1, count) / 79,
      stroke / Math.max(1, count), 0, 0, text / Math.max(1, count), ...bins.map((n) => Math.min(1, n / 16) * 0.4)];
  }
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
  if (first.style !== 'compose') return Array.from({ length: count }, (_, i) => i ? make(i) : first);
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
    const engineCounts = Object.fromEntries(candidates.map(({ design }) => [design.engine, chosen.filter((item) => item.design.engine === design.engine).length]));
    const leastRepresented = Math.min(...Object.values(engineCounts));
    // Automatic galleries balance all eligible engines before optimizing shape.
    // Choosing one engine explicitly still explores variation within that engine.
    candidates.sort((a, b) => b.distance - a.distance);
    const next = candidates.findIndex(({ design }) => engineCounts[design.engine] === leastRepresented);
    chosen.push(candidates.splice(next, 1)[0]);
  }
  return chosen.map(({ design }) => design);
}
