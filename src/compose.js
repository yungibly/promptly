import { Scene, anchor, left } from './scene.js';
import { Network, point as p, key, trace, reflect, repeat } from './primitives.js';
import { expression, renderExpression, alphabets, materials } from './ornaments.js';
import { random } from './random.js';
import { deriveMotif, evolveMotif } from './motifs.js';

const operations = ['detour', 'loop', 'branch', 'fork', 'stitch', 'repeat'];
const offset = (point, dx, dy) => p(point.x + dx, point.y + dy);

function proposal(network, span, op, rng) {
  const { a, b } = span;
  const length = b.x - a.x;
  if (length < 2) return null;
  const x = rng.int(a.x, b.x);
  const port = p(x, a.y);
  const direction = rng.pick([-1, 1]);
  const distance = rng.int(1, 3);
  const y = a.y + direction * distance;
  if (op === 'branch') {
    const target = p(x, y);
    const tip = offset(target, rng.pick([-1, 1]) * rng.int(1, 5), 0);
    return { paths: [[port, target, tip]], ports: [port] };
  }
  if (op === 'fork') {
    const joint = p(x, y);
    const arm = rng.int(1, 4);
    return { paths: [[port, joint], [offset(joint, -arm, 0), offset(joint, arm, 0)]], ports: [port] };
  }
  if (op === 'stitch') {
    for (let dy = 1; dy <= 4; dy++) {
      const target = offset(port, 0, direction * dy);
      if (network.has(target)) return { paths: [[port, target]], ports: [port, target] };
    }
    return null;
  }
  if (op === 'repeat') {
    if (length < 5) return null;
    const step = rng.int(3, 5);
    const count = Math.min(rng.int(2, 4), Math.floor(length / step));
    if (count < 2) return null;
    const start = p(a.x + 1, a.y);
    const unit = [start, offset(start, 0, direction), offset(start, 1, direction)];
    return { paths: repeat(unit, count, step), ports: Array.from({ length: count }, (_, i) => offset(start, i * step, 0)) };
  }
  const x1 = rng.int(a.x, b.x - 2);
  const x2 = rng.int(x1 + 2, Math.min(b.x, x1 + 10));
  const first = p(x1, a.y), last = p(x2, a.y);
  const result = { paths: [[first, p(x1, y), p(x2, y), last]], ports: [first, last] };
  if (op === 'detour') {
    // A replacement cannot cut off an existing branch.
    if (trace([first, last]).slice(1, -1).some((cell) => network.degree(cell) !== 2)) return null;
    result.remove = [first, last];
  }
  return result;
}

function compileNetwork(network, scene, cols, material) {
  const x = (n) => anchor(Math.round(n * 1000 / (cols - 1)), n === 0 ? 1 : n === cols - 1 ? -1 : 0);
  for (const span of network.spans()) {
    scene.wire({ row: span.a.y, x: x(span.a.x) }, { row: span.b.y, x: x(span.b.x) }, span.ink, materials[material]);
  }
  return x;
}

// Width-safe layout planning, not a second renderer. Reserve annotation bounds
// against graph occupancy at the narrowest full viewport; wider canvases only
// expand the distances between anchors. No terminal output is produced here.
function annotations(network, scene, config, rng, xAnchor) {
  if (config.evolved) return evolvedAnnotations(network, scene, config, xAnchor);
  const { alphabet, complexity, label, labelRow, cols } = config;
  const minStep = 78 / (cols - 1);
  const occupied = new Set(network.nodes.keys());
  const placements = [];
  const reserve = (x, y, radius) => {
    for (let dx = -radius; dx <= radius; dx++) occupied.add(key(p(x + dx, y)));
  };
  const put = (x, y, node, ink, role) => {
    const text = renderExpression(node);
    scene.text(y, xAnchor(x), text, ink, 'center');
    const radius = Math.ceil((text.length / 2 + 1) / minStep);
    reserve(x, y, radius);
    placements.push({ role, x, y, expression: node });
  };
  const labelPair = rng.pick(alphabets[alphabet].pairs);
  const labelText = labelPair[0] + label + labelPair[1];
  scene.text(labelRow, left(3), labelText, 2);
  for (let i = 0; i < Math.ceil((labelText.length + 5) / minStep); i++) occupied.add(key(p(i, labelRow)));

  // Endpoint ornaments are one atom. They cannot obscure another connection.
  const terminals = [...network.nodes.values()].filter((n) => n.neighbors.size === 1 && n.x > 1 && n.x < cols - 2);
  for (const terminal of terminals) {
    if (rng.chance(0.55)) put(terminal.x, terminal.y, expression(rng, alphabet, 1), rng.pick([2, 3, 4]), 'terminal');
  }

  // Carve occasional labels into uninterrupted horizontal runs. The text takes
  // over a short piece of that one stroke, with its connections remaining clear.
  const spans = network.spans(true).filter(({ a, b }) => b.x - a.x >= 5);
  for (let i = 0; i < complexity + 2 && spans.length; i++) {
    const span = rng.pick(spans);
    const x = rng.int(span.a.x + 2, span.b.x - 2), y = span.a.y;
    const node = expression(rng, alphabet, rng.int(3, 9));
    const text = renderExpression(node);
    const radius = Math.ceil((text.length / 2 + 1) / minStep);
    if (x - radius <= span.a.x || x + radius >= span.b.x) continue;
    if (Array.from({ length: radius * 2 + 1 }, (_, j) => p(x + j - radius, y)).some((cell) => network.degree(cell) !== 2)) continue;
    if (placements.some((item) => item.y === y && Math.abs(item.x - x) < radius + 3)) continue;
    put(x, y, { op: 'sequence', separator: '', children: [{ op: 'atom', value: ' ' }, node, { op: 'atom', value: ' ' }] }, rng.pick([2, 3]), 'inline');
  }

  // Recursive micro-expressions occupy actual holes between the strokes. Every
  // successful placement claims space, so detail cannot turn into overpainting.
  const attempts = 30 + complexity * 15;
  let placed = 0;
  for (let i = 0; i < attempts && placed < complexity * 2; i++) {
    const x = rng.int(2, cols - 3), y = rng.int(0, network.height - 1);
    const node = expression(rng, alphabet, rng.int(1, 3 + complexity));
    const text = renderExpression(node);
    const radius = Math.ceil((text.length / 2 + 1) / minStep);
    if (x - radius < 1 || x + radius >= cols - 1) continue;
    if (Array.from({ length: radius * 2 + 1 }, (_, j) => key(p(x + j - radius, y))).some((id) => occupied.has(id))) continue;
    put(x, y, node, rng.pick([0, 1, 3]), 'free');
    placed++;
  }
  return placements;
}

function evolvedAnnotations(network, scene, config, xAnchor) {
  const { alphabet, complexity, label, labelRow, cols } = config;
  const structure = random(config.artSeed ?? config.seed, 'structure:network:annotations');
  const minStep = 78 / (cols - 1), occupied = new Set(network.nodes.keys()), slots = [];
  const shared = deriveMotif(config.motifSeed ?? config.seed);
  const detailSeed = config.ornamentSeed ?? config.seed;
  const reserve = (x, y, radius) => {
    for (let dx = -radius; dx <= radius; dx++) occupied.add(key(p(x + dx, y)));
  };
  const radiusFor = (width) => Math.ceil((width / 2 + 1) / minStep);
  const put = (x, y, width, ink, role) => {
    const motif = structure.chance(0.4);
    slots.push({ id: slots.length, role, x, y, width, ink, motif,
      ...(motif ? { step: slots.filter((slot) => slot.motif).length % 4 } : {}) });
    reserve(x, y, radiusFor(width));
  };
  const labelPair = random(detailSeed, 'ornament:network:label').pick(alphabets[alphabet].pairs);
  const labelText = labelPair[0] + label + labelPair[1];
  scene.text(labelRow, left(3), labelText, 2);
  const labelEnd = Math.ceil((labelText.length + 5) / minStep);
  for (let i = 0; i < labelEnd; i++) occupied.add(key(p(i, labelRow)));
  const clearOfLabel = (x, y, radius) => y !== labelRow || x - radius >= labelEnd;

  for (const terminal of network.nodes.values()) {
    if (terminal.neighbors.size !== 1 || terminal.x <= 1 || terminal.x >= cols - 2) continue;
    if (structure.chance(0.55) && clearOfLabel(terminal.x, terminal.y, 1)) put(terminal.x, terminal.y, 1, structure.pick([2, 3, 4]), 'terminal');
  }
  const spans = network.spans(true).filter(({ a, b }) => b.x - a.x >= 5);
  for (let i = 0; i < complexity + 2 && spans.length; i++) {
    const span = structure.pick(spans), x = structure.int(span.a.x + 2, span.b.x - 2), y = span.a.y;
    const width = structure.int(3, 9) + 2, radius = radiusFor(width);
    if (x - radius <= span.a.x || x + radius >= span.b.x || !clearOfLabel(x, y, radius)) continue;
    if (Array.from({ length: radius * 2 + 1 }, (_, j) => p(x + j - radius, y)).some((cell) => network.degree(cell) !== 2)) continue;
    if (slots.some((slot) => slot.y === y && Math.abs(slot.x - x) < radius + radiusFor(slot.width))) continue;
    put(x, y, width, structure.pick([2, 3]), 'inline');
  }
  let placed = 0;
  for (let i = 0; i < 30 + complexity * 15 && placed < complexity * 2; i++) {
    const x = structure.int(2, cols - 3), y = structure.int(0, network.height - 1);
    const width = structure.int(1, 3 + complexity), radius = radiusFor(width);
    if (x - radius < 1 || x + radius >= cols - 1) continue;
    if (Array.from({ length: radius * 2 + 1 }, (_, j) => key(p(x + j - radius, y))).some((id) => occupied.has(id))) continue;
    put(x, y, width, structure.pick([0, 1, 3]), 'free');
    placed++;
  }

  // Structural slots are complete before any alphabet, line material, or detail
  // choice is read. A motif echoes elsewhere in the prompt without moving its
  // text reservations or changing a single edge in the network graph.
  const placements = [];
  for (const slot of slots) {
    const detail = random(detailSeed, `ornament:network:annotation:${slot.id}`);
    const padding = slot.role === 'inline' ? 1 : 0, width = slot.width - padding * 2;
    let text, node, motif;
    if (slot.motif) {
      const evolved = evolveMotif(shared, { width, step: slot.step, ink: slot.ink });
      const tones = Array.from({ length: 4 }, () => detail.pick(alphabets[alphabet].atoms));
      const chars = Array(width).fill(' ');
      for (const cell of evolved.cells) chars[cell.x] = cell.kind === 'mark' ? tones[cell.tone] : materials[config.material][cell.bits] || tones[0];
      text = chars.join(''); node = { op: 'atom', value: text };
      motif = { tree: evolved.tree, evolution: evolved.evolution };
    } else {
      node = expression(detail, alphabet, width);
      const rendered = renderExpression(node), margin = Math.floor((width - rendered.length) / 2);
      text = ' '.repeat(margin) + rendered + ' '.repeat(width - rendered.length - margin);
    }
    text = ' '.repeat(padding) + text + ' '.repeat(padding);
    scene.text(slot.y, xAnchor(slot.x), text, slot.ink, 'center');
    placements.push({ role: slot.role, x: slot.x, y: slot.y, width: slot.width, expression: node, ...(motif ? { motif } : {}) });
  }
  return { placements, plan: slots, motif: shared };
}

export function compose(config) {
  const { rng, ornament, complexity, glyphs, height, symmetry, material, alphabet } = config;
  const cols = 41;
  const artHeight = height - 1;
  const planningWidth = symmetry === 'mirror' ? (cols + 1) / 2 : cols;
  const labelRow = rng.pick([0, artHeight - 1]);
  const labelEnd = Math.ceil((config.label.length + 8) / (78 / (cols - 1)));
  const reservations = [{ x: 1, right: labelEnd, y: labelRow, bottom: labelRow }];
  const graph = new Network(planningWidth, artHeight, reservations);
  const startRow = rng.int(1, Math.max(1, artHeight - 2));
  const spine = [p(0, startRow)];
  let x = 0, y = startRow;
  while (x < planningWidth - 1) {
    x = Math.min(planningWidth - 1, x + rng.int(5, 12));
    spine.push(p(x, y));
    if (x < planningWidth - 1) {
      y = rng.int(1, Math.max(1, artHeight - 2));
      spine.push(p(x, y));
    }
  }
  graph.add([spine]);
  const derivation = [{ id: 0, op: 'route', parent: null, depth: 0, paths: [spine] }];
  // Biases are sampled per specimen. There is no lookup of named silhouettes.
  const weights = Object.fromEntries(operations.map((op) => [op, rng.int(1, 5)]));
  const bag = operations.flatMap((op) => Array(weights[op]).fill(op));
  const budget = 3 + complexity * 4;
  const occupiedLimit = Math.max(graph.nodes.size + 10, Math.floor(planningWidth * artHeight * config.density));
  for (let attempt = 0; attempt < budget * 24 && derivation.length <= budget && graph.nodes.size < occupiedLimit; attempt++) {
    const candidates = graph.spans(true).filter((span) => span.b.x - span.a.x >= 2);
    if (!candidates.length) break;
    const span = rng.pick(candidates), op = rng.pick(bag);
    const candidate = proposal(graph, span, op, rng);
    if (!candidate || !graph.canAdd(candidate.paths, candidate.ports)) continue;
    const id = derivation.length;
    if (candidate.remove) graph.remove(candidate.remove);
    graph.add(candidate.paths, { owner: id, depth: span.depth + 1, ink: rng.pick([0, 1, 1]) });
    derivation.push({ id, op, parent: span.owner, depth: span.depth + 1, ...candidate });
  }
  // Reflection transforms the derived graph. It does not select a mirrored
  // template; the same transformation works on every possible derivation.
  const network = new Network(cols, artHeight);
  for (const edge of graph.edges.values()) {
    network.add([[edge.a, edge.b]], edge);
    if (symmetry === 'mirror') network.add([reflect([edge.a, edge.b], (cols - 1) / 2)], edge);
  }
  const scene = new Scene(height, glyphs);
  const xAnchor = compileNetwork(network, scene, cols, material);
  // Connect the safe input row to the generated graph as a separate small path.
  scene.wire({ row: startRow, x: xAnchor(0) }, { row: height - 1, x: xAnchor(0) }, 1, materials[material]);
  scene.wire({ row: height - 1, x: xAnchor(0) }, { row: height - 1, x: left(3) }, 1, materials[material]);
  const annotationResult = annotations(network, scene, { ...config, cols, labelRow }, ornament, xAnchor);
  const placements = config.evolved ? annotationResult.placements : annotationResult;
  const inputExpression = expression(ornament, alphabet, 3, 2);
  const input = renderExpression(inputExpression);
  scene.text(height - 1, left(4), input, 4);
  const rightExpression = expression(ornament, alphabet, 9);
  const rightPrompt = renderExpression(rightExpression);
  const componentCount = network.components();
  return {
    scene, cursor: input.length + 5, rightPrompt,
    program: {
      engine: 'graph-rewrite/1', lattice: { columns: cols, planningColumns: planningWidth, rows: artHeight },
      reservations,
      traits: { material, alphabet, symmetry, density: config.density, weights },
      derivation, annotations: placements, input: inputExpression, right: rightExpression,
      ...(config.evolved ? { annotationPlan: annotationResult.plan, motif: annotationResult.motif } : {}),
      stats: {
        rewrites: derivation.length - 1,
        maxDepth: Math.max(...derivation.map((step) => step.depth)),
        vertices: network.nodes.size, edges: network.edges.size,
        components: componentCount, cycles: network.edges.size - network.nodes.size + componentCount,
        junctions: [...network.nodes.values()].filter((node) => node.neighbors.size > 2).length,
        operations: Object.fromEntries(operations.map((op) => [op, derivation.filter((step) => step.op === op).length])),
      },
    },
  };
}
