// The composition engines in one table. Each entry declares its row range, the
// footprint budget fresh sampling draws from, which spatial controls it accepts,
// and its share of automatic sampling. `since` is the first recipe version that
// can sample it automatically, so older versions keep their exact engine choice.
// To add an engine: add an entry here and a builder in grammars.js.
//
// `heights` is the row budget versions 6 and 7 draw from and must not move.
// Version 8 draws from `footprint` instead: a prompt is seen on every command,
// so automatic rolls are mostly one to three rows (two most often), about one
// in nine is four or five rows, and taller art appears only when --height
// asks for it. `extent` bounds version-8 spread where it sets horizontal reach.
export const engines = {
  surface: { rows: [1, 3], heights: [1, 2, 2, 3], footprint: [1, 2, 2, 2, 3], controls: true, compact: true, weight: 1, since: 6 },
  prompt: { rows: [1, 3], heights: [1, 2, 2, 3], footprint: [1, 2, 2, 2, 3], controls: true, compact: true, weight: 1, since: 6 },
  assembly: { rows: [2, 12], heights: [2, 3, 4, 6, 8, 12], footprint: [2, 2, 2, 3, 3, 3, 3, 4], extent: [0.15, 0.5], controls: true, band: true, weight: 0.45, since: 6 },
  network: { rows: [4, 12], heights: [4, 4, 5, 6, 8, 12], footprint: [4, 4, 4, 5], controls: false, band: true, weight: 0.7, since: 6 },
  // Version-8 systems: one generative idea each, placing their own live text.
  // One to three rows is their primary form; taller forms remain for --height.
  field: { rows: [1, 8], heights: [1, 2, 3, 3, 4, 5, 6, 8], footprint: [1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4], controls: true, weight: 1, since: 8 },
  tiles: { rows: [1, 8], heights: [2, 3, 3, 4, 5, 6, 8], footprint: [1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3], controls: true, weight: 0.9, since: 8 },
  automaton: { rows: [1, 8], heights: [2, 3, 3, 4, 5, 6, 8], footprint: [1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 2, 4], controls: true, weight: 0.9, since: 8 },
  growth: { rows: [1, 8], heights: [3, 3, 4, 4, 5, 6, 8], footprint: [1, 2, 2, 2, 2, 2, 3, 3, 3], controls: true, weight: 0.6, since: 8 },
  plot: { rows: [1, 8], heights: [1, 2, 3, 4, 5, 6, 8], footprint: [1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3], controls: true, weight: 0.8, since: 8 },
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

// The automatic row budget for a resolved engine and recipe version.
export const footprint = (name, version) => version >= 8 ? engines[name].footprint : engines[name].heights;
