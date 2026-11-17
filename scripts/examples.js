import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fromRecipe, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';

// Saved recipes are compatibility specimens, including sampled colors and
// controls. Recompile them without resampling their historical appearance.
const saved = ['relations', 'relations-inline', 'relations-light', 'relations-capsule', 'live-network', 'asymmetric-caps', 'shared-network', 'shared-assembly', 'evolving-art',
  'textured-pill', 'line-meander', 'gradient-bed', 'bounded-network', 'horizon', 'contours', 'automaton-runs'];
const examples = saved.map((name) => [name, fromRecipe(JSON.parse(readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8')))]);
mkdirSync(new URL('../examples/', import.meta.url), { recursive: true });
for (const [name, design] of examples) {
  writeFileSync(new URL(`../examples/${name}.json`, import.meta.url), JSON.stringify(recipe(design), null, 2) + '\n');
  writeFileSync(new URL(`../examples/${name}.zsh`, import.meta.url), compile(design));
}
