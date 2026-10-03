import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import { createDesign as createCurrentDesign } from '../src/design.js';
import { compile } from '../src/compile.js';
import { compile as legacy } from './fixtures/legacy-compile.js';
import { Scene, left, right, anchor } from '../src/scene.js';

// The independent renderer oracle covers frozen pre-slot scenes.
const createDesign = (options) => createCurrentDesign({ version: options.style ? 1 : ({ network: 2, assembly: 3 }[options.engine] ?? 4), engine: options.style ? undefined : options.engine ?? 'prompt', ...options });

function shell(input, timeout = 120000) {
  const r = spawnSync('zsh', ['-f'], { input, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024 });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
  return r.stdout;
}

// Compare visible cells and their ink, ignoring irrelevant color changes on
// whitespace. The old renderer is independent of the new span compiler.
function cells(text) {
  let color = '', result = [];
  for (const token of text.matchAll(/\x1b\[[0-9;]*m|[^\x1b]/gu)) {
    const s = token[0];
    if (s.startsWith('\x1b')) {
      if (s.startsWith('\x1b[38;')) color = s;
      else if (s === '\x1b[39m' || s === '\x1b[0m') color = '';
    } else result.push([s, s.trim() ? color : '']);
  }
  return result;
}

function rendered(source, widths) {
  return shell(`${source}\nfor COLUMNS in ${widths.join(' ')}; do print -rnP -- "$PROMPT"; print -rn -- $'\\0'; done\n`).split('\0').slice(0, -1);
}

test('compiled text preserves every family, wire crossings, clipping, and narrow fallbacks', () => {
  const widths = [1, 2, 3, 10, 27, 28, 29, 40, 79, 80, 81, 82, 99, 100, 120, 137, 201, 511, 999, 1000, 1001, 2000];
  const options = [
    ...['signal', 'reliquary', 'mycelium', 'orrery', 'xenoweave'].map((style) => ({ style, complexity: 5 })),
    ...['prompt', 'assembly', 'network'].flatMap((engine) => [1, 10].map((complexity) => ({ engine, complexity }))),
    { engine: 'prompt', seed: 'a4c43e0e', palette: 'ultraviolet', complexity: 3 },
  ];
  for (const config of options) {
    const design = createDesign({ info: false, seed: 'compiler-parity', ...config });
    const before = rendered(legacy(design), widths), after = rendered(compile(design), widths);
    for (let i = 0; i < widths.length; i++) assert.deepEqual(cells(after[i]), cells(before[i]), `${design.engine ?? design.style}, width ${widths[i]}`);
  }
});

test('span expressions preserve overlapping repeated patterns and literal shell metacharacters', () => {
  const scene = new Scene(3);
  scene.fill(0, left(), right(), 'ab%:$`\\', 2);
  scene.text(0, anchor(400), ' overlay ', 3);
  scene.text(1, left(), '$(print BAD) `print BAD` %F{red} \\ "quotes"', 2);
  scene.text(1, right(), 'TAIL', 4, 'right');
  scene.text(2, left(), '>');
  const design = { ...createDesign({ info: false, seed: 'literal' }), scene, cursor: 2 };
  const widths = Array.from({ length: 48 }, (_, i) => 80 + i);
  const before = rendered(legacy(design), widths), after = rendered(compile(design), widths);
  for (let i = 0; i < widths.length; i++) assert.deepEqual(cells(after[i]), cells(before[i]), `width ${widths[i]}`);
  assert.ok(stripVTControlCharacters(after[0]).includes('$(print BAD) `print BAD` %F{red}'));
});

test('compact and connected exports match the old renderer throughout the supported width domain', () => {
  const widths = Array.from({ length: 1001 }, (_, i) => i + 1);
  for (const config of [{ engine: 'prompt', seed: 'a4c43e0e', complexity: 3 }, { engine: 'network', seed: 'domain', height: 4, complexity: 8 }]) {
    const design = createDesign({ ...config, info: false });
    const before = rendered(legacy(design), widths), after = rendered(compile(design), widths);
    for (let i = 0; i < widths.length; i++) assert.deepEqual(cells(after[i]), cells(before[i]), `${config.engine}, width ${widths[i]}`);
  }
});

test('replacing a legacy export retires its hooks and still restores the original shell', () => {
  const design = createDesign({ info: false, seed: 'upgrade', engine: 'prompt' });
  const output = shell(`PROMPT='original> '\nRPROMPT='right'\nPS2='more> '\nunsetopt multibyte\n${legacy(design)}\n${compile(design)}
print -r -- "hooks:\${(j:,:)precmd_functions}"
print \${+functions[_promptly_build]}:\${+functions[_promptly_expand]}
promptly_off
print -r -- "$PROMPT|$RPROMPT|$PS2|$options[multibyte]"
`);
  assert.equal(output, 'hooks:\n0:0\noriginal> |right|more> |off\n');
});

test('small exports contain only text, parameter arithmetic, and undo support', () => {
  const design = createDesign({ info: false, seed: 'a4c43e0e', engine: 'prompt', palette: 'ultraviolet', complexity: 3 });
  const source = compile(design);
  assert.ok(Buffer.byteLength(source) < Buffer.byteLength(legacy(design)) / 3);
  assert.doesNotMatch(source, /\$\((?!\()|_promptly_(?:paint|wire|expand)\(|add-zsh-hook|add-zle-hook|for\s*\(\(/);
});
