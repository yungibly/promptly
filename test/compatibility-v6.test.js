import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fromRecipe, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';

const hash = (value) => createHash('sha256').update(value).digest('hex');
test('version-6 exports, scenes, and derivations remain frozen across all engines and glyph modes', () => {
  const cases = JSON.parse(readFileSync(new URL('./fixtures/v6-baseline.json', import.meta.url), 'utf8'));
  for (const entry of cases) {
    const design = fromRecipe(entry.recipe);
    const { scene, cursor, rightPrompt, program } = design;
    assert.deepEqual(recipe(design), entry.recipe);
    assert.equal(hash(compile(design)), entry.source, entry.recipe.seed);
    assert.equal(hash(JSON.stringify({ scene, cursor, rightPrompt, program })), entry.composition, entry.recipe.seed);
  }
});
