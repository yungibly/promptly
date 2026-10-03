// Real terminal tests, opt-in: requires the official microsoft/tui-test binary.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDesign } from '../src/design.js';
import { compile, quoteZsh } from '../src/compile.js';
import { preview } from '../src/preview.js';
import { grammars } from '../src/grammars.js';
import { gallery } from '../src/gallery.js';

const binary = resolve(process.env.TUI_TEST_BIN || '.tools/tui-test');
const root = resolve('.');
const output = resolve('artifacts/terminal');
const session = `promptly-test-${process.pid}`;
mkdirSync(`${output}/zdot`, { recursive: true });

function tui(...args) {
  const result = spawnSync(binary, ['--session', session, ...args], { encoding: 'utf8', timeout: 15000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}
const state = () => JSON.parse(tui('state', '--json')).data;
const settle = () => tui('wait', 'idle');
const press = (...keys) => { tui('key', 'press', ...keys); settle(); };
const submit = (command) => { tui('submit', command); settle(); };
const snapshot = (name) => {
  tui('screenshot', `${output}/${name}.png`);
  writeFileSync(`${output}/${name}.json`, JSON.stringify(state(), null, 2) + '\n');
};
const normalize = (text) => text.split('\n').map((line) => line.trimEnd()).join('\n').trimEnd();

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}

function eventually(predicate, message) {
  const deadline = Date.now() + 3000;
  do {
    if (predicate()) { checks++; return; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
  } while (Date.now() < deadline);
  assert.fail(message);
}

try {
  tui('open', '--shell', 'zsh', '--backend', 'ghostty', '--cols', '120', '--rows', '24',
    '--cwd', root, '--env', `ZDOTDIR=${output}/zdot`, '--config', resolve('tui-test.toml'), '--no-wait-ready');
  submit('unset NO_COLOR; PROMPT="before> "; RPROMPT=""; clear');
  for (const style of [...Object.keys(grammars), 'network']) {
    const design = createDesign(JSON.parse(readFileSync(`examples/${style}.json`, 'utf8')));
    submit(`source ${quoteZsh(resolve(`examples/${style}.zsh`))}; clear`);
    const first = state();
    check(first.cursor.x === design.cursor, `${style}: input cursor should be ${design.cursor}, got ${first.cursor.x}`);
    check(first.cursor.y === design.scene.rows - 1, `${style}: prompt must not wrap`);
    check(normalize(first.text) === normalize(preview(design, { width: 120, color: false })), `${style}: preview differs from actual prompt`);
    const cells = JSON.parse(tui('cells', '0', '0', '120', String(design.scene.rows), '--json')).data.cells;
    check(new Set(cells.map((cell) => cell.fg).filter((fg) => fg !== 'default')).size >= (design.engine === 'assembly' ? 2 : 4), `${style}: missing palette colors`);
    snapshot(style);

    // Exercise actual ZLE editing, including mutation within the input line.
    tui('type', 'echo M0ON');
    press('Left', 'Left', 'Left', 'Delete');
    tui('type', 'O');
    press('Ctrl+E');
    check(state().cursor.x === design.cursor + 9, `${style}: editing cursor drifted (${state().cursor.x})`);
    press('Enter');
    check(state().text.includes('\nMOON\n'), `${style}: edited command was not executed correctly`);
    press('Ctrl+L');
    tui('type', `echo ${'x'.repeat(150)}`);
    settle();
    const wrapped = state();
    check(wrapped.cursor.y === design.scene.rows, `${style}: long input should wrap exactly once`);
    check(wrapped.cursor.x === (design.cursor + 155) % 120, `${style}: wrapped cursor drifted`);
    // RPROMPT belongs to zsh and should disappear when input reaches it.
    const inputRows = wrapped.text.split('\n').slice(design.scene.rows - 1);
    const input = inputRows[0].slice(design.cursor).trimEnd() + inputRows.slice(1).map((line) => line.trimEnd()).join('');
    check(input === `echo ${'x'.repeat(150)}`, `${style}: right ornament collided with long input`);
    press('Ctrl+C', 'Ctrl+L');
    console.log(`PASS ${style}: cells, colors, editing, wrapping, right-prompt clearance`);
  }

  const design = createDesign(JSON.parse(readFileSync('examples/compose.json', 'utf8')));
  submit(`source ${quoteZsh(resolve('examples/compose.zsh'))}; clear`);
  tui('type', 'echo preserved');
  for (const width of [80, 40, 27, 160, 120]) {
    tui('resize', String(width), '24');
    settle();
    const resized = state();
    const cursor = width < 28 ? 2 : width < 80 ? 5 : design.cursor;
    check(resized.cursor.x === cursor + 14, `resize ${width}: input cursor drifted (${resized.cursor.x})`);
    check(resized.text.includes('echo preserved'), `resize ${width}: input was lost`);
    // Terminal reflow may leave previously printed multiline art in scrollback.
    // Ctrl+L asks zsh to repaint the active frame without touching the input.
    press('Ctrl+L');
    const expected = normalize(preview(design, { width, color: false, command: 'echo preserved' }));
    eventually(() => normalize(state().text) === expected, `resize ${width}: active frame differs from preview`);
    snapshot(`resize-${width}`);
  }
  press('Enter');
  check(state().text.includes('\npreserved\n'), 'command should survive repeated resize');
  press('Ctrl+L');
  submit('print "first');
  check(state().text.endsWith('\n...') && state().cursor.x === 4, 'continuation prompt missing');
  submit('second"');
  check(state().text.includes('\nfirst\nsecond\n'), 'multiline command failed');
  submit('false');
  submit('print -r -- "STATUS:$?"');
  check(state().text.includes('\nSTATUS:1\n'), 'prompt expansion changed the command exit status');
  submit('promptly_off; clear');
  check(state().text.trimEnd() === 'before>', 'original prompt was not restored');
  submit('print -r -- "WIDGET:${+widgets[_promptly_redraw]}"');
  check(state().text.includes('\nWIDGET:0\n'), 'disabled prompt left its widget registered');
  console.log('PASS live resize, continuation, exit status, and prompt restoration');

  const safe = createDesign({ seed: 'portable', glyphs: 'ascii', complexity: 8 });
  writeFileSync(`${output}/ascii.zsh`, compile(safe));
  submit(`source ${quoteZsh(`${output}/ascii.zsh`)}; clear`);
  check(/^[\x20-\x7e\n]*$/.test(state().text), 'ASCII prompt leaked Unicode');
  snapshot('ascii');
  const specimens = gallery({ seed: 'possibility', label: 'finn', complexity: 8 }, 6);
  for (const [i, specimen] of specimens.entries()) {
    const file = `${output}/assembly-${i + 1}.zsh`;
    writeFileSync(file, compile(specimen));
    submit(`source ${quoteZsh(file)}; clear`);
    check(state().cursor.x === specimen.cursor && state().cursor.y === specimen.scene.rows - 1, `${specimen.seed}: cursor drifted`);
    check(normalize(state().text) === normalize(preview(specimen, { width: 120, color: false })), `${specimen.seed}: preview differs from actual prompt`);
    snapshot(`assembly-${i + 1}`);
  }
  console.log('PASS sparse, textured, linked, mirrored, and layered assembly specimens');
  submit('promptly_off; clear');
  tui('resize', '120', '75');
  submit('clear; node bin/promptly.js gallery --seed possibility --label finn --width 120 --complexity 8 --count 6');
  snapshot('gallery');
  check(state().text.includes('P R O M P T L Y'), 'gallery did not render');
  writeFileSync(`${output}/report.json`, JSON.stringify({ backend: 'ghostty', checks, styles: [...Object.keys(grammars), 'network'], resizeWidths: [80, 40, 27, 160, 120] }, null, 2) + '\n');
  console.log(`PASS ${checks} assertions. Captures: ${output}`);
} catch (error) {
  try { snapshot('failure'); } catch { /* Keep the original assertion failure. */ }
  throw error;
} finally {
  try { tui('close'); } catch { /* Session may already have exited. */ }
}
