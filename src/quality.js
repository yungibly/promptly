import { occupancy } from './measure.js';

// A heuristic for how deliberate a specimen reads, measured on the final scene
// at the planning width. Each penalty names a failure seen in uncurated batches:
// letters and digits that read as stray text, rows spent on almost nothing,
// confetti of isolated marks, and tall prompts with little to show for it.
// Scores compare specimens of the same engine; engines differ too much in kind
// for one number to rank them against each other.
const TEXTLIKE = /[A-Za-z0-9?!=+*~]/;

export function quality(input) {
  const { design, rows, width, grid, roleGrid, glyphs } = occupancy(input);
  // A static label is requested text, not stray artwork.
  const label = Array.from({ length: rows }, () => Array(width).fill(false));
  if (design.label) for (let y = 0; y < rows; y++) {
    const line = glyphs[y].join('');
    for (let i = line.indexOf(design.label); i >= 0; i = line.indexOf(design.label, i + 1)) {
      for (let x = i; x < i + design.label.length; x++) label[y][x] = true;
    }
  }
  // Live text is excluded, but a filled surface behind it is still artwork.
  const art = (x, y) => grid[y][x] === 3 || grid[y][x] && !roleGrid[y][x] && !label[y][x];
  let total = 0, textlike = 0;
  const rowArt = Array(rows).fill(0);
  for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) if (art(x, y)) {
    total++; rowArt[y]++;
    if (TEXTLIKE.test(glyphs[y][x])) textlike++;
  }
  // Label 8-connected components of artwork.
  const owner = Array.from({ length: rows }, () => Array(width).fill(-1));
  const components = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) {
    if (!art(x, y) || owner[y][x] >= 0) continue;
    const id = components.length, queue = [[x, y]];
    owner[y][x] = id;
    for (let i = 0; i < queue.length; i++) {
      const [cx, cy] = queue[i];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= rows || !art(nx, ny) || owner[ny][nx] >= 0) continue;
        owner[ny][nx] = id; queue.push([nx, ny]);
      }
    }
    components.push(queue.length);
  }
  // Rows above the input row that carry almost nothing still cost a line of
  // screen on every command, unless they hold live text or a substantial
  // structure passes through them.
  const major = (size) => size >= Math.max(12, total * 0.1);
  const upper = Array.from({ length: rows - 1 }, (_, y) => y).filter((y) => !roleGrid[y].some(Boolean));
  const thinRows = upper.filter((y) => rowArt[y] < width * 0.04
    && !owner[y].some((id) => id >= 0 && major(components[id]))).length;
  const speckMass = components.filter((size) => size <= 2).reduce((sum, size) => sum + size, 0);
  const metrics = {
    textlike: total ? textlike / total : 0,
    thinRows: upper.length ? thinRows / upper.length : 0,
    scatter: total ? speckMass / total : 0,
    coherence: total ? Math.max(...components) / total : 1,
    // Mass per row beyond the third; compact prompts are never penalized here.
    tallSparse: rows > 3 ? Math.max(0, 1 - total / ((rows - 1) * width * 0.12)) * Math.min(1, (rows - 3) / 5) : 0,
  };
  const score = 1 - 0.35 * metrics.textlike - 0.25 * metrics.thinRows - 0.2 * metrics.scatter
    - 0.2 * metrics.tallSparse + 0.1 * metrics.coherence;
  return { score: Number(score.toFixed(4)), metrics, design };
}

// Choose the strongest of several candidate seeds. Only candidates that share
// the first seed's engine compete, so automatic engine sampling keeps its mix.
export function curate(make, seeds) {
  const candidates = seeds.map((seed) => make(seed));
  const engine = candidates[0].engine;
  let best = candidates[0], bestScore = quality(best).score;
  for (const design of candidates.slice(1)) {
    if (design.engine !== engine) continue;
    const score = quality(design).score;
    if (score > bestScore) { best = design; bestScore = score; }
  }
  return best;
}
