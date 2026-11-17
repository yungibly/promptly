// The composition engines in one table. Each entry declares its row range, the
// footprint budget fresh sampling draws from, which spatial controls it accepts,
// and its share of automatic sampling. `since` is the first recipe version that
// can sample it automatically, so older versions keep their exact engine choice.
// To add an engine: add an entry here and a builder in grammars.js.
export const engines = {
  surface: { rows: [1, 3], heights: [1, 2, 2, 3], controls: true, compact: true, weight: 1, since: 6 },
  prompt: { rows: [1, 3], heights: [1, 2, 2, 3], controls: true, compact: true, weight: 1, since: 6 },
  assembly: { rows: [2, 12], heights: [2, 3, 4, 6, 8, 12], controls: true, band: true, weight: 1, since: 6 },
  network: { rows: [4, 12], heights: [4, 4, 5, 6, 8, 12], controls: false, band: true, weight: 1, since: 6 },
  // Version-8 systems: one generative idea each, placing their own live text.
  field: { rows: [1, 8], heights: [1, 2, 3, 3, 4, 5, 6, 8], controls: true, weight: 0.9, since: 8 },
  tiles: { rows: [2, 8], heights: [2, 3, 3, 4, 5, 6, 8], controls: true, weight: 1, since: 8 },
  automaton: { rows: [2, 8], heights: [2, 3, 3, 4, 5, 6, 8], controls: true, weight: 0.9, since: 8 },
  growth: { rows: [3, 8], heights: [3, 3, 4, 4, 5, 6, 8], controls: true, weight: 0.5, since: 8 },
  plot: { rows: [1, 8], heights: [1, 2, 3, 4, 5, 6, 8], controls: true, weight: 0.7, since: 8 },
};

export const engineNames = () => Object.keys(engines);

// Version 6 and 7 picked uniformly from these four, in this order. Their
// automatic choice must not move when the table grows.
const LEGACY = ['surface', 'prompt', 'assembly', 'network'];

export function pickEngine(rng, candidates, version) {
  if (version < 8) return rng.pick(LEGACY.filter((name) => candidates.includes(name)));
  const eligible = candidates.filter((name) => engines[name].since <= version && engines[name].weight > 0);
  const total = eligible.reduce((sum, name) => sum + engines[name].weight, 0);
  let roll = rng.next() * total;
  for (const name of eligible) if ((roll -= engines[name].weight) < 0) return name;
  return eligible.at(-1);
}
