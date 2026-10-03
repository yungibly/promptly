import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createDesign, fromRecipe, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';

// Saved earlier recipes are compatibility specimens, including sampled colors
// and controls. Recompile them without resampling their historical appearance.
const saved = ['signal', 'reliquary', 'mycelium', 'orrery', 'xenoweave', 'compose', 'network', 'assembly', 'surface', 'surface-inline', 'surface-capsule', 'surface-curves'];
const examples = saved.map((name) => [name, fromRecipe(JSON.parse(readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8')))]);
examples.push(
  ['relations', createDesign({ engine: 'surface', seed: 'relations/1', complexity: 3, glyphs: 'powerline' })],
  ['relations-inline', createDesign({ engine: 'surface', seed: 'relations/2', complexity: 7, height: 1, weight: 0.8, glyphs: 'powerline' })],
  ['relations-light', createDesign({ engine: 'prompt', seed: 'relations/3', complexity: 8, weight: 0.15 })],
  ['relations-capsule', createDesign({ engine: 'surface', seed: 'audit/349', complexity: 7, height: 1, glyphs: 'powerline' })],
  ['live-network', createDesign({ engine: 'network', seed: 'working-art', complexity: 8, height: 6 })],
);
mkdirSync(new URL('../examples/', import.meta.url), { recursive: true });
for (const [name, design] of examples) {
  writeFileSync(new URL(`../examples/${name}.json`, import.meta.url), JSON.stringify(recipe(design), null, 2) + '\n');
  writeFileSync(new URL(`../examples/${name}.zsh`, import.meta.url), compile(design));
}
