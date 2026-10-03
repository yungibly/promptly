#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { createDesign, fromRecipe, mutateDesign, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';
import { preview } from '../src/preview.js';
import { grammars } from '../src/grammars.js';
import { palettes } from '../src/palettes.js';
import { randomSeed } from '../src/random.js';
import { materials, alphabets } from '../src/ornaments.js';
import { gallery } from '../src/gallery.js';

const help = `
  P R O M P T L Y
  A generative art instrument for your shell.

  promptly preview [options]       Render a design using its actual zsh runtime
  promptly gallery [options]       Explore a collection of diverse specimens
  promptly export [options]        Write a standalone, sourceable .zsh prompt
  promptly inspect [options]       Print a recipe, or --program for its derivation
  promptly mutate [options]        Vary a recipe while preserving its art direction
  promptly styles                 List composition grammars and palettes

  --seed TEXT                     Repeatable seed; random when omitted
  --style NAME                    compose (default), or a classic named grammar
  --engine auto|prompt|assembly|network
                                  Mixed exploration by default, or focus one engine
  --palette NAME                  phosphor, ultraviolet, ember, abyss
  --complexity 1..10               Growth/detail budget (default: 3; classic: 1..5)
  --material NAME                 rounded, square, double, heavy, dashed
  --alphabet NAME                 geometric, punctuation, technical, granular, runic
  --symmetry none|mirror           Reflect the composition, or keep it asymmetric
  --height 1..12                   Row budget: prompt 1–3, assembly 2–12, network 4–12
  --spread 0..1                    Extent/right accents (prompt or assembly)
  --fragments 1..12                Ornament/region target (prompt or assembly)
  --connectivity 0..1              Chance of linking eligible neighbors (often 0)
  --density 0.15..0.85             Detail/field density; network occupancy target
  --label TEXT                    Static inscription, up to 20 characters
  --glyphs unicode|ascii           Unicode by default; no Nerd Font required
  --width N                       Preview width (default: terminal width or 100)
  --count N                       Gallery size (default: 5; maximum: 24)
  --from FILE                     Load a saved JSON recipe
  --variation TEXT                Mutation suffix (default: fresh random seed)
  --scope all|structure|ornament   Mutate independently (default: all)
  --program                       Inspect primitive operations, ancestry, and stats
  --out FILE                      Export destination; otherwise writes to stdout
  --force                         Allow replacing an existing output file
  --no-color                      Plain previews
  --help                          Show this help

  node bin/promptly.js gallery --seed possibility --complexity 7 --label finn
  node bin/promptly.js export --seed moth --out moth.zsh
  source ./moth.zsh
  promptly_off                    Restore the previous prompt in that shell

  Export never edits your shell startup files. Requires Node 22+ to generate,
  zsh 5.8+ to render. Exported prompts need only zsh. Colors target dark themes.
`;

function save(file, content, force) {
  const destination = resolve(file);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content, { flag: force ? 'w' : 'wx' });
  process.stderr.write(`Saved ${destination}\n`);
}

function integer(value, fallback, min, max, name) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return n;
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      seed: { type: 'string' }, style: { type: 'string' }, palette: { type: 'string' },
      complexity: { type: 'string' }, label: { type: 'string' }, glyphs: { type: 'string' },
      material: { type: 'string' }, alphabet: { type: 'string' }, symmetry: { type: 'string' },
      engine: { type: 'string' }, spread: { type: 'string' }, fragments: { type: 'string' }, connectivity: { type: 'string' },
      height: { type: 'string' }, density: { type: 'string' }, scope: { type: 'string' }, program: { type: 'boolean' },
      width: { type: 'string' }, count: { type: 'string' }, from: { type: 'string' },
      variation: { type: 'string' }, out: { type: 'string' },
      force: { type: 'boolean' }, 'no-color': { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help || !positionals.length) return process.stdout.write(help);
  const [command] = positionals;
  if (positionals.length > 1) throw new Error('Unexpected positional arguments. See --help.');
  if (command === 'styles') {
    for (const [title, items] of [['COMPOSITIONS', grammars], ['PALETTES', palettes]]) {
      process.stdout.write(`\n${title}\n`);
      for (const [name, data] of Object.entries(items)) process.stdout.write(`  ${name.padEnd(14)} ${data.description}\n`);
    }
    process.stdout.write(`\nENGINES\n  auto (mixed), prompt (compact), assembly (freeform), network (connected)\n\nMATERIALS\n  ${Object.keys(materials).join(', ')}\n\nALPHABETS\n  ${Object.keys(alphabets).join(', ')}\n`);
    return;
  }
  if (!['preview', 'gallery', 'export', 'inspect', 'mutate'].includes(command)) throw new Error(`Unknown command: ${command}. See --help.`);
  if (values.out && !['export', 'inspect', 'mutate'].includes(command)) throw new Error('--out is available for export, inspect, and mutate.');
  if (values.program && command !== 'inspect') throw new Error('--program is available for inspect.');
  if (values.scope && command !== 'mutate') throw new Error('--scope is available for mutate.');
  const base = values.from ? recipe(fromRecipe(JSON.parse(readFileSync(values.from, 'utf8')))) : {};
  const options = { ...base };
  for (const key of ['seed', 'style', 'palette', 'complexity', 'label', 'glyphs', 'engine', 'material', 'alphabet', 'symmetry', 'height', 'density', 'spread', 'fragments', 'connectivity']) {
    if (values[key] !== undefined) options[key] = values[key];
  }
  const design = createDesign(options);
  const width = integer(values.width, Math.min(1000, Math.max(10, process.stdout.columns || 100)), 10, 1000, 'Width');
  const color = !values['no-color'] && process.env.NO_COLOR === undefined;
  const renderOptions = { width, color };

  if (command === 'export') {
    const source = compile(design);
    if (values.out) save(values.out, source, values.force);
    else process.stdout.write(source);
    process.stderr.write(`Recipe: ${JSON.stringify(recipe(design))}\n`);
  } else if (command === 'inspect' || command === 'mutate') {
    const result = command === 'mutate' ? mutateDesign(design, values.variation ?? randomSeed(), values.scope ?? 'all') : design;
    if (values.program && !result.program) throw new Error('--program requires style compose.');
    const json = JSON.stringify(values.program ? { recipe: recipe(result), ...result.program } : recipe(result), null, 2) + '\n';
    if (values.out) save(values.out, json, values.force);
    else process.stdout.write(json);
  } else if (command === 'preview') {
    process.stderr.write(`${design.engine ?? design.style} / ${design.palette} / seed ${JSON.stringify(design.seed)}\n`);
    process.stdout.write(preview(design, renderOptions));
  } else {
    const count = integer(values.count, 5, 1, 24, 'Count');
    const faint = (s) => color ? `\x1b[38;2;126;133;151m${s}\x1b[0m` : s;
    const title = color ? '\x1b[38;2;220;232;230mP R O M P T L Y\x1b[0m' : 'P R O M P T L Y';
    process.stdout.write(`\n  ${title}  ${faint('/  field specimens')}\n`);
    process.stdout.write(faint(`  Seed ${JSON.stringify(design.seed)} · ${width} columns · ${design.glyphs}\n`));
    const specimens = gallery({ ...options, seed: design.seed }, count);
    for (const [i, specimen] of specimens.entries()) {
      const direction = specimen.style === 'compose' ? `${specimen.engine} / ${specimen.material} / ${specimen.alphabet}` : specimen.style;
      process.stdout.write(`\n${faint(`  ${String(i + 1).padStart(2, '0')}  ${direction} / ${JSON.stringify(specimen.seed)}`)}\n\n`);
      process.stdout.write(preview(specimen, renderOptions));
    }
    process.stdout.write('\n');
  }
}

try { main(); }
catch (error) {
  process.stderr.write(`promptly: ${error.message}\n`);
  process.exitCode = 1;
}
