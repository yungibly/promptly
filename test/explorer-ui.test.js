import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDesign, recipe } from '../src/design.js';
import { compile } from '../src/compile.js';
import { runExplorer, explorerFrame } from '../src/explorer.js';
import { createExplorerState } from '../src/exploration.js';

class Input extends PassThrough {
  isTTY = true;
  isRaw = false;
  setRawMode(value) { this.isRaw = value; return this; }
}
class Screen extends EventEmitter {
  isTTY = true;
  columns = 120;
  rows = 24;
  output = '';
  write(text) { this.output += text; return true; }
}
const makeDesign = () => createDesign({ seed: 'explorer-interface', engine: 'surface', height: 2, complexity: 4 });
function terminal() {
  const input = new Input(); input.pause();
  return { input, screen: new Screen(), signals: new EventEmitter(), render: () => 'native preview\n' };
}
function temporary(t) {
  const directory = mkdtempSync(join(tmpdir(), 'promptly-explorer-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}
const exportedRecipe = (source) => JSON.parse(source.match(/^# Recipe: (.+)$/m)[1]);

test('explorer rejects noninteractive streams before changing terminal or writing files', async (t) => {
  const tty = terminal(), out = join(temporary(t), 'winner.zsh');
  tty.input.isTTY = false;
  await assert.rejects(runExplorer({ ...tty, design: makeDesign(), out }), /interactive terminal/);
  assert.equal(tty.input.isRaw, false);
  assert.equal(tty.screen.output, '');
  assert.equal(existsSync(out), false);
});

test('export returns only source after restoring the terminal and removing handlers', async () => {
  const tty = terminal(), design = makeDesign();
  const pending = runExplorer({ ...tty, design });
  assert.equal(tty.input.isRaw, true);
  tty.input.write('e');
  const result = await pending;
  assert.equal(result.type, 'export');
  assert.equal(result.source, compile(design));
  assert.equal(tty.input.isRaw, false);
  assert.equal(tty.input.isPaused(), true);
  assert.equal(tty.input.listenerCount('keypress'), 0);
  assert.equal(tty.screen.listenerCount('resize'), 0);
  assert.equal(tty.signals.listenerCount('SIGINT'), 0);
  assert.match(tty.screen.output, /^\x1b\[\?1049h\x1b\[\?25l/);
  assert.ok(tty.screen.output.endsWith('\x1b[0m\x1b[?25h\x1b[?1049l'));
  assert.doesNotMatch(tty.screen.output, /# Promptly/);
});

test('quit pauses previously unconsumed stdin so the CLI can exit', async () => {
  const input = new Input();
  assert.equal(input.readableFlowing, null);
  const pending = runExplorer({ input, screen: new Screen(), signals: new EventEmitter(), design: makeDesign(), render: () => 'preview\n' });
  input.write('q');
  assert.equal((await pending).type, 'quit');
  assert.equal(input.isRaw, false);
  assert.equal(input.readableFlowing, false);
});

test('fragment focus dims other pieces only in a preview copy and reports reservations', async () => {
  const tty = terminal(), design = createDesign({ seed: 'explorer-focus', engine: 'assembly', height: 8, fragments: 4 });
  const original = JSON.stringify(design);
  const rendered = [];
  const pending = runExplorer({ ...tty, design, render(candidate) { rendered.push(candidate); return 'preview\n'; } });
  tty.input.write('\x1b[B');
  const focused = rendered.at(-1);
  assert.notEqual(focused, design);
  assert.equal(focused.colors.length, design.colors.length + 1);
  const selected = 'piece:1';
  for (const [index, run] of design.scene.runs.entries()) {
    assert.equal(focused.scene.runs[index].ink, run.fragmentId && run.fragmentId !== selected ? design.colors.length : run.ink);
  }
  assert.match(tty.screen.output, /FOCUS.*r\d+:c\d+ \d+x\d+/);
  tty.input.write('v');
  assert.equal(JSON.stringify(design), original);
  tty.input.write('e');
  assert.equal((await pending).source, compile(design));
});

test('favorites persist explicitly and comparison never silently changes the export', async (t) => {
  const tty = terminal(), design = makeDesign(), favoritesFile = join(temporary(t), 'favorites.json');
  const pending = runExplorer({ ...tty, design, favoritesFile });
  tty.input.write('f');
  const favorites = JSON.parse(readFileSync(favoritesFile, 'utf8'));
  assert.deepEqual(favorites, [recipe(design)]);
  tty.input.write('r');
  tty.input.write('\t');
  assert.match(tty.screen.output, /REFERENCE 1\/1/);
  assert.match(tty.screen.output, /e exports CURRENT/);
  tty.input.write('e');
  const result = await pending;
  assert.notEqual(exportedRecipe(result.source).seed, design.seed);
  assert.deepEqual(JSON.parse(readFileSync(favoritesFile, 'utf8')), favorites);
});

test('favorite browsing and adoption restore the chosen recipe, clearing pins', async (t) => {
  const tty = terminal(), first = makeDesign(), second = createDesign({ seed: 'second-favorite' });
  const favoritesFile = join(temporary(t), 'favorites.json');
  writeFileSync(favoritesFile, JSON.stringify([recipe(first), recipe(second)]));
  const pending = runExplorer({ ...tty, design: first, favoritesFile });
  tty.input.write('s');
  tty.input.write(']');
  assert.match(tty.screen.output, /REFERENCE 2\/2/);
  tty.input.write('\r');
  assert.match(tty.screen.output, /Favorite is now current\. Pins cleared/);
  tty.input.write('e');
  assert.equal((await pending).source, compile(second));
});

test('export refuses an existing file and keeps the explorer usable; force is explicit', async (t) => {
  const out = join(temporary(t), 'winner.zsh'), design = makeDesign();
  writeFileSync(out, 'keep me');
  const tty = terminal(), pending = runExplorer({ ...tty, design, out });
  tty.input.write('e');
  assert.equal(readFileSync(out, 'utf8'), 'keep me');
  assert.equal(tty.input.isRaw, true);
  assert.match(tty.screen.output, /already exists/);
  tty.input.write('q');
  assert.equal((await pending).type, 'quit');
  const forced = terminal(), exporting = runExplorer({ ...forced, design, out, force: true });
  forced.input.write('e');
  assert.equal((await exporting).path, out);
  assert.equal(readFileSync(out, 'utf8'), compile(design));
});

test('pin and fragment controls survive resize and quit restores previous raw state', async () => {
  const tty = terminal(), design = createDesign({ seed: 'explorer-fragments', engine: 'assembly', height: 5, fragments: 3 });
  tty.input.isRaw = true;
  const pending = runExplorer({ ...tty, design });
  tty.input.write('slc');
  tty.input.write('\x1b[B');
  tty.input.write('p');
  assert.match(tty.screen.output, /shape PINNED\s+layout PINNED\s+colors PINNED/);
  assert.match(tty.screen.output, /Fragment 2\/3: Fragment 2\s+\[PINNED\]/);
  tty.screen.columns = 30; tty.screen.rows = 10; tty.screen.emit('resize');
  assert.match(tty.screen.output, /Enlarge the terminal/);
  tty.screen.columns = 120; tty.screen.rows = 24; tty.screen.emit('resize');
  assert.match(tty.screen.output.slice(tty.screen.output.lastIndexOf('\x1b[H')), /colors PINNED/);
  tty.input.write('q');
  assert.equal((await pending).type, 'quit');
  assert.equal(tty.input.isRaw, true);
});

test('interrupts, renderer failure and invalid favorites restore terminal state', async (t) => {
  const tty = terminal(), pending = runExplorer({ ...tty, design: makeDesign() });
  tty.signals.emit('SIGTERM');
  assert.equal((await pending).exitCode, 143);
  assert.equal(tty.input.isRaw, false);
  const broken = terminal();
  await assert.rejects(runExplorer({ ...broken, design: makeDesign(), render() { throw new Error('zsh unavailable'); } }), /zsh unavailable/);
  assert.equal(broken.input.isRaw, false);
  assert.ok(broken.screen.output.endsWith('\x1b[0m\x1b[?25h\x1b[?1049l'));
  const favoritesFile = join(temporary(t), 'bad.json');
  writeFileSync(favoritesFile, '{}');
  const invalid = terminal();
  await assert.rejects(runExplorer({ ...invalid, design: makeDesign(), favoritesFile }), /JSON array/);
  assert.equal(invalid.screen.output, '');
});

test('frame uses terminal width for the native preview, bounds its rows, and escapes metadata', () => {
  const design = createDesign({ seed: 'seed\x1b[2J', engine: 'network', height: 12 });
  const state = createExplorerState({ design });
  const widths = [];
  const frame = explorerFrame(state, { scroll: 4 }, { columns: 84, rows: 16, color: false, render(_, { width }) {
    widths.push(width);
    return Array.from({ length: 12 }, (_, i) => `art row ${i + 1}`).join('\n') + '\n';
  } });
  assert.deepEqual(widths, [80]);
  assert.ok(frame.text.split('\r\n').length < 16);
  assert.match(frame.text, /art row 5/);
  assert.match(frame.text, /PgUp\/Dn/);
  assert.doesNotMatch(frame.text, /\x1b/);
  assert.match(frame.text, /\\u\{1b\}/);
});
