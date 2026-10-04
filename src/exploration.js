import { createDesign, fromRecipe, recipe } from './design.js';
import { randomSeed } from './random.js';

const domains = ['artSeed', 'layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed'];
const noPins = () => ({ shape: false, layout: false, colors: false, fragments: [] });
const savedColors = (design) => Object.fromEntries(['palette', 'colorSeed', 'colors', 'colorProgram'].filter((key) => design[key] !== undefined).map((key) => [key, design[key]]));

export function explorerFragments(design) {
  if (design.version < 7 || design.engine !== 'assembly') return [];
  const seen = new Set();
  return design.program.derivation.pieces.filter((piece) => {
    if (seen.has(piece.fragmentId)) return false;
    seen.add(piece.fragmentId); return true;
  }).map((piece, i) => ({ id: piece.fragmentId, label: `Fragment ${i + 1}` }));
}

export function createExplorerState({ design, options = {}, favorites = [] } = {}) {
  if (!Array.isArray(favorites) || favorites.length > 100) throw new Error('Favorites must be an array of at most 100 recipes.');
  return {
    current: design ?? createDesign(options), options: { ...options }, pins: noPins(),
    favorites: favorites.map((value) => recipe(fromRecipe(value))),
  };
}

function reroll(state, seed) {
  const { current, pins } = state;
  if (typeof seed !== 'string' || !seed.length || seed.length > 256) throw new Error('Seed must contain 1–256 characters.');
  const local = pins.shape || pins.layout || pins.fragments.length > 0;
  // A local mutation holds the frame and resolved controls. Independently seeded
  // pieces can change without moving or repainting the user's preserved fragment.
  const options = local ? recipe(current) : { ...state.options };
  options.seed = seed;
  if (pins.shape && current.version < 7) options.seed = current.seed;
  options.ornamentSeed = local ? current.ornamentSeed : seed;
  if (current.style !== 'compose' && local || options.style && options.style !== 'compose') delete options.ornamentSeed;
  if (current.version >= 7 && (local || options.version === undefined || options.version === 7)) {
    for (const key of domains) options[key] = seed;
    options.fragmentSeeds = {};
    if (pins.shape) {
      for (const key of domains) options[key] = current[key];
      options.fragmentSeeds = recipe(current).fragmentSeeds;
    } else if (pins.fragments.length) {
      for (const key of ['layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed']) options[key] = current[key];
      options.fragmentSeeds = Object.fromEntries(Object.entries(recipe(current).fragmentSeeds).map(([id, value]) => [id, pins.fragments.includes(id) ? value : `${seed}/${id}`]));
    } else if (pins.layout) {
      for (const key of ['layoutSeed', 'roleSeed', 'motifSeed', 'interactionSeed']) options[key] = current[key];
    }
  }
  if (pins.colors) Object.assign(options, savedColors(current));
  else {
    delete options.colors; delete options.colorProgram;
    options.palette = state.options.palette ?? 'generated';
    options.colorSeed = state.options.colorSeed ?? seed;
  }
  return { ...state, current: createDesign(options) };
}

export function explorerAction(state, action) {
  if (action.type === 'reroll') return reroll(state, action.seed ?? randomSeed());
  if (action.type === 'pin') {
    if (action.target === 'fragment') {
      if (!explorerFragments(state.current).some(({ id }) => id === action.id)) throw new Error('Choose an available assembly fragment to pin.');
      const fragments = state.pins.fragments.includes(action.id) ? state.pins.fragments.filter((id) => id !== action.id) : [...state.pins.fragments, action.id];
      return { ...state, pins: { ...state.pins, fragments } };
    }
    if (!['shape', 'layout', 'colors'].includes(action.target)) throw new Error('Unknown pin target.');
    if (action.target === 'layout' && state.current.version < 7) throw new Error('Layout pins require a version 7 design.');
    return { ...state, pins: { ...state.pins, [action.target]: !state.pins[action.target] } };
  }
  if (action.type === 'favorite') {
    const value = recipe(state.current);
    if (state.favorites.some((saved) => JSON.stringify(saved) === JSON.stringify(value))) return state;
    if (state.favorites.length >= 100) throw new Error('Favorites are full (100 recipes).');
    return { ...state, favorites: [...state.favorites, value] };
  }
  if (action.type === 'load-favorite') {
    if (!Number.isInteger(action.index) || !state.favorites[action.index]) throw new Error('Choose an available favorite.');
    const current = fromRecipe(state.favorites[action.index]);
    return { ...state, current, pins: noPins() };
  }
  throw new Error(`Unknown explorer action: ${action.type}`);
}
