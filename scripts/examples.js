import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createDesign, fromRecipe, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';

// Saved earlier recipes are compatibility specimens, including sampled colors
// and controls. Recompile them without resampling their historical appearance.
const saved = ['signal', 'reliquary', 'mycelium', 'orrery', 'xenoweave', 'compose', 'network', 'assembly', 'surface', 'surface-inline', 'surface-capsule', 'surface-curves', 'relations', 'relations-inline', 'relations-light', 'relations-capsule', 'live-network'];
const examples = saved.map((name) => [name, fromRecipe(JSON.parse(readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8')))]);
examples.push(
  ['asymmetric-caps', createDesign({ engine: 'surface', seed: 'asymmetric-caps/1', height: 1, weight: 1, complexity: 8, glyphs: 'powerline' })],
  ['shared-network', createDesign({ engine: 'network', seed: 'shared-network/3', height: 6, complexity: 8 })],
  ['shared-assembly', createDesign({ engine: 'assembly', seed: 'shared-assembly/130', height: 6, complexity: 8, connectivity: 1, fragments: 5 })],
  ['evolving-art', createDesign({ engine: 'assembly', seed: 'evolving-art/12', height: 8, complexity: 9, fragments: 5 })],
);
mkdirSync(new URL('../examples/', import.meta.url), { recursive: true });
for (const [name, design] of examples) {
  writeFileSync(new URL(`../examples/${name}.json`, import.meta.url), JSON.stringify(recipe(design), null, 2) + '\n');
  writeFileSync(new URL(`../examples/${name}.zsh`, import.meta.url), compile(design));
}
