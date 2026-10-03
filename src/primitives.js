// Small, theme-free geometry. Paths are orthogonal lists of vertices; the graph
// knows connections, not Unicode. Only the terminal renderer chooses junctions.
export const point = (x, y) => ({ x, y });
export const key = ({ x, y }) => `${x},${y}`;
export const edgeKey = (a, b) => [key(a), key(b)].sort().join('|');
export const translate = (path, dx, dy) => path.map(({ x, y }) => point(x + dx, y + dy));
export const reflect = (path, axis) => path.map(({ x, y }) => point(2 * axis - x, y));
export const repeat = (path, count, dx, dy = 0) => Array.from({ length: count }, (_, i) => translate(path, dx * i, dy * i));

export function trace(path) {
  const cells = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (![a.x, a.y, b.x, b.y].every(Number.isInteger) || (a.x !== b.x && a.y !== b.y)) {
      throw new Error('A stroke must connect integer points on one axis.');
    }
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
    const distance = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (!cells.length) cells.push(a);
    for (let j = 1; j <= distance; j++) cells.push(point(a.x + j * dx, a.y + j * dy));
  }
  return cells;
}

export class Network {
  constructor(width, height, reservations = []) {
    this.width = width;
    this.height = height;
    this.reservations = reservations;
    this.edges = new Map();
    this.nodes = new Map();
  }
  degree(p) { return this.nodes.get(key(p))?.neighbors.size ?? 0; }
  has(p) { return this.nodes.has(key(p)); }
  inside(p) {
    return p.x >= 0 && p.x < this.width && p.y >= 0 && p.y < this.height;
  }
  reserved(p) {
    return this.reservations.some((r) => p.x >= r.x && p.x <= r.right && p.y >= r.y && p.y <= r.bottom);
  }
  // Proposals are atomic. Contact with the graph is legal only at explicit ports;
  // crossing an occupied cell does not accidentally turn it into a junction.
  canAdd(paths, ports) {
    const allowed = new Set(ports.map(key));
    for (const path of paths) {
      const cells = trace(path);
      for (const p of cells) {
        if (!this.inside(p) || this.reserved(p) || (this.has(p) && !allowed.has(key(p)))) return false;
      }
      for (let i = 1; i < cells.length; i++) if (this.edges.has(edgeKey(cells[i - 1], cells[i]))) return false;
    }
    return true;
  }
  add(paths, { owner = 0, depth = 0, ink = 1 } = {}) {
    for (const path of paths) {
      const cells = trace(path);
      for (let i = 1; i < cells.length; i++) {
        const a = cells[i - 1], b = cells[i];
        this.edges.set(edgeKey(a, b), { a, b, owner, depth, ink });
        for (const [p, neighbor] of [[a, b], [b, a]]) {
          if (!this.nodes.has(key(p))) this.nodes.set(key(p), { ...p, neighbors: new Set() });
          this.nodes.get(key(p)).neighbors.add(key(neighbor));
        }
      }
    }
  }
  remove(path) {
    const cells = trace(path);
    for (let i = 1; i < cells.length; i++) {
      const a = cells[i - 1], b = cells[i];
      this.edges.delete(edgeKey(a, b));
      for (const [p, neighbor] of [[a, b], [b, a]]) {
        const node = this.nodes.get(key(p));
        node?.neighbors.delete(key(neighbor));
        if (node?.neighbors.size === 0) this.nodes.delete(key(p));
      }
    }
  }
  // Maximal runs stop when their provenance changes. New branches are therefore
  // available for subsequent rewrites, with parentage and nesting depth intact.
  spans(horizontalOnly = false) {
    const spans = [];
    const consumed = new Set();
    for (const edge of this.edges.values()) {
      const horizontal = edge.a.y === edge.b.y;
      if (horizontalOnly && !horizontal) continue;
      const dx = horizontal ? 1 : 0, dy = horizontal ? 0 : 1;
      const ordered = [edge.a, edge.b].sort((a, b) => horizontal ? a.x - b.x : a.y - b.y);
      let [a, b] = ordered;
      if (consumed.has(edgeKey(a, b))) continue;
      const compatible = (p, q) => {
        const e = this.edges.get(edgeKey(p, q));
        return e && e.owner === edge.owner && e.ink === edge.ink;
      };
      while (compatible(point(a.x - dx, a.y - dy), a)) a = point(a.x - dx, a.y - dy);
      while (compatible(b, point(b.x + dx, b.y + dy))) b = point(b.x + dx, b.y + dy);
      const cells = trace([a, b]);
      for (let i = 1; i < cells.length; i++) consumed.add(edgeKey(cells[i - 1], cells[i]));
      spans.push({ a, b, owner: edge.owner, depth: edge.depth, ink: edge.ink });
    }
    return spans;
  }
  components() {
    const visited = new Set();
    let count = 0;
    for (const id of this.nodes.keys()) {
      if (visited.has(id)) continue;
      count++;
      const pending = [id];
      while (pending.length) {
        const next = pending.pop();
        if (visited.has(next)) continue;
        visited.add(next);
        for (const neighbor of this.nodes.get(next).neighbors) pending.push(neighbor);
      }
    }
    return count;
  }
}
