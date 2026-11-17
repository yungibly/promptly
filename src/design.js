import { random, randomSeed } from './random.js';
import { palettes } from './palettes.js';
import { build, compact } from './grammars.js';
import { ascii } from './scene.js';
import { materials, alphabets } from './ornaments.js';
import { compactIdentity } from './identity.js';
import { withRoleBand } from './role-band.js';
import { generateColors } from './chromatic.js';
import { engines, pickEngine } from './engines.js';

export const LATEST = 8;
// Saved recipes from these versions still load with their exact appearance.
// Exports from versions 1–5 remain standalone .zsh files and keep working.
export const SUPPORTED = [6, 7, LATEST];
const RETIRED = 'Recipes from version 1–5 (Promptly 0.5 and earlier) can no longer be loaded; their exported .zsh files still work.';
const COMPONENT_SEEDS = ['artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed'];
const SPATIAL = ['spread', 'fragments', 'connectivity'];

export function createDesign(options = {}) {
  const seed = String(options.seed ?? randomSeed());
  if (!seed.length || seed.length > 256) throw new Error('Seed must contain 1–256 characters.');
  if (options.style !== undefined && options.style !== 'compose') throw new Error('Classic named styles were retired. Choose an --engine instead.');
  if (options.version !== undefined && !SUPPORTED.includes(options.version)) throw new Error(Number.isInteger(options.version) && options.version >= 1 && options.version < 6 ? RETIRED : `Version must be one of ${SUPPORTED.join(', ')}.`);
  const version = options.version ?? LATEST;
  const evolved = version >= 7;
  const palette = options.palette ?? 'generated';
  // One roll explores the whole detail range without moving the independent
  // engine, footprint, weight, or color streams. Recipes store the resolved roll.
  const complexity = Number(options.complexity ?? random(seed, 'trait:complexity').int(1, 10));
  const glyphs = options.glyphs ?? 'unicode';
  const info = options.info ?? true;
  if (typeof info !== 'boolean') throw new Error('Info must be a boolean.');
  const label = options.label === '' && !info ? 'wanderer' : options.label ?? (info ? '' : 'wanderer');
  if (palette !== 'generated' && !Object.hasOwn(palettes, palette)) throw new Error(`Unknown palette: ${palette}. Choose generated or ${Object.keys(palettes).join(', ')}.`);
  if (!Number.isInteger(complexity) || complexity < 1 || complexity > 10) throw new Error('Complexity must be an integer from 1 to 10.');
  if (!['unicode', 'ascii', 'powerline'].includes(glyphs)) throw new Error('Glyphs must be unicode, ascii, or powerline.');
  if (typeof label !== 'string' || !(info && label === '') && !/^[A-Za-z0-9 ._/:~+-]{1,20}$/.test(label)) throw new Error('Label must be 1–20 simple printable characters (letters, digits, spaces, . _ / : ~ + -).');
  const config = { seed, style: 'compose', palette, complexity, glyphs, label };
  let colors;
  if (palette === 'generated') {
    const colorSeed = String(options.colorSeed ?? seed);
    if (!colorSeed.length || colorSeed.length > 256) throw new Error('Color seed must contain 1–256 characters.');
    const generated = generateColors(colorSeed);
    if (options.colors !== undefined && (!Array.isArray(options.colors) || options.colors.length !== 7 || !options.colors.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)))) throw new Error('Generated colors must contain seven six-digit hex colors.');
    colors = options.colors ? [...options.colors] : generated.colors;
    Object.assign(config, { colorSeed, colorProgram: options.colorProgram ?? generated.colorProgram });
  } else colors = [...palettes[palette].colors];
  config.info = info;

  let engine = options.engine ?? 'auto';
  const available = Object.keys(engines).filter((name) => engines[name].since <= version);
  if (engine !== 'auto' && !available.includes(engine)) throw new Error(`Engine must be auto, ${available.join(', ')}.`);
  if (engine === 'auto') {
    const candidates = available.filter((name) => {
      const [min, max] = engines[name].rows;
      return (options.height === undefined || Number(options.height) >= min && Number(options.height) <= max)
        && (engines[name].controls || !SPATIAL.some((key) => options[key] !== undefined));
    });
    if (!candidates.length) throw new Error('No engine supports these composition controls. Height must be an integer from 1 to 12.');
    engine = pickEngine(random(seed, 'trait:engine'), candidates, version);
  }
  const material = options.material ?? random(seed, 'trait:material').pick(Object.keys(materials));
  // Runes, punctuation, and hex digits remain explicit choices. Version 8
  // samples only alphabets that read as marks rather than as stray text.
  const alphabet = options.alphabet ?? random(seed, 'trait:alphabet').pick(version >= 8 ? ['geometric', 'granular'] : ['geometric', 'punctuation', 'technical', 'granular']);
  const symmetry = options.symmetry ?? (random(seed, 'trait:symmetry').chance(engine === 'network' ? 0.3 : 0.15) ? 'mirror' : 'none');
  // Low complexity does not exclude a large footprint, and high complexity does
  // not force one: the row budget has its own stream.
  const height = Number(options.height ?? random(seed, 'trait:auto-height').pick(engines[engine].heights));
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
  const weight = Number(options.weight ?? random(seed, 'trait:weight').next().toFixed(3));
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new Error('Weight must be between 0 and 1.');
  config.weight = weight;
  if (engines[engine].controls) {
    const spread = Number(options.spread ?? (0.2 + random(seed, 'trait:spread').next() * 0.8).toFixed(3));
    const fragments = Number(options.fragments ?? random(seed, 'trait:fragments').pick(engines[engine].compact ? [1, 2, 3, 4] : [1, 1, 2, 3, 4, 5, 7, 9, 12]));
    const connectionRng = random(seed, 'trait:connectivity');
    const connectivity = Number(options.connectivity ?? (connectionRng.chance(0.7) ? 0 : connectionRng.next().toFixed(3)));
    if (!Number.isFinite(spread) || spread < 0 || spread > 1) throw new Error('Spread must be between 0 and 1.');
    if (!Number.isInteger(fragments) || fragments < 1 || fragments > 12) throw new Error('Fragments must be an integer from 1 to 12.');
    if (!Number.isFinite(connectivity) || connectivity < 0 || connectivity > 1) throw new Error('Connectivity must be between 0 and 1.');
    Object.assign(config, { spread, fragments, connectivity });
  } else if (SPATIAL.some((key) => options[key] !== undefined)) {
    throw new Error(`Spread, fragments, and connectivity require engine ${Object.keys(engines).filter((name) => engines[name].controls).join(', ')}.`);
  }
  if (evolved) {
    for (const key of COMPONENT_SEEDS) {
      const value = options[key] === undefined ? seed : options[key];
      if (typeof value !== 'string' || !value.length || value.length > 512) throw new Error(`${key} must contain 1–512 characters.`);
      config[key] = value;
    }
    const fragments = options.fragmentSeeds === undefined ? {} : options.fragmentSeeds;
    if (!fragments || typeof fragments !== 'object' || Array.isArray(fragments) || Object.keys(fragments).length > 24 || Object.entries(fragments).some(([key, value]) => !/^piece:(?:[0-9]|1[0-9]|2[0-3])$/.test(key) || typeof value !== 'string' || !value.length || value.length > 512)) throw new Error('Fragment seeds require up to 24 piece:N entries with 1–512 character seeds.');
    if (config.engine !== 'assembly' && Object.keys(fragments).length) throw new Error('Fragment seeds require engine assembly.');
    config.fragmentSeeds = { ...fragments };
  } else if ([...COMPONENT_SEEDS, 'fragmentSeeds'].some((key) => options[key] !== undefined)) throw new Error('Component seeds require a version 7 composition.');
  const context = { ...config, colors, modern: true, evolved, version, info,
    label: engines[engine].compact ? label : label || 'username',
    rng: random(config.artSeed ?? seed, 'structure:compose'), ornament: random(config.ornamentSeed ?? seed, 'ornament:compose') };
  let composition = build(context);
  if (info && engines[engine].band) composition = withRoleBand(composition, { ...config, colors, evolved });
  if (glyphs === 'ascii') composition.rightPrompt = ascii(composition.rightPrompt);
  return {
    version,
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
  for (const key of ['material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed']) value[key] = design[key];
  for (const key of ['engine', ...SPATIAL]) if (design[key] !== undefined) value[key] = design[key];
  value.weight = design.weight;
  if (version >= 7) {
    for (const key of COMPONENT_SEEDS) value[key] = design[key];
    value.fragmentSeeds = design.engine === 'assembly'
      ? Object.fromEntries(design.program.derivation.pieces.map((piece) => [piece.fragmentId, piece.seed]))
      : {};
  }
  if (palette === 'generated') for (const key of ['colorSeed', 'colors', 'colorProgram']) value[key] = design[key];
  return value;
}

export function fromRecipe(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Number.isInteger(value.version)) throw new Error('Expected a Promptly recipe with a version.');
  if (value.version >= 1 && value.version < 6) throw new Error(RETIRED);
  if (!SUPPORTED.includes(value.version)) throw new Error(`Expected a Promptly recipe with version ${SUPPORTED.join(', ')}.`);
  if (value.style !== 'compose') throw new Error('Recipes require style compose.');
  if (!(Object.hasOwn(engines, value.engine) && engines[value.engine].since <= value.version)) throw new Error(`Version ${value.version} recipes require a resolved composition engine.`);
  const keys = ['version', 'seed', 'style', 'palette', 'complexity', 'glyphs', 'label', 'info', 'material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed', 'engine', 'weight'];
  if (engines[value.engine].controls) keys.push(...SPATIAL);
  if (value.version >= 7) keys.push(...COMPONENT_SEEDS, 'fragmentSeeds');
  if (value.palette === 'generated') keys.push('colorSeed', 'colors', 'colorProgram');
  if (!Object.hasOwn(value, 'info')) throw new Error('Recipe is incomplete: info is required.');
  if (keys.some((key) => !Object.hasOwn(value, key))) throw new Error('Recipe is incomplete.');
  const numeric = new Set(['version', 'complexity', 'height', 'density', 'spread', 'fragments', 'connectivity', 'weight']);
  const structured = new Set(['info', 'colors', 'colorProgram', 'fragmentSeeds']);
  for (const key of keys) {
    if (numeric.has(key)) {
      if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) throw new Error(`${key[0].toUpperCase() + key.slice(1)} in recipe must be a finite number.`);
    } else if (!structured.has(key) && typeof value[key] !== 'string') throw new Error(`Recipe ${key} must be a string.`);
  }
  if (typeof value.info !== 'boolean') throw new Error('Info must be a boolean.');
  if (value.palette === 'generated' && (!value.colorProgram || typeof value.colorProgram !== 'object' || Array.isArray(value.colorProgram))) throw new Error('Recipe colorProgram must be an object.');
  return createDesign(value);
}

export function mutateDesign(design, variation = '1', scope = 'all') {
  if (!['all', 'structure', 'ornament'].includes(scope)) throw new Error('Mutation scope must be all, structure, or ornament.');
  const options = recipe(design);
  if (scope !== 'ornament') options.seed = `${design.seed}/${variation}`;
  if (design.version >= 7 && scope !== 'ornament') {
    for (const key of COMPONENT_SEEDS) options[key] = `${design[key]}/${variation}`;
    options.fragmentSeeds = {};
  }
  if (scope !== 'structure') options.ornamentSeed = `${design.ornamentSeed}/${variation}`;
  return createDesign(options);
}
