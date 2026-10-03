import { random, randomSeed } from './random.js';
import { palettes } from './palettes.js';
import { grammars, compact } from './grammars.js';
import { ascii } from './scene.js';

export function createDesign(options = {}) {
  const seed = String(options.seed ?? randomSeed());
  if (!seed.length || seed.length > 256) throw new Error('Seed must contain 1–256 characters.');
  const rng = random(seed);
  const style = options.style ?? rng.pick(Object.keys(grammars));
  const palette = options.palette ?? random(seed, 'palette').pick(Object.keys(palettes));
  const complexity = Number(options.complexity ?? 3);
  const glyphs = options.glyphs ?? 'unicode';
  const label = options.label ?? 'wanderer';
  if (!Object.hasOwn(grammars, style)) throw new Error(`Unknown style: ${style}. Choose ${Object.keys(grammars).join(', ')}.`);
  if (!Object.hasOwn(palettes, palette)) throw new Error(`Unknown palette: ${palette}. Choose ${Object.keys(palettes).join(', ')}.`);
  if (!Number.isInteger(complexity) || complexity < 1 || complexity > 5) throw new Error('Complexity must be an integer from 1 to 5.');
  if (!['unicode', 'ascii'].includes(glyphs)) throw new Error('Glyphs must be unicode or ascii.');
  if (typeof label !== 'string' || !/^[A-Za-z0-9 ._/:~+-]{1,20}$/.test(label)) throw new Error('Label must be 1–20 simple printable characters (letters, digits, spaces, . _ / : ~ + -).');
  const config = { seed, style, palette, complexity, glyphs, label };
  const context = { ...config, rng: random(seed, `structure:${style}`), ornament: random(seed, `ornament:${style}`) };
  const composition = grammars[style].build(context);
  if (glyphs === 'ascii') composition.rightPrompt = ascii(composition.rightPrompt);
  return {
    version: 1,
    ...config,
    colors: palettes[palette].colors,
    ...composition,
    compact: compact({ glyphs, label, sigil: '◈' }),
  };
}

export function recipe(design) {
  const { version, seed, style, palette, complexity, glyphs, label } = design;
  return { version, seed, style, palette, complexity, glyphs, label };
}

export function fromRecipe(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) throw new Error('Expected a Promptly recipe with version: 1.');
  const keys = ['version', 'seed', 'style', 'palette', 'complexity', 'glyphs', 'label'];
  if (keys.some((key) => !Object.hasOwn(value, key))) throw new Error('Recipe is incomplete.');
  return createDesign(value);
}

export function mutateDesign(design, variation = '1') {
  return createDesign({ ...recipe(design), seed: `${design.seed}/${variation}` });
}
