import { Scene, anchor, left } from './scene.js';
import { group, move, stroke, rasterize, programStats } from './marks.js';
import { materials, alphabets, expression, renderExpression } from './ornaments.js';
import { random } from './random.js';
import { deriveMotif, evolveMotif } from './motifs.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const families = ['stroke', 'inscription', 'field', 'contour', 'wave', 'bars', 'raster'];
const operators = ['overlay', 'repeat', 'reflect', 'split', 'cut', 'inset'];
const weighted = (rng, weights) => rng.pick(Object.entries(weights).flatMap(([name, weight]) => Array(weight).fill(name)));
const path = (points, ink) => group(...points.slice(1).map((p, i) => stroke(...points[i], ...p, ink)));
const clipped = (child, width, height) => ({ op: 'clip', x: 0, y: 0, width, height, child });

function leaf(width, height, rng, weights, density) {
  const w = width - 1, h = height - 1;
  const ink = rng.pick([0, 1, 2, 3]);
  const family = weighted(rng, weights);
  if (family === 'inscription') {
    const length = Math.min(width, rng.int(3, 15));
    return { op: 'text', x: Math.floor((width - length) / 2), y: rng.int(0, h), width: length, ink: rng.pick([2, 3, 4]) };
  }
  if (family === 'stroke') {
    const a = rng.pick([[0, 0], [0, h], [0, Math.floor(h / 2)], [Math.floor(w / 2), 0]]);
    const b = rng.pick([[w, 0], [w, h], [w, Math.floor(h / 2)], [Math.floor(w / 2), h]]);
    return stroke(...a, ...b, ink);
  }
  if (family === 'field') {
    const dx = rng.int(2, 5), dy = rng.int(1, 2);
    const marks = [];
    for (let y = 0; y <= h; y += dy) for (let x = 0; x <= w; x += dx) {
      if (rng.chance(density + 0.15)) marks.push({ op: 'mark', x, y, ink: rng.pick([0, 1, 2, 3]), tone: rng.int(0, 3) });
    }
    return marks.length ? group(...marks) : { op: 'mark', x: Math.floor(w / 2), y: Math.floor(h / 2), ink, tone: 0 };
  }
  if (family === 'raster') {
    const phase = rng.next() * Math.PI * 2, fx = rng.int(1, 4), fy = rng.int(1, 3);
    const pixels = [];
    for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
      const value = (Math.sin(phase + x * fx / width * Math.PI) + Math.cos(y * fy / height * Math.PI)) / 2;
      if (value < 0.5 - density) continue;
      pixels.push({ op: 'pixel', x, y, level: clamp(Math.floor((value + 1) * 2), 0, 3), ink });
    }
    return group(...pixels);
  }
  if (family === 'contour') {
    const sides = rng.int(3, 10), phase = rng.pick([0, Math.PI / 2, Math.PI / sides]);
    const points = Array.from({ length: sides + 1 }, (_, i) => {
      const angle = phase + i * Math.PI * 2 / sides;
      return [Math.round(w / 2 * (1 + Math.cos(angle))), Math.round(h / 2 * (1 + Math.sin(angle)))];
    });
    return path(points, ink);
  }
  const phase = rng.next() * Math.PI * 2, frequency = rng.int(1, 3);
  const amplitude = (x) => Math.round(h / 2 * (1 + Math.sin(phase + x / Math.max(1, w) * frequency * Math.PI * 2)));
  if (family === 'wave') return path(Array.from({ length: width }, (_, x) => [x, amplitude(x)]), ink);
  const step = rng.int(2, 4), baseline = rng.pick([0, h]);
  return group(...Array.from({ length: Math.ceil(width / step) }, (_, i) => stroke(i * step, baseline, i * step, amplitude(i * step), ink)));
}

// Recursion combines small operations within a bounded region. A repetition may
// contain a cut reflected contour; an inset may itself split into several fields.
// There is no catalogue of finished badges, islands, or prompt silhouettes.
function motif(width, height, budget, rng, weights, density) {
  if (budget <= 1 || rng.chance(0.25)) return leaf(width, height, rng, weights, density);
  const choices = ['overlay'];
  if (width >= 3 || height >= 3) choices.push('cut');
  if (width >= 7 || height >= 3) choices.push('repeat', 'split');
  if (width >= 6) choices.push('reflect');
  if (width >= 7 && height >= 3 && weights.contour > 0) choices.push('inset');
  const op = rng.pick(choices);
  const next = (w, h, b) => motif(w, h, b, rng, weights, density);
  if (op === 'overlay') {
    const first = Math.ceil((budget - 1) / 2), second = Math.max(1, budget - 1 - first);
    return group(next(width, height, first), next(width, height, second));
  }
  if (op === 'cut') {
    const vertical = width >= 3 && (height < 3 || rng.chance(0.6));
    return { op, x: vertical ? rng.int(1, width - 2) : 0, y: vertical ? 0 : rng.int(1, height - 2),
      width: vertical ? 1 : width, height: vertical ? height : 1, child: next(width, height, budget - 1) };
  }
  if (op === 'reflect') {
    const half = Math.floor((width - 1) / 2), child = next(half, height, budget - 1);
    return group(child, { op: 'reflect', axis: 'x', at: (width - 1) / 2, child });
  }
  if (op === 'repeat') {
    const horizontal = width >= 7 && (height < 3 || rng.chance(0.7));
    const count = rng.int(2, Math.min(6, horizontal ? Math.floor(width / 3) : height));
    const step = Math.floor((horizontal ? width : height) / count);
    return { op, count, dx: horizontal ? step : 0, dy: horizontal ? 0 : step,
      child: next(horizontal ? Math.max(1, step - 1) : width, horizontal ? height : 1, budget - 1) };
  }
  if (op === 'inset') {
    return group(leaf(width, height, rng, { contour: 1 }, density), move(next(width - 4, height - 2, budget - 1), 2, 1));
  }
  const horizontal = width >= 7 && (height < 3 || rng.chance(0.7));
  const size = horizontal ? width : height, gap = horizontal ? 2 : 1;
  const first = rng.int(horizontal ? 2 : 1, size - gap - (horizontal ? 2 : 1));
  const b = Math.max(1, Math.floor((budget - 1) / 2));
  return group(next(horizontal ? first : width, horizontal ? height : first, b),
    move(next(horizontal ? size - gap - first : width, horizontal ? height : size - gap - first, b), horizontal ? first + gap : 0, horizontal ? 0 : first + gap));
}

function partition(region, count, rng) {
  const regions = [region], splits = [];
  while (regions.length < count) {
    const candidates = regions.filter((r) => r.width >= 12 || r.height >= 3);
    if (!candidates.length) break;
    const r = rng.pick(candidates);
    const horizontal = r.width >= 12 && (r.height < 3 || rng.chance(0.65));
    const gap = horizontal ? rng.int(2, 5) : 1;
    const size = horizontal ? r.width : r.height, min = horizontal ? 4 : 1;
    const first = rng.int(min, size - gap - min);
    const a = { ...r, width: horizontal ? first : r.width, height: horizontal ? r.height : first };
    const b = { x: r.x + (horizontal ? first + gap : 0), y: r.y + (horizontal ? 0 : first + gap),
      width: horizontal ? size - gap - first : r.width, height: horizontal ? r.height : size - gap - first };
    regions.splice(regions.indexOf(r), 1, a, b);
    splits.push({ region: r, axis: horizontal ? 'x' : 'y', first, gap });
  }
  return { regions, splits };
}

// At 80 columns this exactly reproduces the planning position. At larger widths
// fragments retain their own proportions while the gaps between them expand.
export function fragmentAnchor(rect, x = 0) {
  const at = Math.round((rect.x + (rect.width - 1) / 2) * 1000 / 78);
  return anchor(at, rect.x + x - Math.floor(at * 78 / 1000));
}

function decorate(cells, config, rng) {
  const marks = new Map(), annotations = [], slots = new Map();
  const tones = Array.from({ length: 4 }, () => rng.pick(alphabets[config.alphabet].atoms));
  for (const cell of cells.values()) {
    if (cell.kind === 'text') {
      if (!slots.has(cell.slot)) slots.set(cell.slot, []);
      slots.get(cell.slot).push(cell);
    } else {
      let glyph;
      if (cell.kind === 'mark') glyph = tones[cell.tone];
      else if (cell.kind === 'pixel') glyph = '░▒▓█'[cell.level];
      else if ((cell.bits & 48) === 48) glyph = '╳';
      else if (cell.bits & 48) glyph = cell.bits & 16 ? '╱' : '╲';
      else glyph = cell.bits ? materials[config.material][cell.bits] : '·';
      marks.set(`${cell.x},${cell.y}`, { ...cell, glyph });
    }
  }
  for (const cells of slots.values()) {
    // Cuts may split a text slot. Each contiguous surviving interval gets its
    // own bounded expression, so a mask can never be accidentally painted over.
    cells.sort((a, b) => a.y - b.y || a.x - b.x);
    const intervals = [];
    for (const cell of cells) {
      const last = intervals.at(-1)?.at(-1);
      if (!last || cell.y !== last.y || cell.x !== last.x + 1) intervals.push([]);
      intervals.at(-1).push(cell);
    }
    for (const interval of intervals) {
      const tree = expression(rng, config.alphabet, interval.length, Math.min(6, 2 + config.complexity));
      const text = renderExpression(tree), start = Math.floor((interval.length - text.length) / 2);
      [...text].forEach((glyph, i) => {
        const cell = interval[start + i];
        marks.set(`${cell.x},${cell.y}`, { ...cell, glyph });
      });
      annotations.push({ x: interval[start].x, y: interval[start].y, expression: tree });
    }
  }
  return { marks, annotations, tones };
}

export function assemble(config) {
  if (config.evolved) return assembleEvolved(config);
  const { rng, ornament, height, fragments, spread, symmetry, complexity, connectivity } = config;
  const artHeight = height - 1;
  const width = clamp(Math.round(76 * spread), 12, 76);
  const focus = rng.pick([0, 0, 0.5, 1, 1, rng.next()]);
  const zone = { x: 1 + Math.round((76 - width) * (symmetry === 'mirror' ? 0.5 : focus)), y: 0, width, height: artHeight };
  const mirrored = symmetry === 'mirror';
  const plan = partition({ ...zone, width: mirrored ? Math.floor((width - 2) / 2) : width }, mirrored ? Math.ceil(fragments / 2) : fragments, rng);
  // Sample a vocabulary bias, including zero weights: some specimens really do
  // contain no lines or no text. It is not just the same graph in another font.
  const weights = Object.fromEntries(families.map((name) => [name, rng.chance(0.6) ? 0 : rng.int(1, 5)]));
  if (!Object.values(weights).some(Boolean)) weights[rng.pick(families)] = 3;
  const pieces = [];
  for (const region of plan.regions) {
    const w = rng.int(Math.max(2, Math.ceil(region.width * 0.55)), region.width);
    const h = rng.int(Math.max(1, Math.ceil(region.height * 0.5)), region.height);
    const rect = { x: region.x + rng.int(0, region.width - w), y: region.y + rng.int(0, region.height - h), width: w, height: h };
    const tree = clipped(motif(w, h, 2 + complexity * 2, rng, weights, config.density), w, h);
    // A cut can consume a tiny child completely. Keep that intentional void;
    // other fragments and the input inscription still form a valid prompt.
    pieces.push({ id: pieces.length, rect, tree });
    if (mirrored) pieces.push({ id: pieces.length, rect: { ...rect, x: 2 * zone.x + zone.width - rect.x - w },
      tree: { op: 'reflect', axis: 'x', at: (w - 1) / 2, child: tree } });
  }
  const scene = new Scene(height, config.glyphs), links = [];
  const raster = pieces.map((piece) => rasterize(piece.tree));
  if (raster.every((cells) => cells.size === 0)) {
    pieces[0].tree = group(pieces[0].tree, { op: 'mark', x: 0, y: 0, tone: 0, ink: 3 });
    raster[0] = rasterize(pieces[0].tree);
  }
  // Optional short straight connections join facing occupied cells. Do not
  // route through any other fragment's reserved rectangle or force a backbone.
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    if (!rng.chance(connectivity)) continue;
    const [a, b] = pieces[i].rect.x < pieces[j].rect.x ? [i, j] : [j, i];
    const ar = pieces[a].rect, br = pieces[b].rect;
    if (ar.x + ar.width >= br.x) continue;
    const candidates = [];
    for (let row = Math.max(ar.y, br.y); row < Math.min(ar.y + ar.height, br.y + br.height); row++) {
      const ac = [...raster[a].values()].filter((c) => c.y + ar.y === row);
      const bc = [...raster[b].values()].filter((c) => c.y + br.y === row);
      if (!ac.length || !bc.length) continue;
      const start = Math.max(...ac.map((c) => c.x)), end = Math.min(...bc.map((c) => c.x));
      if (pieces.some(({ rect: r }, k) => k !== a && k !== b && row >= r.y && row < r.y + r.height && r.x < br.x + end && r.x + r.width > ar.x + start)) continue;
      candidates.push({ row, a, b, start, end });
    }
    if (!candidates.length) continue;
    const link = rng.pick(candidates);
    if (links.some((l) => l.row === link.row && l.a === a)) continue;
    links.push(link);
    scene.wire({ row: link.row, x: fragmentAnchor(ar, link.start) }, { row: link.row, x: fragmentAnchor(br, link.end) }, 0, materials[config.material]);
  }
  const annotations = [];
  let occupied = 0;
  for (const piece of pieces) {
    const detail = decorate(raster[piece.id], config, ornament);
    annotations.push({ id: piece.id, expressions: detail.annotations, tones: detail.tones });
    occupied += detail.marks.size;
    for (const cell of detail.marks.values()) scene.text(piece.rect.y + cell.y, fragmentAnchor(piece.rect, cell.x), cell.glyph, cell.ink);
  }
  // Height is a planning budget. Remove empty outer rows and collapse long
  // internal voids to one row, retaining separation without wasting shell space.
  const usedRows = new Set(scene.runs.map((run) => run.kind === 'wire' ? run.from.row : run.row));
  const rowMap = {};
  let outputRows = 0, gap = false;
  const firstRow = Math.min(...usedRows), lastRow = Math.max(...usedRows);
  for (let y = firstRow; y <= lastRow; y++) {
    if (usedRows.has(y)) { rowMap[y] = outputRows++; gap = false; }
    else if (!gap) { outputRows++; gap = true; }
  }
  for (const run of scene.runs) {
    if (run.kind === 'wire') { run.from.row = rowMap[run.from.row]; run.to.row = rowMap[run.to.row]; }
    else run.row = rowMap[run.row];
  }
  scene.rows = outputRows + 1;
  const pair = ornament.pick(alphabets[config.alphabet].pairs);
  const label = pair[0] + config.label + pair[1];
  const input = expression(ornament, config.alphabet, 3, 2), inputText = renderExpression(input);
  scene.text(outputRows, left(), label, 2).text(outputRows, left(label.length + 1), inputText, 4);
  const right = expression(ornament, config.alphabet, 11, 4);
  const rightPrompt = rng.chance(0.65) ? renderExpression(right) : '';
  const combined = group(...pieces.map((p) => p.tree));
  return {
    scene, cursor: label.length + inputText.length + 2, rightPrompt,
    program: {
      engine: 'spatial-assembly/1', lattice: { columns: 79, rows: artHeight },
      traits: { spread, fragments, connectivity, focus, weights, operators, material: config.material, alphabet: config.alphabet, symmetry, density: config.density },
      derivation: { zone, splits: plan.splits, pieces, links }, rowMap, annotations, input, right: rightPrompt ? right : null,
      stats: { ...programStats(combined), fragments: pieces.length, links: links.length, occupiedCells: occupied, span: width },
    },
  };
}

function evolvingSeries(shared, width, height, complexity, rng) {
  const horizontal = width >= 6 || height < 3;
  const maximum = Math.max(1, Math.min(4, horizontal ? Math.floor(width / 3) : height, 1 + Math.ceil(complexity / 3)));
  const count = rng.int(1, maximum), step = Math.floor((horizontal ? width : height) / count);
  const phase = rng.int(0, 3), children = [], generations = [];
  for (let i = 0; i < count; i++) {
    const child = evolveMotif(shared, { width: horizontal ? Math.max(1, step - (count > 1 ? 1 : 0)) : width,
      height: horizontal ? height : 1, step: phase + i, ink: rng.pick([0, 1, 2, 3]) });
    children.push(move(child.tree, horizontal ? i * step : 0, horizontal ? 0 : i * step));
    generations.push(child.evolution);
  }
  return { tree: group(...children), generations };
}

// Arrangement and each logical fragment own separate streams. Replacing one
// fragment seed cannot consume another fragment's geometry or detail choices.
// Mirrored partners are one logical fragment and therefore remain a true pair.
function assembleEvolved(config) {
  const { height, fragments, spread, symmetry, complexity, connectivity } = config;
  const layoutSeed = config.layoutSeed ?? config.seed;
  const layout = random(layoutSeed, 'structure:assembly:layout');
  const vocabulary = random(layoutSeed, 'structure:assembly:vocabulary');
  const shared = deriveMotif(config.motifSeed ?? config.seed);
  const artHeight = height - 1, width = clamp(Math.round(76 * spread), 12, 76);
  const focus = layout.pick([0, 0, 0.5, 1, 1, layout.next()]);
  const mirrored = symmetry === 'mirror';
  const zone = { x: 1 + Math.round((76 - width) * (mirrored ? 0.5 : focus)), y: 0, width, height: artHeight };
  const plan = partition({ ...zone, width: mirrored ? Math.floor((width - 2) / 2) : width }, mirrored ? Math.ceil(fragments / 2) : fragments, layout);
  const weights = Object.fromEntries(families.map((name) => [name, vocabulary.chance(0.6) ? 0 : vocabulary.int(1, 5)]));
  if (!Object.values(weights).some(Boolean)) weights[vocabulary.pick(families)] = 3;
  const pieces = [], raster = [];
  for (const [index, region] of plan.regions.entries()) {
    const fragmentId = `piece:${index}`;
    const seed = config.fragmentSeeds?.[fragmentId] ?? `${config.seed}/${fragmentId}`;
    if (typeof seed !== 'string' || !seed.length || seed.length > 512) throw new Error('Fragment seed must contain 1–512 characters.');
    const structure = random(seed, 'structure:assembly:fragment');
    const w = layout.int(Math.max(2, Math.ceil(region.width * 0.55)), region.width);
    const h = layout.int(Math.max(1, Math.ceil(region.height * 0.5)), region.height);
    const rect = { x: region.x + layout.int(0, region.width - w), y: region.y + layout.int(0, region.height - h), width: w, height: h };
    const useMotif = structure.chance(0.55);
    const evolved = useMotif ? evolvingSeries(shared, w, h, complexity, structure) : null;
    // Cuts and thinning may leave an intentional void. The reservation survives
    // local rerolls even when no painted cells remain inside this fragment.
    const tree = clipped(evolved?.tree ?? motif(w, h, 2 + complexity * 2, structure, weights, config.density), w, h);
    const piece = { id: pieces.length, fragmentId, seed, rect, tree, source: useMotif ? 'motif' : 'recursive', ...(evolved ? { generations: evolved.generations } : {}) };
    pieces.push(piece);
    if (mirrored) pieces.push({ ...piece, id: pieces.length, mirrored: true,
      rect: { ...rect, x: 2 * zone.x + zone.width - rect.x - w },
      tree: { op: 'reflect', axis: 'x', at: (w - 1) / 2, child: tree } });
  }
  pieces.forEach((piece) => raster.push(rasterize(piece.tree)));
  const scene = new Scene(height, config.glyphs), links = [];
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    const rng = random(layoutSeed, `structure:assembly:link:${i}:${j}`);
    if (!rng.chance(connectivity)) continue;
    const [a, b] = pieces[i].rect.x < pieces[j].rect.x ? [i, j] : [j, i];
    const ar = pieces[a].rect, br = pieces[b].rect;
    if (ar.x + ar.width >= br.x) continue;
    const candidates = [];
    for (let row = Math.max(ar.y, br.y); row < Math.min(ar.y + ar.height, br.y + br.height); row++) {
      // Atomic attachment requires occupied facing rectangle edges. Text slots
      // are reservations, not guaranteed painted endpoints, so cannot be ports.
      // Drawing only the gap preserves every fragment's art and negative space
      // when a neighboring fragment changes its available attachment ports.
      const start = ar.width - 1, end = 0;
      const ac = raster[a].get(`${start},${row - ar.y}`), bc = raster[b].get(`${end},${row - br.y}`);
      if (!ac || !bc || ac.kind === 'text' || bc.kind === 'text') continue;
      if (pieces.some(({ rect: r }, k) => k !== a && k !== b && row >= r.y && row < r.y + r.height && r.x < br.x + end && r.x + r.width > ar.x + start)) continue;
      candidates.push({ row, a, b, start, end, ports: [
        { fragmentId: pieces[a].fragmentId, side: 'right', x: start, y: row - ar.y },
        { fragmentId: pieces[b].fragmentId, side: 'left', x: end, y: row - br.y },
      ] });
    }
    if (!candidates.length) continue;
    const link = rng.pick(candidates);
    if (links.some((l) => l.row === link.row && l.a === a)) continue;
    links.push(link);
    scene.fill(link.row, fragmentAnchor(ar, link.start + 1), fragmentAnchor(br, link.end), materials[config.material][10], 0);
  }
  const annotations = [];
  let occupied = 0;
  for (const piece of pieces) {
    const detail = decorate(raster[piece.id], config, random(`${config.ornamentSeed ?? config.seed}\0${piece.seed}`, 'ornament:assembly:fragment'));
    annotations.push({ id: piece.id, fragmentId: piece.fragmentId, expressions: detail.annotations, tones: detail.tones });
    occupied += detail.marks.size;
    for (const cell of detail.marks.values()) {
      scene.text(piece.rect.y + cell.y, fragmentAnchor(piece.rect, cell.x), cell.glyph, cell.ink);
      scene.runs.at(-1).fragmentId = piece.fragmentId;
    }
  }
  // Compact reservations, not the changing raster. Local rerolls preserve the
  // displayed position of every pinned fragment and the final input baseline.
  const reservedRows = new Set(pieces.flatMap(({ rect }) => Array.from({ length: rect.height }, (_, y) => rect.y + y)));
  const rowMap = {};
  let outputRows = 0, gap = false;
  for (let y = Math.min(...reservedRows); y <= Math.max(...reservedRows); y++) {
    if (reservedRows.has(y)) { rowMap[y] = outputRows++; gap = false; }
    else if (!gap) { outputRows++; gap = true; }
  }
  for (const run of scene.runs) {
    if (run.kind === 'wire') { run.from.row = rowMap[run.from.row]; run.to.row = rowMap[run.to.row]; }
    else run.row = rowMap[run.row];
  }
  scene.rows = outputRows + 1;
  const inputDetail = random(config.ornamentSeed ?? config.seed, 'ornament:assembly:input');
  const pair = inputDetail.pick(alphabets[config.alphabet].pairs);
  const label = pair[0] + config.label + pair[1];
  const input = expression(inputDetail, config.alphabet, 3, 2), inputText = renderExpression(input);
  scene.text(outputRows, left(), label, 2).text(outputRows, left(label.length + 1), inputText, 4);
  const right = expression(inputDetail, config.alphabet, 11, 4);
  const rightPrompt = random(layoutSeed, 'structure:assembly:right').chance(0.65) ? renderExpression(right) : '';
  return {
    scene, cursor: label.length + inputText.length + 2, rightPrompt,
    program: {
      engine: 'spatial-assembly/2', lattice: { columns: 79, rows: artHeight },
      traits: { spread, fragments, connectivity, focus, weights, operators: [...operators, 'evolve'], material: config.material, alphabet: config.alphabet, symmetry, density: config.density },
      motif: shared, derivation: { zone, splits: plan.splits, pieces, links }, rowMap, annotations, input, right: rightPrompt ? right : null,
      stats: { ...programStats(group(...pieces.map((p) => p.tree))), fragments: pieces.length, links: links.length, occupiedCells: occupied, span: width },
    },
  };
}
