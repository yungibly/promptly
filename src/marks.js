// A small cell-art algebra. Geometry stays independent of font, color palette,
// and ornament text. These are drawing operations, never whole-prompt layouts.
const id = (x, y) => `${x},${y}`;
export const group = (...children) => ({ op: 'group', children });
export const move = (child, dx, dy) => ({ op: 'translate', dx, dy, child });
export const stroke = (x1, y1, x2, y2, ink = 1) => ({ op: 'stroke', a: [x1, y1], b: [x2, y2], ink });

export function line(a, b) {
  let [x, y] = a.map(Math.round);
  const [endX, endY] = b.map(Math.round);
  const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
  const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
  let error = dx + dy;
  const cells = [];
  for (;;) {
    cells.push([x, y]);
    if (x === endX && y === endY) return cells;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
  }
}

// Orthogonal directions share the existing network material masks. Diagonals
// add two undirected bits; the glyph is selected only after geometry is complete.
function direction(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (dx && dy) return dx * dy < 0 ? 16 : 32;
  return dy < 0 ? 1 : dx > 0 ? 2 : dy > 0 ? 4 : 8;
}

export function rasterize(tree) {
  let slot = 0;
  const merge = (target, cells) => {
    for (const [key, cell] of cells) {
      const old = target.get(key);
      if (old?.kind === 'stroke' && cell.kind === 'stroke') {
        target.set(key, { ...cell, bits: old.bits | cell.bits, ink: Math.max(old.ink, cell.ink) });
      } else if (!old || cell.kind !== 'stroke' || old.kind === 'stroke') target.set(key, cell);
    }
    return target;
  };
  function draw(node, transform) {
    const cells = new Map();
    const put = (x, y, data) => {
      [x, y] = transform([x, y]).map(Math.round);
      cells.set(id(x, y), { x, y, ...data });
    };
    switch (node.op) {
      case 'stroke': {
        const points = line(transform(node.a), transform(node.b));
        points.forEach(([x, y], i) => cells.set(id(x, y), {
          x, y, kind: 'stroke', ink: node.ink,
          bits: (i ? direction(points[i], points[i - 1]) : 0) | (i + 1 < points.length ? direction(points[i], points[i + 1]) : 0),
        }));
        break;
      }
      case 'mark': put(node.x, node.y, { kind: 'mark', ink: node.ink, tone: node.tone ?? 0 }); break;
      case 'pixel': put(node.x, node.y, { kind: 'pixel', ink: node.ink, level: node.level }); break;
      case 'text': {
        const token = slot++;
        for (let x = 0; x < node.width; x++) put(node.x + x, node.y, { kind: 'text', ink: node.ink, slot: token });
        break;
      }
      case 'group': for (const child of node.children) merge(cells, draw(child, transform)); break;
      case 'translate': return draw(node.child, ([x, y]) => transform([x + node.dx, y + node.dy]));
      case 'reflect': return draw(node.child, ([x, y]) => transform(node.axis === 'x' ? [2 * node.at - x, y] : [x, 2 * node.at - y]));
      case 'repeat':
        for (let i = 0; i < node.count; i++) merge(cells, draw(node.child, ([x, y]) => transform([x + i * node.dx, y + i * node.dy])));
        break;
      case 'clip':
      case 'cut': {
        // Evaluate masks in their own local coordinate system, then transform
        // the surviving cells (including direction bits) as a final operation.
        const local = draw(node.child, (p) => p);
        for (const cell of local.values()) {
          const inside = cell.x >= node.x && cell.x < node.x + node.width && cell.y >= node.y && cell.y < node.y + node.height;
          if (inside !== (node.op === 'clip')) continue;
          const { x, y, ...data } = cell;
          if (cell.kind === 'stroke') {
            data.bits = 0;
            for (const [bit, dx, dy] of [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0], [16, 1, -1], [32, 1, 1]]) {
              if (cell.bits & bit) data.bits |= direction(transform([x, y]), transform([x + dx, y + dy]));
            }
          }
          put(x, y, data);
        }
        break;
      }
      default: throw new Error(`Unknown cell-art operation: ${node.op}`);
    }
    return cells;
  }
  return draw(tree, (p) => p);
}

export function programStats(tree) {
  const operations = {};
  let depth = 0, nodes = 0;
  function visit(node, d) {
    nodes++; depth = Math.max(depth, d);
    operations[node.op] = (operations[node.op] ?? 0) + 1;
    if (node.child) visit(node.child, d + 1);
    for (const child of node.children ?? []) visit(child, d + 1);
  }
  visit(tree, 0);
  return { nodes, maxDepth: depth, operations };
}
