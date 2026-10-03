import { random, randomSeed } from './random.js';
import { palettes } from './palettes.js';
import { grammars, compact } from './grammars.js';
import { ascii } from './scene.js';
import { materials, alphabets } from './ornaments.js';

export function createDesign(options = {}) {
  const seed = String(options.seed ?? randomSeed());
  if (!seed.length || seed.length > 256) throw new Error('Seed must contain 1–256 characters.');
  const style = options.style ?? 'compose';
  const palette = options.palette ?? random(seed, 'palette').pick(Object.keys(palettes));
  const complexity = Number(options.complexity ?? 3);
  const glyphs = options.glyphs ?? 'unicode';
  const label = options.label ?? 'wanderer';
  if (!Object.hasOwn(grammars, style)) throw new Error(`Unknown style: ${style}. Choose ${Object.keys(grammars).join(', ')}.`);
  if (!Object.hasOwn(palettes, palette)) throw new Error(`Unknown palette: ${palette}. Choose ${Object.keys(palettes).join(', ')}.`);
  const maxComplexity = style === 'compose' ? 10 : 5;
  if (!Number.isInteger(complexity) || complexity < 1 || complexity > maxComplexity) throw new Error(`Complexity must be an integer from 1 to ${maxComplexity} for ${style}.`);
  if (!['unicode', 'ascii'].includes(glyphs)) throw new Error('Glyphs must be unicode or ascii.');
  if (typeof label !== 'string' || !/^[A-Za-z0-9 ._/:~+-]{1,20}$/.test(label)) throw new Error('Label must be 1–20 simple printable characters (letters, digits, spaces, . _ / : ~ + -).');
  const config = { seed, style, palette, complexity, glyphs, label };
  if (style === 'compose') {
    let engine = options.engine ?? ({ 2: 'network', 3: 'assembly', 4: 'prompt' }[options.version] ?? 'auto');
    if (!['auto', 'prompt', 'assembly', 'network'].includes(engine)) throw new Error('Engine must be auto, prompt, assembly, or network.');
    const automatic = engine === 'auto';
    if (engine === 'auto') {
      const ranges = { prompt: [1, 3], assembly: [2, 12], network: [4, 12] };
      const candidates = Object.keys(ranges).filter((name) => {
        const [min, max] = ranges[name];
        return (options.height === undefined || Number(options.height) >= min && Number(options.height) <= max)
          && (name !== 'network' || !['spread', 'fragments', 'connectivity'].some((key) => options[key] !== undefined));
      });
      if (!candidates.length) throw new Error('No engine supports these composition controls. Height must be an integer from 1 to 12.');
      engine = random(seed, 'trait:engine').pick(candidates);
    }
    const material = options.material ?? random(seed, 'trait:material').pick(Object.keys(materials));
    // Runes remain available explicitly; they no longer define the default look.
    const alphabet = options.alphabet ?? random(seed, 'trait:alphabet').pick(['geometric', 'punctuation', 'technical', 'granular']);
    const symmetry = options.symmetry ?? (random(seed, 'trait:symmetry').chance(engine === 'network' ? 0.3 : 0.15) ? 'mirror' : 'none');
    const automaticHeights = { prompt: [1, 2, 2, 3], assembly: [2, 3, 4, 6, 8, 12], network: [4, 4, 5, 6, 8, 12] };
    const height = Number(options.height ?? (automatic ? random(seed, 'trait:auto-height').pick(automaticHeights[engine]) : engine === 'prompt' ? random(seed, 'trait:height').pick([1, 2, 2, 3]) : engine === 'network'
      ? random(seed, 'trait:height').int(Math.min(4 + Math.floor(complexity / 3), 8), Math.min(5 + complexity, 12))
      : random(seed, 'trait:height').int(2, Math.min(4 + complexity, 12))));
    const density = Number(options.density ?? (0.3 + random(seed, 'trait:density').next() * 0.35).toFixed(3));
    const ornamentSeed = String(options.ornamentSeed ?? seed);
    if (!Object.hasOwn(materials, material)) throw new Error(`Unknown material: ${material}. Choose ${Object.keys(materials).join(', ')}.`);
    if (!Object.hasOwn(alphabets, alphabet)) throw new Error(`Unknown alphabet: ${alphabet}. Choose ${Object.keys(alphabets).join(', ')}.`);
    if (!['none', 'mirror'].includes(symmetry)) throw new Error('Symmetry must be none or mirror.');
    const minHeight = engine === 'prompt' ? 1 : engine === 'network' ? 4 : 2, maxHeight = engine === 'prompt' ? 3 : 12;
    if (!Number.isInteger(height) || height < minHeight || height > maxHeight) throw new Error(`Height must be an integer from ${minHeight} to ${maxHeight} for ${engine}.`);
    if (!Number.isFinite(density) || density < 0.15 || density > 0.85) throw new Error('Density must be between 0.15 and 0.85.');
    if (!ornamentSeed.length || ornamentSeed.length > 256) throw new Error('Ornament seed must contain 1–256 characters.');
    Object.assign(config, { engine, material, alphabet, symmetry, height, density, ornamentSeed });
    if (engine !== 'network') {
      const spread = Number(options.spread ?? (0.2 + random(seed, 'trait:spread').next() * 0.8).toFixed(3));
      const fragments = Number(options.fragments ?? random(seed, 'trait:fragments').pick(engine === 'prompt' ? [1, 2, 3, 4] : [1, 1, 2, 3, 4, 5, 7, 9, 12]));
      const connectionRng = random(seed, 'trait:connectivity');
      const connectivity = Number(options.connectivity ?? (connectionRng.chance(0.7) ? 0 : connectionRng.next().toFixed(3)));
      if (!Number.isFinite(spread) || spread < 0 || spread > 1) throw new Error('Spread must be between 0 and 1.');
      if (!Number.isInteger(fragments) || fragments < 1 || fragments > 12) throw new Error('Fragments must be an integer from 1 to 12.');
      if (!Number.isFinite(connectivity) || connectivity < 0 || connectivity > 1) throw new Error('Connectivity must be between 0 and 1.');
      Object.assign(config, { spread, fragments, connectivity });
    } else if (['spread', 'fragments', 'connectivity'].some((key) => options[key] !== undefined)) {
      throw new Error('Spread, fragments, and connectivity require engine prompt or assembly.');
    }
  } else if (['engine', 'material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed', 'spread', 'fragments', 'connectivity'].some((key) => options[key] !== undefined)) {
    throw new Error('Composition controls and scoped mutations require style compose.');
  }
  const context = { ...config, rng: random(seed, `structure:${style}`), ornament: random(config.ornamentSeed ?? seed, `ornament:${style}`) };
  const composition = grammars[style].build(context);
  if (glyphs === 'ascii') composition.rightPrompt = ascii(composition.rightPrompt);
  return {
    version: style === 'compose' ? ({ network: 2, assembly: 3, prompt: 4 }[config.engine]) : 1,
    ...config,
    colors: palettes[palette].colors,
    ...composition,
    compact: compact({ glyphs, label, sigil: '◈' }),
  };
}

export function recipe(design) {
  const { version, seed, style, palette, complexity, glyphs, label } = design;
  const value = { version, seed, style, palette, complexity, glyphs, label };
  if (version >= 2) for (const key of ['material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed']) value[key] = design[key];
  if (version >= 3) for (const key of ['engine', 'spread', 'fragments', 'connectivity']) value[key] = design[key];
  return value;
}

export function fromRecipe(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![1, 2, 3, 4].includes(value.version)) throw new Error('Expected a Promptly recipe with version 1, 2, 3, or 4.');
  if ((value.style === 'compose') !== (value.version >= 2)) throw new Error('Composed recipes require version 2–4; classic recipes require version 1.');
  if (value.version === 4 && value.engine !== 'prompt') throw new Error('Version 4 recipes require engine prompt.');
  if (value.version === 3 && value.engine !== 'assembly') throw new Error('Version 3 recipes require engine assembly.');
  if (value.version === 2 && value.engine !== undefined && value.engine !== 'network') throw new Error('Version 2 recipes require engine network.');
  const keys = ['version', 'seed', 'style', 'palette', 'complexity', 'glyphs', 'label'];
  if (value.version >= 2) keys.push('material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed');
  if (value.version >= 3) keys.push('engine', 'spread', 'fragments', 'connectivity');
  if (keys.some((key) => !Object.hasOwn(value, key))) throw new Error('Recipe is incomplete.');
  return createDesign(value);
}

export function mutateDesign(design, variation = '1', scope = 'all') {
  if (!['all', 'structure', 'ornament'].includes(scope)) throw new Error('Mutation scope must be all, structure, or ornament.');
  if (design.style !== 'compose' && scope !== 'all') throw new Error('Scoped mutations require style compose.');
  const options = recipe(design);
  if (scope !== 'ornament') options.seed = `${design.seed}/${variation}`;
  if (design.style === 'compose' && scope !== 'structure') options.ornamentSeed = `${design.ornamentSeed}/${variation}`;
  return createDesign(options);
}
