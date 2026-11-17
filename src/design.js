import { random, randomSeed } from './random.js';
import { palettes } from './palettes.js';
import { grammars, compact } from './grammars.js';
import { ascii } from './scene.js';
import { materials, alphabets } from './ornaments.js';
import { compactIdentity, withIdentity } from './identity.js';
import { withRoleBand } from './role-band.js';
import { generateColors } from './chromatic.js';
import { engines, pickEngine } from './engines.js';

export const LATEST = 8;

export function createDesign(options = {}) {
  const seed = String(options.seed ?? randomSeed());
  if (!seed.length || seed.length > 256) throw new Error('Seed must contain 1–256 characters.');
  const style = options.style ?? 'compose';
  const modern = style === 'compose' && (options.version === undefined || [6, 7, LATEST].includes(options.version));
  const evolved = modern && options.version !== 6;
  const latest = modern && (options.version === undefined || options.version === LATEST);
  const palette = options.palette ?? (options.version === undefined || modern ? 'generated' : random(seed, 'palette').pick(Object.keys(palettes)));
  // One roll explores the whole detail range without moving the independent
  // engine, footprint, weight, or color streams. Recipes store the resolved roll.
  const complexity = Number(options.complexity ?? (modern ? random(seed, 'trait:complexity').int(1, 10) : 3));
  const glyphs = options.glyphs ?? 'unicode';
  const info = options.info ?? (options.version === undefined || options.version >= 5);
  if (typeof info !== 'boolean') throw new Error('Info must be a boolean.');
  const label = options.label === '' && !info ? 'wanderer' : options.label ?? (info ? '' : 'wanderer');
  if (!Object.hasOwn(grammars, style)) throw new Error(`Unknown style: ${style}. Choose ${Object.keys(grammars).join(', ')}.`);
  if (palette !== 'generated' && !Object.hasOwn(palettes, palette)) throw new Error(`Unknown palette: ${palette}. Choose generated or ${Object.keys(palettes).join(', ')}.`);
  const maxComplexity = style === 'compose' ? 10 : 5;
  if (!Number.isInteger(complexity) || complexity < 1 || complexity > maxComplexity) throw new Error(`Complexity must be an integer from 1 to ${maxComplexity} for ${style}.`);
  if (!['unicode', 'ascii', 'powerline'].includes(glyphs)) throw new Error('Glyphs must be unicode, ascii, or powerline.');
  if (typeof label !== 'string' || !(info && label === '') && !/^[A-Za-z0-9 ._/:~+-]{1,20}$/.test(label)) throw new Error('Label must be 1–20 simple printable characters (letters, digits, spaces, . _ / : ~ + -).');
  const config = { seed, style, palette, complexity, glyphs, label };
  let colors;
  if (palette === 'generated') {
    const colorSeed = String(options.colorSeed ?? seed);
    if (!colorSeed.length || colorSeed.length > 256) throw new Error('Color seed must contain 1–256 characters.');
    const generated = generateColors(colorSeed);
    if (options.colors !== undefined && (!Array.isArray(options.colors) || options.colors.length !== 7 || !options.colors.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)))) throw new Error('Generated colors must contain seven six-digit hex colors.');
    colors = options.colors ? [...options.colors] : generated.colors;
    Object.assign(config, { colorSeed, colorProgram: options.colorProgram ?? generated.colorProgram });
  } else colors = [...palettes[palette].colors];
  if (options.info !== undefined || options.version === undefined || options.version >= 5) config.info = info;
  if (style === 'compose') {
    let engine = options.engine ?? ({ 2: 'network', 3: 'assembly', 4: 'prompt', 5: 'surface' }[options.version] ?? 'auto');
    const available = Object.keys(engines).filter((name) => engines[name].since <= (latest ? LATEST : modern ? options.version : 7));
    if (engine !== 'auto' && !available.includes(engine)) throw new Error(`Engine must be auto, ${available.join(', ')}.`);
    const automatic = engine === 'auto';
    if (engine === 'auto') {
      const candidates = available.filter((name) => {
        const [min, max] = engines[name].rows;
        return (options.height === undefined || Number(options.height) >= min && Number(options.height) <= max)
          && (engines[name].controls || !['spread', 'fragments', 'connectivity'].some((key) => options[key] !== undefined));
      });
      if (!candidates.length) throw new Error('No engine supports these composition controls. Height must be an integer from 1 to 12.');
      engine = pickEngine(random(seed, 'trait:engine'), candidates, latest ? LATEST : options.version ?? 7);
    }
    const material = options.material ?? random(seed, 'trait:material').pick(Object.keys(materials));
    // Runes, punctuation, and hex digits remain explicit choices. Version 8
    // samples only alphabets that read as marks rather than as stray text.
    const alphabet = options.alphabet ?? random(seed, 'trait:alphabet').pick(latest ? ['geometric', 'granular'] : ['geometric', 'punctuation', 'technical', 'granular']);
    const symmetry = options.symmetry ?? (random(seed, 'trait:symmetry').chance(engine === 'network' ? 0.3 : 0.15) ? 'mirror' : 'none');
    const height = Number(options.height ?? (automatic || modern ? random(seed, 'trait:auto-height').pick(engines[engine].heights) : ['surface', 'prompt'].includes(engine) ? random(seed, 'trait:height').pick([1, 2, 2, 3]) : engine === 'network'
      ? random(seed, 'trait:height').int(Math.min(4 + Math.floor(complexity / 3), 8), Math.min(5 + complexity, 12))
      : random(seed, 'trait:height').int(2, Math.min(4 + complexity, 12))));
    const density = Number(options.density ?? (0.3 + random(seed, 'trait:density').next() * 0.35).toFixed(3));
    const ornamentSeed = String(options.ornamentSeed ?? seed);
    if (!Object.hasOwn(materials, material)) throw new Error(`Unknown material: ${material}. Choose ${Object.keys(materials).join(', ')}.`);
    if (!Object.hasOwn(alphabets, alphabet)) throw new Error(`Unknown alphabet: ${alphabet}. Choose ${Object.keys(alphabets).join(', ')}.`);
    if (!['none', 'mirror'].includes(symmetry)) throw new Error('Symmetry must be none or mirror.');
    const [minHeight, maxHeight] = engines[engine].rows;
    if (!Number.isInteger(height) || height < minHeight || height > maxHeight) throw new Error(`Height must be an integer from ${minHeight} to ${maxHeight} for ${engine}.`);
    if (!Number.isFinite(density) || density < 0.15 || density > 0.85) throw new Error('Density must be between 0.15 and 0.85.');
    if (!ornamentSeed.length || ornamentSeed.length > 256) throw new Error('Ornament seed must contain 1–256 characters.');
    Object.assign(config, { engine, material, alphabet, symmetry, height, density, ornamentSeed });
    if (modern) {
      const weight = Number(options.weight ?? random(seed, 'trait:weight').next().toFixed(3));
      if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new Error('Weight must be between 0 and 1.');
      config.weight = weight;
    } else if (options.weight !== undefined) throw new Error('Weight requires a version 6 composition.');
    if (engines[engine].controls) {
      const spread = Number(options.spread ?? (0.2 + random(seed, 'trait:spread').next() * 0.8).toFixed(3));
      const fragments = Number(options.fragments ?? random(seed, 'trait:fragments').pick(['surface', 'prompt'].includes(engine) ? [1, 2, 3, 4] : [1, 1, 2, 3, 4, 5, 7, 9, 12]));
      const connectionRng = random(seed, 'trait:connectivity');
      const connectivity = Number(options.connectivity ?? (connectionRng.chance(0.7) ? 0 : connectionRng.next().toFixed(3)));
      if (!Number.isFinite(spread) || spread < 0 || spread > 1) throw new Error('Spread must be between 0 and 1.');
      if (!Number.isInteger(fragments) || fragments < 1 || fragments > 12) throw new Error('Fragments must be an integer from 1 to 12.');
      if (!Number.isFinite(connectivity) || connectivity < 0 || connectivity > 1) throw new Error('Connectivity must be between 0 and 1.');
      Object.assign(config, { spread, fragments, connectivity });
    } else if (['spread', 'fragments', 'connectivity'].some((key) => options[key] !== undefined)) {
      throw new Error(`Spread, fragments, and connectivity require engine ${Object.keys(engines).filter((name) => engines[name].controls).join(', ')}.`);
    }
  } else if (['engine', 'material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed', 'spread', 'fragments', 'connectivity', 'weight'].some((key) => options[key] !== undefined)) {
    throw new Error('Composition controls and scoped mutations require style compose.');
  }
  if (evolved) {
    for (const key of ['artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed']) {
      const value = options[key] === undefined ? seed : options[key];
      if (typeof value !== 'string' || !value.length || value.length > 512) throw new Error(`${key} must contain 1–512 characters.`);
      config[key] = value;
    }
    const fragments = options.fragmentSeeds === undefined ? {} : options.fragmentSeeds;
    if (!fragments || typeof fragments !== 'object' || Array.isArray(fragments) || Object.keys(fragments).length > 24 || Object.entries(fragments).some(([key, value]) => !/^piece:(?:[0-9]|1[0-9]|2[0-3])$/.test(key) || typeof value !== 'string' || !value.length || value.length > 512)) throw new Error('Fragment seeds require up to 24 piece:N entries with 1–512 character seeds.');
    if (config.engine !== 'assembly' && Object.keys(fragments).length) throw new Error('Fragment seeds require engine assembly.');
    config.fragmentSeeds = { ...fragments };
  } else if (['artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed', 'fragmentSeeds'].some((key) => options[key] !== undefined)) throw new Error('Component seeds require a version 7 composition.');
  const context = { ...config, colors, modern, evolved, info, label: config.engine === 'surface' || modern && config.engine === 'prompt' ? label : label || 'username', rng: random(config.artSeed ?? seed, `structure:${style}`), ornament: random(config.ornamentSeed ?? seed, `ornament:${style}`) };
  let composition = grammars[style].build(context);
  if (modern && info && engines[config.engine].band) composition = withRoleBand(composition, { ...config, colors, evolved });
  // Modern engines place their own live fields; only older generators get the
  // separate identity band.
  else if (info && !modern && config.engine !== 'surface') composition = withIdentity(composition, config);
  if (glyphs === 'ascii') composition.rightPrompt = ascii(composition.rightPrompt);
  return {
    version: latest ? LATEST : evolved ? 7 : modern ? 6 : style === 'compose' ? ({ network: 2, assembly: 3, prompt: 4, surface: 5 }[config.engine]) : 1,
    ...config,
    colors,
    ...composition,
    compact: info ? compactIdentity(glyphs) : compact({ glyphs, label, sigil: '◈' }),
  };
}

export function recipe(design) {
  const { version, seed, style, palette, complexity, glyphs, label } = design;
  const value = { version, seed, style, palette, complexity, glyphs, label };
  if (design.info !== undefined) value.info = design.info;
  if (version >= 2) for (const key of ['material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed']) value[key] = design[key];
  if (version >= 3) for (const key of ['engine', 'spread', 'fragments', 'connectivity']) if (design[key] !== undefined) value[key] = design[key];
  if (version >= 6) value.weight = design.weight;
  if (version >= 7) {
    for (const key of ['artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed']) value[key] = design[key];
    value.fragmentSeeds = design.engine === 'assembly'
      ? Object.fromEntries(design.program.derivation.pieces.map((piece) => [piece.fragmentId, piece.seed]))
      : {};
  }
  if (palette === 'generated') for (const key of ['colorSeed', 'colors', 'colorProgram']) value[key] = design[key];
  return value;
}

export function fromRecipe(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Number.isInteger(value.version) || value.version < 1 || value.version > LATEST) throw new Error(`Expected a Promptly recipe with version 1–${LATEST}.`);
  if ((value.style === 'compose') !== (value.version >= 2)) throw new Error(`Composed recipes require version 2–${LATEST}; classic recipes require version 1.`);
  if (value.version >= 6 && !(Object.hasOwn(engines, value.engine) && engines[value.engine].since <= value.version)) throw new Error(`Version ${value.version} recipes require a resolved composition engine.`);
  if (value.version === 5 && value.engine !== 'surface') throw new Error('Version 5 recipes require engine surface.');
  if (value.version === 4 && value.engine !== 'prompt') throw new Error('Version 4 recipes require engine prompt.');
  if (value.version === 3 && value.engine !== 'assembly') throw new Error('Version 3 recipes require engine assembly.');
  if (value.version === 2 && value.engine !== undefined && value.engine !== 'network') throw new Error('Version 2 recipes require engine network.');
  const keys = ['version', 'seed', 'style', 'palette', 'complexity', 'glyphs', 'label'];
  if (value.version >= 2) keys.push('material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed');
  if (value.version >= 3) keys.push('engine');
  if (value.version >= 3 && value.engine !== 'network') keys.push('spread', 'fragments', 'connectivity');
  if (value.version >= 5 && !Object.hasOwn(value, 'info')) throw new Error('Recipe is incomplete: info is required from version 5.');
  if (value.version >= 6) keys.push('weight');
  if (value.version >= 7) keys.push('artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed', 'fragmentSeeds');
  if (value.palette === 'generated') keys.push('colorSeed', 'colors', 'colorProgram');
  if (keys.some((key) => !Object.hasOwn(value, key))) throw new Error('Recipe is incomplete.');
  const numeric = new Set(['version', 'complexity', 'height', 'density', 'spread', 'fragments', 'connectivity', 'weight']);
  const structured = new Set(['colors', 'colorProgram', 'fragmentSeeds']);
  for (const key of keys) {
    if (numeric.has(key)) {
      if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) throw new Error(`${key[0].toUpperCase() + key.slice(1)} in recipe must be a finite number.`);
    } else if (!structured.has(key) && typeof value[key] !== 'string') throw new Error(`Recipe ${key} must be a string.`);
  }
  if (Object.hasOwn(value, 'info') && typeof value.info !== 'boolean') throw new Error('Info must be a boolean.');
  if (value.palette === 'generated' && (!value.colorProgram || typeof value.colorProgram !== 'object' || Array.isArray(value.colorProgram))) throw new Error('Recipe colorProgram must be an object.');
  return createDesign(value);
}

export function mutateDesign(design, variation = '1', scope = 'all') {
  if (!['all', 'structure', 'ornament'].includes(scope)) throw new Error('Mutation scope must be all, structure, or ornament.');
  if (design.style !== 'compose' && scope !== 'all') throw new Error('Scoped mutations require style compose.');
  const options = recipe(design);
  if (scope !== 'ornament') options.seed = `${design.seed}/${variation}`;
  if (design.version >= 7 && scope !== 'ornament') {
    for (const key of ['artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed']) options[key] = `${design[key]}/${variation}`;
    options.fragmentSeeds = {};
  }
  if (design.style === 'compose' && scope !== 'structure') options.ornamentSeed = `${design.ornamentSeed}/${variation}`;
  return createDesign(options);
}
