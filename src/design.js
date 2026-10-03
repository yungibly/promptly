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
    const material = options.material ?? random(seed, 'trait:material').pick(Object.keys(materials));
    // Runes remain available explicitly; they no longer define the default look.
    const alphabet = options.alphabet ?? random(seed, 'trait:alphabet').pick(['geometric', 'punctuation', 'technical', 'granular']);
    const symmetry = options.symmetry ?? (random(seed, 'trait:symmetry').chance(0.3) ? 'mirror' : 'none');
    const height = Number(options.height ?? random(seed, 'trait:height').int(Math.min(4 + Math.floor(complexity / 3), 8), Math.min(5 + complexity, 12)));
    const density = Number(options.density ?? (0.3 + random(seed, 'trait:density').next() * 0.35).toFixed(3));
    const ornamentSeed = String(options.ornamentSeed ?? seed);
    if (!Object.hasOwn(materials, material)) throw new Error(`Unknown material: ${material}. Choose ${Object.keys(materials).join(', ')}.`);
    if (!Object.hasOwn(alphabets, alphabet)) throw new Error(`Unknown alphabet: ${alphabet}. Choose ${Object.keys(alphabets).join(', ')}.`);
    if (!['none', 'mirror'].includes(symmetry)) throw new Error('Symmetry must be none or mirror.');
    if (!Number.isInteger(height) || height < 4 || height > 12) throw new Error('Height must be an integer from 4 to 12.');
    if (!Number.isFinite(density) || density < 0.15 || density > 0.85) throw new Error('Density must be between 0.15 and 0.85.');
    if (!ornamentSeed.length || ornamentSeed.length > 256) throw new Error('Ornament seed must contain 1–256 characters.');
    Object.assign(config, { material, alphabet, symmetry, height, density, ornamentSeed });
  } else if (['material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed'].some((key) => options[key] !== undefined)) {
    throw new Error('Material, alphabet, symmetry, height, density, and scoped mutations require style compose.');
  }
  const context = { ...config, rng: random(seed, `structure:${style}`), ornament: random(config.ornamentSeed ?? seed, `ornament:${style}`) };
  const composition = grammars[style].build(context);
  if (glyphs === 'ascii') composition.rightPrompt = ascii(composition.rightPrompt);
  return {
    version: style === 'compose' ? 2 : 1,
    ...config,
    colors: palettes[palette].colors,
    ...composition,
    compact: compact({ glyphs, label, sigil: '◈' }),
  };
}

export function recipe(design) {
  const { version, seed, style, palette, complexity, glyphs, label } = design;
  const value = { version, seed, style, palette, complexity, glyphs, label };
  if (version === 2) for (const key of ['material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed']) value[key] = design[key];
  return value;
}

export function fromRecipe(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![1, 2].includes(value.version)) throw new Error('Expected a Promptly recipe with version 1 or 2.');
  if ((value.style === 'compose') !== (value.version === 2)) throw new Error('Composed recipes require version 2; classic recipes require version 1.');
  const keys = ['version', 'seed', 'style', 'palette', 'complexity', 'glyphs', 'label'];
  if (value.version === 2) keys.push('material', 'alphabet', 'symmetry', 'height', 'density', 'ornamentSeed');
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
