// Small deterministic scalar fields. Every function takes a seeded RNG stream
// and returns a pure function, so sampling order never changes the result.

export function valueNoise(rng, period = 0) {
  const table = Array.from({ length: 512 }, () => rng.next());
  const hash = (i, j) => {
    if (period) i = ((i % period) + period) % period;
    let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return table[(h ^ (h >>> 16)) & 511];
  };
  const ease = (t) => t * t * (3 - 2 * t);
  return (x, y = 0) => {
    const i = Math.floor(x), j = Math.floor(y), u = ease(x - i), v = ease(y - j);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

// Fractal sum of value-noise octaves, normalized to 0..1.
export function fbm(rng, octaves = 3, period = 0) {
  const layers = Array.from({ length: octaves }, (_, i) => ({ noise: valueNoise(rng, period ? period << i : 0), scale: 2 ** i, amp: 0.5 ** i,
    dx: rng.next() * 97, dy: rng.next() * 89 }));
  const total = layers.reduce((sum, l) => sum + l.amp, 0);
  return (x, y = 0) => layers.reduce((sum, l) => sum + l.amp * l.noise(x * l.scale + (period ? 0 : l.dx), y * l.scale + l.dy), 0) / total;
}

// Two- to four-wave interference: the classic plasma, in square units.
export function plasma(rng, width, waves = 3) {
  const list = Array.from({ length: waves }, () => {
    const angle = rng.next() * Math.PI, length = width * (0.12 + rng.next() * 0.5);
    return { kx: Math.cos(angle) * 2 * Math.PI / length, ky: Math.sin(angle) * 2 * Math.PI / length, phase: rng.next() * 2 * Math.PI };
  });
  return (x, y) => (list.reduce((sum, w) => sum + Math.sin(w.kx * x + w.ky * y + w.phase), 0) / waves + 1) / 2;
}
