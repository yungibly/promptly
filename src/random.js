import { createHash, randomBytes } from 'node:crypto';

export function randomSeed() {
  return randomBytes(4).toString('hex');
}

// Named streams isolate palette/ornament changes from the composition's topology.
export function random(seed, stream = 'structure') {
  let state = createHash('sha256').update(`${seed}\0${stream}`).digest().readUInt32LE();
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  };
}
