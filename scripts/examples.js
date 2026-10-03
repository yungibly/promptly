import { mkdirSync, writeFileSync } from 'node:fs';
import { createDesign, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';

const examples = [
  ['signal', 'first-contact/1', 'phosphor', 3],
  ['reliquary', 'first-contact/2', 'ultraviolet', 5],
  ['mycelium', 'first-contact/3', 'ember', 5],
  ['orrery', 'first-contact/4', 'abyss', 5],
  ['xenoweave', 'first-contact/5', 'phosphor', 5],
];
mkdirSync(new URL('../examples/', import.meta.url), { recursive: true });
for (const [style, seed, palette, complexity] of examples) {
  const design = createDesign({ style, seed, palette, complexity, label: 'finn' });
  writeFileSync(new URL(`../examples/${style}.json`, import.meta.url), JSON.stringify(recipe(design), null, 2) + '\n');
  writeFileSync(new URL(`../examples/${style}.zsh`, import.meta.url), compile(design));
}
