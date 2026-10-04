import { random } from './random.js';
import { group, stroke, rasterize } from './marks.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const rounded = (n) => Math.round(n * 1e6) / 1e6;

// A motif records a rhythm of small strokes in its own coordinate system. It is
// shared structural information, not a finished ornament or a painted alphabet.
export function deriveMotif(seed) {
  if (typeof seed !== 'string' || !seed.length || seed.length > 512) throw new Error('Motif seed must contain 1–512 characters.');
  const rng = random(seed, 'structure:motif');
  const columns = rng.int(3, 8), rows = rng.int(1, 3);
  const beats = Array.from({ length: columns }, (_, i) => ({
    x: i, y: rng.int(0, rows - 1), reach: rng.chance(0.48) ? 1 : 0,
    strength: rounded(0.25 + rng.next() * 0.75),
  }));
  // Keep an identifiable accent even as weaker beats disappear in descendants.
  beats[rng.int(0, beats.length - 1)].strength = 1;
  return {
    generator: 'motif-evolution/1', seed, columns, rows, beats,
    evolution: {
      shorten: rounded(0.08 + rng.next() * 0.13),
      drift: rng.pick([-1, 0, 1]),
      thin: rounded(0.06 + rng.next() * 0.12),
      fragment: rounded(0.06 + rng.next() * 0.15),
      reverse: rng.chance(0.5),
    },
  };
}

// Bounds stay fixed while descendants lose length, change their offset, and
// separate into quieter fragments. Painting happens later: the same cells can
// use any line material, alphabet, or ink without resampling their ancestry.
export function evolveMotif(motif, { width, height = 1, step = 0, ink = 2 } = {}) {
  if (!Number.isInteger(width) || width < 1 || width > 128 || !Number.isInteger(height) || height < 1 || height > 12) throw new Error('Motif bounds must be 1–128 columns and 1–12 rows.');
  if (!Number.isInteger(step) || step < 0 || step > 64) throw new Error('Motif step must be an integer from 0 to 64.');
  if (motif?.generator !== 'motif-evolution/1' || !Array.isArray(motif.beats) || !motif.beats.length) throw new Error('Expected a structural motif.');
  const rule = motif.evolution;
  const span = Math.max(1, Math.round(width * Math.max(0.28, 1 - step * rule.shorten)));
  const corridor = width - span;
  const offset = rule.drift < 0 ? 0 : rule.drift > 0 ? corridor : Math.floor(corridor / 2);
  const depth = Math.max(1, Math.round(height * Math.max(0.35, 1 - step * rule.thin)));
  const top = rule.drift < 0 ? height - depth : rule.drift > 0 ? 0 : Math.floor((height - depth) / 2);
  const threshold = Math.min(0.88, step * rule.fragment);
  const fragments = [];
  for (const beat of motif.beats) {
    if (beat.strength < threshold) continue;
    const progress = beat.x / Math.max(1, motif.columns - 1);
    const x = offset + Math.round((rule.reverse ? 1 - progress : progress) * (span - 1));
    const y = top + Math.round(beat.y / Math.max(1, motif.rows - 1) * (depth - 1));
    // A beat's short reach is structural; only its glyph material is replaceable.
    const reach = beat.reach && beat.strength >= threshold + 0.16 ? Math.max(0, Math.floor(span / motif.columns)) : 0;
    const end = clamp(x + (rule.reverse ? -reach : reach), offset, offset + span - 1);
    fragments.push(end === x ? { op: 'mark', x, y, ink, tone: Math.min(3, Math.floor(beat.strength * 4)) } : stroke(x, y, end, y, ink));
    if (depth > 1 && beat.reach && beat.strength >= 0.65 + Math.min(0.3, step * rule.thin)) {
      fragments.push(stroke(x, y, x, clamp(y + (beat.y % 2 ? -1 : 1), top, top + depth - 1), ink));
    }
  }
  const tree = group(...fragments);
  const cells = [...rasterize(tree).values()];
  return { tree, cells, evolution: { step, width, height, span, depth, offset, top, threshold: rounded(threshold) } };
}
