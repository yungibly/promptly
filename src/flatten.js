// Resolve overlays and wire junctions in the generator. A span keeps its affine
// boundaries so the export needs only string padding, never a shell cell canvas.
const x = (at, offset = 0) => ({ at, offset });
const add = (a, offset) => x(a.at, a.offset + offset);
const value = (a, width) => Math.trunc(a.at * (width - 1) / 1000) + a.offset;
const equal = (a, b) => a.at === b.at && a.offset === b.offset;
const key = (a) => `${a.at}:${a.offset}`;
const chars = (s) => [...s];

export function coordinate(a) {
  if (!a.at) return String(a.offset);
  const base = a.at === 1000 ? '_promptly_w' : `${a.at}*(_promptly_w-1)/1000`;
  const offset = a.offset - (a.at === 1000 ? 1 : 0);
  return base + (offset ? `${offset > 0 ? '+' : ''}${offset}` : '');
}

export function distance(to, from) {
  return to.at === from.at ? String(to.offset - from.offset) : `(${coordinate(to)})-(${coordinate(from)})`;
}

function overlay(spans, from, to, width, update) {
  const lo = value(from, width), hi = value(to, width);
  if (hi <= lo) return spans;
  return spans.flatMap((span) => {
    const start = value(span.from, width), end = value(span.to, width);
    if (end <= lo || start >= hi) return [span];
    const a = lo > start ? from : span.from, b = hi < end ? to : span.to;
    const result = [];
    if (start < lo) result.push({ ...span, to: from });
    result.push({ ...update(span), from: a, to: b });
    if (end > hi) result.push({ ...span, from: to });
    return result;
  });
}

function textAt(span, width) {
  const pattern = chars(span.text), start = value(span.from, width) - value(span.origin, width);
  const count = value(span.to, width) - value(span.from, width);
  return Array.from({ length: count }, (_, i) => pattern[((start + i) % pattern.length + pattern.length) % pattern.length]).join('');
}

export function flatten({ scene, cursor }, width) {
  const rows = Array.from({ length: scene.rows }, () => [{ from: x(0), to: x(1000, 1), text: ' ', origin: x(0), ink: 0, edges: 0 }]);
  const paint = (row, from, to, text, ink, mask = 0, role = undefined) => {
    if (!rows[row] || !text.length) return;
    rows[row] = overlay(rows[row], from, to, width, (old) => mask
      ? { ...old, text: chars(text)[old.edges | mask], origin: from,
        ink: typeof old.ink === 'number' && typeof ink === 'number' ? Math.max(old.ink, ink) : ink,
        edges: old.edges | mask, role: undefined }
      : { ...old, text, origin: from, ink, role });
  };
  for (const run of scene.runs) {
    if (run.kind === 'wire') {
      const a = run.from, b = run.to;
      if (a.row === b.row) {
        const [left, right] = value(a.x, width) <= value(b.x, width) ? [a.x, b.x] : [b.x, a.x];
        if (value(left, width) === value(right, width)) continue;
        paint(a.row, left, add(left, 1), run.charset, run.ink, 2);
        paint(a.row, add(left, 1), right, run.charset, run.ink, 10);
        paint(a.row, right, add(right, 1), run.charset, run.ink, 8);
      } else if (value(a.x, width) === value(b.x, width)) {
        const lo = Math.min(a.row, b.row), hi = Math.max(a.row, b.row);
        for (let row = lo; row <= hi; row++) paint(row, a.x, add(a.x, 1), run.charset, run.ink, (row > lo ? 1 : 0) | (row < hi ? 4 : 0));
      }
    } else if (!run.minWidth || width >= run.minWidth) {
      const count = chars(run.text).length;
      const shift = run.align === 'right' ? 1 - count : run.align === 'center' ? -Math.floor(count / 2) : 0;
      const from = add(run.x, shift);
      const to = run.end ? add(run.end, shift) : add(from, count);
      paint(run.row, from, to, run.text, run.ink, 0, run.role);
    }
  }
  return rows.map((spans, row) => {
    if (row === rows.length - 1) {
      spans = spans.filter((s) => value(s.from, width) < cursor).map((s) => value(s.to, width) > cursor ? { ...s, to: x(0, cursor) } : s);
    } else {
      while (spans.length) {
        const last = spans.at(-1), text = textAt(last, width);
        // Spaces are visible material inside a filled tile; slots reserve cells
        // even when their eventual dynamic value is shorter than the capacity.
        if (last.role || typeof last.ink === 'object' && last.ink.bg != null) break;
        const trailing = chars(text).length - chars(text.trimEnd()).length;
        if (trailing === chars(text).length) { spans.pop(); continue; }
        if (trailing) last.to = add(last.to, -trailing);
        break;
      }
      if (!spans.length) spans = [{ from: x(0), to: x(0, 1), text: ' ', origin: x(0), ink: 0 }];
    }
    const merged = [];
    for (const span of spans) {
      const previous = merged.at(-1);
      if (previous && previous.role === span.role && (!span.role || equal(previous.origin, span.origin)) && JSON.stringify(previous.ink) === JSON.stringify(span.ink) && previous.text === span.text && equal(previous.to, span.from)
        && (chars(span.text).length === 1 || equal(previous.origin, span.origin))) previous.to = span.to;
      else merged.push({ ...span });
    }
    return merged.map((span) => span.role && value(span.from, width) === value(span.origin, width)
      && value(span.to, width) - value(span.from, width) === span.text.length
      ? { ...span, from: span.origin, to: add(span.origin, span.text.length) } : span);
  });
}

export function spanLiteral(span) {
  if (span.from.at !== span.to.at) return null;
  const pattern = chars(span.text), count = span.to.offset - span.from.offset;
  if (pattern.length > 1 && span.from.at !== span.origin.at) return null;
  const start = pattern.length === 1 ? 0 : span.from.offset - span.origin.offset;
  return Array.from({ length: count }, (_, i) => pattern[((start + i) % pattern.length + pattern.length) % pattern.length]).join('');
}

export const spanKey = (span) => `${key(span.from)}/${key(span.to)}/${key(span.origin)}/${JSON.stringify(span.ink)}/${span.role ?? ''}/${span.text}`;
