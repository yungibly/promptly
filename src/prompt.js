import { Scene, left, right } from './scene.js';
import { group, stroke, rasterize, programStats } from './marks.js';
import { alphabets, materials, expression, renderExpression } from './ornaments.js';

// Geometry starts with meaningful prompt roles. Every local operation attaches
// to an inscription, its adjacent ornaments, or the command introducer. There is
// no independent picture canvas in this mode; the other engines retain that space.
export function composePrompt(config) {
  const { rng, ornament, height, complexity, label, symmetry, material, alphabet } = config;
  const scene = new Scene(height, config.glyphs);
  const inputRow = height - 1;
  const labelRow = height === 3 ? rng.int(0, 1) : 0;
  const tokens = [], attachments = [], geometry = [];
  let x = height === 1 ? 0 : rng.int(0, 2);
  const token = (role, width, ink, extra = {}) => {
    const part = { role, x, row: labelRow, width, ink, ...extra };
    tokens.push(part); x += width;
    return part;
  };
  const gap = (width = 1) => { x += width; };
  const join = () => {
    const part = token('join', rng.int(1, 3), 1, { form: rng.pick(['stroke', 'points', 'slashes']) });
    attachments.push({ op: 'join', target: 'label', ...part });
  };

  if (rng.chance(0.65)) {
    token('ornament', rng.int(1, 3), 3);
    if (rng.chance(0.5)) join(); else gap();
  }
  const layers = rng.int(0, Math.min(3, 1 + Math.floor(complexity / 4)));
  const labelStart = x;
  for (let i = 0; i < layers; i++) token('open', 1, i % 2 ? 3 : 1, { layer: i });
  const inscription = token('label', label.length, 2);
  for (let i = layers - 1; i >= 0; i--) token('close', 1, i % 2 ? 3 : 1, { layer: i });
  const labelEnd = x;
  const count = Math.min(3, config.fragments, 1 + Math.floor(complexity * config.density / 2));
  const bandLimit = Math.min(44, label.length + (height === 1 ? 13 : 24));
  for (let i = 0; i < count && x + 4 <= bandLimit; i++) {
    if (rng.chance(0.55)) join(); else gap();
    token('ornament', Math.min(bandLimit - x, rng.int(1, Math.min(7, 2 + complexity))), rng.pick([3, 4]));
  }
  const bandEnd = x;

  if (height === 3) {
    const row = labelRow === 0 ? 1 : 0;
    const start = Math.max(0, labelStart - 1), end = labelEnd;
    const openLeft = rng.chance(0.25), openRight = symmetry === 'mirror' ? openLeft : rng.chance(0.25);
    const bevel = rng.chance(0.35) ? 1 : 0;
    const cap = [stroke(start + bevel, row, end - bevel, row, 1)];
    if (!openLeft) cap.push(stroke(start + bevel, row, start, labelRow, 1));
    if (!openRight) cap.push(stroke(end - bevel, row, end, labelRow, 1));
    let child = group(...cap);
    if (complexity >= 4 && end - start >= 5) {
      const notch = rng.int(start + 2, end - 2);
      child = { op: 'cut', x: notch, y: row, width: 1, height: 1, child };
      tokens.push({ role: 'ornament', x: notch, row, width: 1, ink: 4 });
    }
    geometry.push(child);
    attachments.push({ op: 'cap', target: 'label', x: start, row, width: end - start + 1, bevel, side: labelRow ? 'above' : 'below' });
  }

  const markerWidth = rng.chance(0.5) ? 1 : 3;
  const markerX = height === 1 ? bandEnd + 1 : rng.int(2, 6);
  const marker = { x: markerX, row: inputRow, width: markerWidth };
  if (height > 1) {
    const foldX = Math.min(labelStart, markerX - 2);
    const connected = rng.chance(0.6);
    if (connected) {
      geometry.push(stroke(foldX, labelRow, foldX, inputRow, 1), stroke(foldX, inputRow, markerX - 1, inputRow, 1));
      attachments.push({ op: 'fold', target: 'input', x: foldX, row: labelRow, endRow: inputRow, endX: markerX - 1 });
    } else {
      tokens.push({ role: 'ornament', x: markerX - 2, row: inputRow, width: 1, ink: 1 });
      attachments.push({ op: 'echo', target: 'input', x: markerX - 2, row: inputRow, width: 1 });
    }
  }

  // A matching right-hand inscription belongs on the label's baseline, with a
  // bridge only when explicitly sampled. The final-row accent is native RPROMPT.
  const rightHeader = height > 1 && rng.chance(config.spread * 0.7)
    ? { row: labelRow, width: rng.int(5, 12) } : null;
  const linked = rightHeader !== null && rng.chance(config.connectivity);
  if (linked) scene.wire({ row: labelRow, x: left(bandEnd + 1) }, { row: labelRow, x: right(-rightHeader.width - 1) }, 0, materials[material]);

  const tree = group(...geometry);
  for (const cell of rasterize(tree).values()) {
    const glyph = cell.bits & 48 ? ((cell.bits & 48) === 48 ? '╳' : cell.bits & 16 ? '╱' : '╲') : cell.bits ? materials[material][cell.bits] : '·';
    scene.text(cell.y, left(cell.x), glyph, cell.ink);
  }
  const pairs = Array.from({ length: layers }, () => ornament.pick(alphabets[alphabet].pairs));
  const annotations = [];
  for (const part of tokens) {
    let text;
    if (part.role === 'label') text = label;
    else if (part.role === 'open') text = pairs[part.layer][0];
    else if (part.role === 'close') text = pairs[part.layer][1];
    else if (part.role === 'join') text = (part.form === 'stroke' ? materials[material][10] : part.form === 'points' ? '·' : '╱').repeat(part.width);
    else {
      const expr = expression(ornament, alphabet, part.width, 2 + Math.floor(complexity / 2));
      text = renderExpression(expr);
      annotations.push({ role: 'ornament', x: part.x, row: part.row, expression: expr });
    }
    // Each ornament has a structural capacity; detail mutations cannot push the
    // label or command entry around. Text remains readable inside nested caps.
    scene.text(part.row, left(part.x + Math.floor((part.width - text.length) / 2)), text, part.ink);
  }
  const pointer = ornament.pick(['›', '❯', '▷', '»', '>']);
  if (markerWidth > 1) {
    const expr = expression(ornament, alphabet, 1);
    scene.text(inputRow, left(markerX), renderExpression(expr), 3);
    annotations.push({ role: 'input', x: markerX, row: inputRow, expression: expr });
  }
  scene.text(inputRow, left(markerX + markerWidth - 1), pointer, 4);
  const pair = pairs[0] ?? ornament.pick(alphabets[alphabet].pairs);
  if (rightHeader) {
    const expr = expression(ornament, alphabet, rightHeader.width - 2, 4);
    const text = pair[0] + renderExpression(expr) + pair[1];
    scene.text(rightHeader.row, right(-1), text, 3, 'right');
    annotations.push({ role: 'right-header', expression: expr });
  }
  const rightPresent = rng.chance(0.65);
  const rightExpr = expression(ornament, alphabet, rng.int(1, 7), 4);
  const rightPrompt = rightPresent ? pair[0] + renderExpression(rightExpr) + pair[1] : '';
  const stats = programStats(tree);
  return {
    scene, cursor: markerX + markerWidth + 1, rightPrompt,
    program: {
      engine: 'prompt-composition/1', lattice: { columns: 79, rows: height },
      traits: { material, alphabet, symmetry, density: config.density, spread: config.spread, fragments: config.fragments, connectivity: config.connectivity },
      derivation: { inscription, marker, tokens, attachments, geometry: tree, rightHeader, linked, rightPresent },
      annotations, input: { pointer }, right: rightPresent ? rightExpr : null,
      stats: { ...stats, fragments: tokens.filter((part) => part.role === 'ornament').length, links: Number(linked), span: bandEnd, layers },
    },
  };
}
