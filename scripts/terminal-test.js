// Real terminal tests, opt-in: requires the official microsoft/tui-test binary.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { userInfo } from 'node:os';
import { createDesign, fromRecipe } from '../src/design.js';
import { compile, quoteZsh } from '../src/compile.js';
import { preview } from '../src/preview.js';
import { grammars } from '../src/grammars.js';
import { gallery, signature } from '../src/gallery.js';
import { compile as legacy } from '../test/fixtures/legacy-compile.js';
import { testExplorer } from './explorer-terminal.js';
import { testV7 } from './v7-terminal.js';

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
const cells = (x, y, width, height = 1) => JSON.parse(tui('cells', String(x), String(y), String(width), String(height), '--json')).data.cells;
const fitRows = () => { const current = state(); tui('resize', String(current.cols), String(Math.max(24, current.cursor.y + 3))); settle(); };
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
  // npm injects EDITOR=vi. Choose emacs before startup so zsh configures its
  // terminal keys in the map used by these Ctrl+E checks, only in this test shell.
  tui('open', '--shell', 'zsh', '--backend', 'ghostty', '--cols', '120', '--rows', '24',
    '--cwd', root, '--env', `ZDOTDIR=${output}/zdot`, '--env', 'EDITOR=emacs', '--env', 'VISUAL=emacs', '--config', resolve('tui-test.toml'), '--no-wait-ready');
  submit('unset NO_COLOR; PROMPT="before> "; RPROMPT=""; clear');
  const upgrade = createDesign({ version: 4, seed: 'upgrade', engine: 'prompt', info: false });
  writeFileSync(`${output}/legacy.zsh`, legacy(upgrade));
  writeFileSync(`${output}/upgrade.zsh`, compile(upgrade));
  submit(`source ${quoteZsh(`${output}/legacy.zsh`)}; print -r -- "LEGACY:\${+widgets[_promptly_redraw]}"`);
  check(state().text.includes('\nLEGACY:1\n'), 'legacy renderer did not register its redraw widget');
  submit(`source ${quoteZsh(`${output}/upgrade.zsh`)}; print -r -- "RETIRED:\${+widgets[_promptly_redraw]}:\${+functions[_promptly_expand]}"`);
  check(state().text.includes('\nRETIRED:0:0\n'), 'new export did not retire the legacy widget and expansion callback');
  submit(`typeset -ga precmd_functions; promptly_test_hook() { :; }; precmd_functions+=(promptly_test_hook); source ${quoteZsh(`${output}/upgrade.zsh`)}; source ${quoteZsh(`${output}/upgrade.zsh`)}; print -r -- "HOOKS:\${(j:,:)precmd_functions}"`);
  check(state().text.includes('\nHOOKS:promptly_test_hook\n'), 'sourcing twice changed another precmd hook');
  for (const style of [...Object.keys(grammars), 'network', 'assembly']) {
    const design = createDesign(JSON.parse(readFileSync(`examples/${style}.json`, 'utf8')));
    submit(`source ${quoteZsh(resolve(`examples/${style}.zsh`))}; clear`);
    const first = state();
    check(first.cursor.x === design.cursor, `${style}: input cursor should be ${design.cursor}, got ${first.cursor.x}`);
    check(first.cursor.y === design.scene.rows - 1, `${style}: prompt must not wrap`);
    check(normalize(first.text) === normalize(preview(design, { width: 120, color: false })), `${style}: preview differs from actual prompt`);
    const painted = cells(0, 0, 120, design.scene.rows);
    check(new Set(painted.map((cell) => cell.fg).filter((fg) => fg !== 'default')).size >= (['assembly', 'prompt'].includes(design.engine) ? 2 : 4), `${style}: missing palette colors`);
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
  submit('print -r -- "HOOKS:${(j:,:)precmd_functions}"');
  check(state().text.includes('\nHOOKS:promptly_test_hook\n'), 'disabling removed another precmd hook');
  console.log('PASS live resize, continuation, exit status, and prompt restoration');

  const safe = createDesign({ seed: 'portable', glyphs: 'ascii', complexity: 8 });
  writeFileSync(`${output}/ascii.zsh`, compile(safe));
  submit(`source ${quoteZsh(`${output}/ascii.zsh`)}; clear`);
  check(/^[\x20-\x7e\n]*$/.test(state().text), 'ASCII prompt leaked Unicode');
  snapshot('ascii');
  const specimens = gallery({ seed: 'possibility', complexity: 8 }, 8);
  check(['prompt', 'surface', 'network', 'assembly'].every((engine) => specimens.some((specimen) => specimen.engine === engine)), 'mixed gallery lost a procedural family');
  for (const [i, specimen] of specimens.entries()) {
    const file = `${output}/specimen-${i + 1}.zsh`;
    writeFileSync(file, compile(specimen));
    submit(`source ${quoteZsh(file)}; clear`);
    check(state().cursor.x === specimen.cursor && state().cursor.y === specimen.scene.rows - 1, `${specimen.seed}: cursor drifted`);
    check(normalize(state().text) === normalize(preview(specimen, { width: 120, color: false })), `${specimen.seed}: preview differs from actual prompt`);
    snapshot(`specimen-${i + 1}`);
  }
  // Exercise a one-row prompt as an actual editable shell, including RPROMPT
  // clearance and long input. Gallery parity alone cannot establish this.
  const single = createDesign({ engine: 'prompt', seed: 'single-entry', height: 1, complexity: 10, label: 'finn' });
  writeFileSync(`${output}/single.zsh`, compile(single));
  submit(`source ${quoteZsh(`${output}/single.zsh`)}; clear`);
  check(state().cursor.x === single.cursor && state().cursor.y === 0, 'single-row input anchor drifted');
  tui('type', `echo ${'x'.repeat(150)}`);
  settle();
  check(state().cursor.y === 1 && state().cursor.x === (single.cursor + 155) % 120, 'single-row wrapping drifted');
  press('Ctrl+C', 'Ctrl+L');
  submit('echo ready');
  check(state().text.includes('\nready\n'), 'single-row command failed');
  tui('type', 'echo next');
  snapshot('compact-in-use');
  press('Ctrl+C');
  console.log('PASS compact entry/editing plus all four procedural families');

  // Identity slots must update through native prompt expansion after cd, without
  // regenerating or re-sourcing the exported prompt. Preview uses this same file.
  const identity = createDesign({ engine: 'prompt', seed: 'live-identity', height: 3, info: true });
  const identityFile = `${output}/identity.zsh`;
  writeFileSync(identityFile, compile(identity));
  submit(`source ${quoteZsh(identityFile)}; clear`);
  check(state().text.includes(userInfo().username), 'current username is missing from the live prompt');
  check(state().text.includes('promptly'), 'current directory is missing from the live prompt');
  snapshot('identity');
  for (const leaf of ['dev-one', 'review notes', 'd%n$(id)', '界面']) {
    const cwd = resolve(output, 'identity-cwd', leaf);
    mkdirSync(cwd, { recursive: true });
    submit(`cd ${quoteZsh(cwd)}; clear`);
    check(normalize(state().text) === normalize(preview(identity, { width: 120, color: false, cwd })), `${leaf}: directory preview differs from exported prompt`);
    check(state().text.includes(leaf), `${leaf}: current directory was lost or interpreted as prompt/shell code`);
    check(state().cursor.x === identity.cursor && state().cursor.y === identity.scene.rows - 1, `${leaf}: live fields moved the input anchor`);
    tui('type', 'echo entry');
    settle();
    check(state().cursor.x === identity.cursor + 10, `${leaf}: editing after cd drifted`);
    snapshot(`identity-${leaf === '界面' ? 'wide' : leaf === 'd%n$(id)' ? 'literal' : leaf.replaceAll(' ', '-')}`);
    press('Ctrl+C');
  }
  submit(`cd ${quoteZsh(root)}; typeset -g promptly_test_path=$PATH; PATH=''`);
  press('Ctrl+L');
  check(normalize(state().text) === normalize(preview(identity, { width: 120, color: false })), 'live identity depends on an external command');
  submit('PATH=$promptly_test_path; unset promptly_test_path');
  console.log('PASS live username/directory, cd, literal metacharacters, wide text, and empty PATH');

  // Version 5 remains a recipe compatibility target. Fresh generation below
  // must not be judged by these older multirow contour specimens.
  const surfaces = gallery({ version: 5, engine: 'surface', seed: 'open-medium', complexity: 8, info: true }, 6);
  const backgroundShapes = new Set();
  let multicoloredSurfaces = 0;
  for (const [i, surface] of surfaces.entries()) {
    const file = `${output}/surface-${i + 1}.zsh`;
    writeFileSync(file, compile(surface));
    submit(`source ${quoteZsh(file)}; clear`);
    check(normalize(state().text) === normalize(preview(surface, { width: 120, color: false })), `${surface.seed}: colored surface preview differs from exported prompt`);
    check(surface.scene.rows <= 3 && state().cursor.y === surface.scene.rows - 1 && state().cursor.x === surface.cursor, `${surface.seed}: surface must stay within its compact input reservation`);
    const painted = cells(0, 0, 120, surface.scene.rows);
    const backdrop = state().colors.background;
    const isFilled = (cell) => cell.bg !== 'default' && cell.bg !== backdrop;
    const backgrounds = new Set(painted.filter(isFilled).map((cell) => cell.bg));
    if (backgrounds.size > 1) multicoloredSurfaces++;
    if (backgrounds.size) backgroundShapes.add(painted.map((cell, index) => isFilled(cell) ? index : -1).filter((index) => index >= 0).join(','));
    snapshot(`legacy-surface-${i + 1}`);
    tui('type', 'echo color');
    settle();
    const entry = cells(surface.cursor, surface.scene.rows - 1, 10);
    check(entry.every((cell) => !isFilled(cell)), `${surface.seed}: tile background leaked into command entry`);
    check(state().cursor.x === surface.cursor + 10, `${surface.seed}: surface editing cursor drifted`);
    press('Ctrl+C');
  }
  check(backgroundShapes.size >= 3, 'surface gallery did not vary actual occupied background geometry');
  check(multicoloredSurfaces >= 1, 'surface gallery did not include independently colored tiles');
  console.log('PASS legacy surface recipes, backgrounds, and clean command entry');

  const contours = [
    ['capsule', 'curves/14'], ['roundbox', 'curves/4'], ['step', 'curves/9'],
    ['tab', 'curves/2'], ['arch', 'curves/16'],
  ];
  for (const [name, seed] of contours) {
    const contour = createDesign({ version: 5, engine: 'surface', seed, height: 3, complexity: 8, info: true });
    const file = `${output}/contour-${name}.zsh`;
    writeFileSync(file, compile(contour));
    submit(`source ${quoteZsh(file)}; clear`);
    check(normalize(state().text) === normalize(preview(contour, { width: 120, color: false })), `${name}: contour differs from exported preview`);
    check(state().cursor.x === contour.cursor && state().cursor.y === 2, `${name}: contour moved the input anchor`);
    tui('type', 'echo shape');
    settle();
    check(state().cursor.x === contour.cursor + 10, `${name}: contour editing drifted`);
    snapshot(`legacy-contour-${name}`);
    press('Ctrl+C');
  }
  const powerline = createDesign({ version: 5, engine: 'surface', seed: 'round-caps/0', height: 1, complexity: 6, glyphs: 'powerline', info: true });
  writeFileSync(`${output}/powerline.zsh`, compile(powerline));
  submit(`source ${quoteZsh(`${output}/powerline.zsh`)}; clear`);
  check(state().text.includes('\ue0b6') && state().text.includes('\ue0b4'), 'Powerline half-circle caps are missing');
  check(normalize(state().text) === normalize(preview(powerline, { width: 120, color: false })), 'Powerline preview differs from exported prompt');
  check(state().cursor.x === powerline.cursor && state().cursor.y === 0, 'Powerline caps are not one-cell glyphs');
  tui('type', 'echo rounded');
  settle();
  check(state().cursor.x === powerline.cursor + 12, 'Powerline editing cursor drifted');
  snapshot('powerline');
  press('Ctrl+C');
  console.log('PASS legacy curved/block recipes and optional Powerline half-circle caps');

  const darkPills = createDesign({ version: 5, engine: 'surface', seed: 'colored-caps/311', height: 2, complexity: 3, glyphs: 'powerline', palette: 'velvet', info: true });
  writeFileSync(`${output}/dark-pills.zsh`, compile(darkPills));
  submit(`source ${quoteZsh(`${output}/dark-pills.zsh`)}; clear`);
  check([...state().text].filter((char) => char === '\ue0b6').length === 2 && [...state().text].filter((char) => char === '\ue0b4').length === 2, 'dark identity fields must have two complete rounded pills');
  check(normalize(state().text) === normalize(preview(darkPills, { width: 120, color: false })), 'dark pill preview differs from exported prompt');
  check(state().cursor.x === darkPills.cursor && state().cursor.y === 1, 'dark pills must leave a separate compact input row');
  for (const slot of darkPills.scene.runs.filter((run) => run.role)) {
    const field = cells(slot.x.offset, slot.row, slot.width);
    check(field.every((cell) => cell.bg === '#2a1a4a'), `${slot.role}: dark violet pill background missing`);
    check(field.every((cell) => cell.fg === (slot.role === 'username' ? '#00e5b0' : '#e8933a')), `${slot.role}: colored text was replaced by contrast black/white`);
  }
  tui('type', 'echo quiet');
  settle();
  check(state().cursor.x === darkPills.cursor + 10, 'dark pill command cursor drifted');
  const darkEntry = cells(darkPills.cursor, 1, 10), defaultColors = state().colors;
  check(darkEntry.every((cell) => (cell.bg === 'default' || cell.bg === defaultColors.background) && (cell.fg === 'default' || cell.fg === defaultColors.foreground)), 'dark pill finish leaked color into command entry');
  snapshot('dark-pills');
  press('Ctrl+C');
  console.log('PASS legacy dark rounded backgrounds, cyan/orange live text, and plain command entry');

  const surfaceEntry = createDesign({ version: 5, engine: 'surface', seed: 'open-medium/1', height: 1, complexity: 8, info: true });
  const surfaceEntryFile = `${output}/surface-entry.zsh`;
  const wideCwd = resolve(output, 'identity-cwd', '界面');
  writeFileSync(surfaceEntryFile, compile(surfaceEntry));
  submit(`source ${quoteZsh(surfaceEntryFile)}; cd ${quoteZsh(wideCwd)}; clear`);
  check(normalize(state().text) === normalize(preview(surfaceEntry, { width: 120, color: false, cwd: wideCwd })), 'single-row wide directory preview differs from native prompt');
  tui('type', 'echo live');
  for (const width of [80, 79, 40, 28, 27, 120]) {
    tui('resize', String(width), '24');
    settle();
    press('Ctrl+L');
    const cursor = width < 28 ? 2 : width < 80 ? surfaceEntry.compact.cursor : surfaceEntry.cursor;
    check(state().cursor.x === cursor + 9, `surface resize ${width}: live field or input cursor drifted`);
    check(normalize(state().text) === normalize(preview(surfaceEntry, { width, color: false, command: 'echo live', cwd: wideCwd })), `surface resize ${width}: wide directory or preserved input differs from preview`);
    snapshot(`surface-resize-${width}`);
  }
  press('Ctrl+C');
  submit(`cd ${quoteZsh(root)}; clear`);
  tui('type', `echo ${'x'.repeat(150)}`);
  settle();
  check(state().cursor.y === 1 && state().cursor.x === (surfaceEntry.cursor + 155) % 120, 'single-row surface long input wrapping drifted');
  press('Ctrl+C');
  console.log('PASS colored single-row live directory, resizing, and long input');

  // Review an uncurated run, not hand-picked successes. This fixed consecutive
  // sequence is also rendered below with a common palette so color cannot hide
  // repeated arrangements. Every specimen first behaves as a real editable shell.
  const consecutive = Array.from({ length: 12 }, (_, i) => createDesign({
    engine: 'surface', seed: `relations/${i + 1}`, complexity: 3, glyphs: 'powerline',
  }));
  for (const [i, specimen] of consecutive.entries()) {
    const file = `${output}/relations-${i + 1}.zsh`;
    writeFileSync(file, compile(specimen));
    submit(`source ${quoteZsh(file)}; clear`);
    check(specimen.version === 7, `${specimen.seed}: consecutive review must exercise the new relation composer`);
    check(state().cursor.x === specimen.cursor && state().cursor.y === specimen.scene.rows - 1, `${specimen.seed}: relation input anchor drifted`);
    check(normalize(state().text) === normalize(preview(specimen, { width: 120, color: false })), `${specimen.seed}: relation preview differs from exported prompt`);
    check(!/[╭╮╰╯▗▖▝▘▄▀]/u.test(state().text), `${specimen.seed}: fresh compact composition restored top/bottom curved contours`);
    tui('type', 'echo layout');
    settle();
    check(state().cursor.x === specimen.cursor + 11, `${specimen.seed}: relation editing cursor drifted`);
    const entry = cells(specimen.cursor, specimen.scene.rows - 1, 11);
    const backdrop = state().colors.background;
    check(entry.every((cell) => cell.bg === 'default' || cell.bg === backdrop), `${specimen.seed}: relation surface entered the command buffer`);
    snapshot(`relations-${i + 1}`);
    press('Ctrl+C');
  }
  console.log('PASS all 12 consecutive relation specimens: exported cells, compact geometry, editing and entry clearance');

  // Saved assembly/network examples above are compatibility recipes. Exercise
  // their new shared role bands separately, including live directory changes.
  for (const engine of ['assembly', 'network']) {
    const specimen = createDesign({ engine, seed: `live-role-band/${engine}`, complexity: 6, height: 6, glyphs: 'powerline', info: true });
    const file = `${output}/live-${engine}.zsh`;
    writeFileSync(file, compile(specimen));
    submit(`source ${quoteZsh(file)}; source ${quoteZsh(file)}; clear`);
    check(specimen.version === 7, `${engine}: role-band test must use a new recipe`);
    check(state().text.includes(userInfo().username) && state().text.includes('promptly'), `${engine}: live username or directory missing`);
    check(state().cursor.x === specimen.cursor && state().cursor.y === specimen.scene.rows - 1, `${engine}: role-band input anchor drifted`);
    check(normalize(state().text) === normalize(preview(specimen, { width: 120, color: false })), `${engine}: role band differs from exported preview`);
    submit(`cd ${quoteZsh(wideCwd)}; clear`);
    check(state().text.includes('界面'), `${engine}: directory role did not update after cd`);
    tui('type', 'echo band');
    settle();
    check(state().cursor.x === specimen.cursor + 9, `${engine}: editing after directory change drifted`);
    const entry = cells(specimen.cursor, specimen.scene.rows - 1, 9);
    const backdrop = state().colors.background;
    check(entry.every((cell) => cell.bg === 'default' || cell.bg === backdrop), `${engine}: role-band color entered the command buffer`);
    for (const width of [80, 40, 120]) {
      tui('resize', String(width), '24');
      settle();
      press('Ctrl+L');
      const cursor = width < 80 ? specimen.compact.cursor : specimen.cursor;
      check(state().cursor.x === cursor + 9, `${engine} resize ${width}: input cursor drifted`);
      check(normalize(state().text) === normalize(preview(specimen, { width, color: false, command: 'echo band', cwd: wideCwd })), `${engine} resize ${width}: role band differs from exported preview`);
      snapshot(`live-${engine}-${width}`);
    }
    press('Enter');
    check(state().text.includes('\nband\n'), `${engine}: command execution after role-band resize failed`);
    submit(`cd ${quoteZsh(root)}; clear`);
  }
  console.log('PASS fresh assembly/network live role bands, source twice, wide directories, editing and responsive widths');

  // Exercise the actual no-flags path and a reproducible seed-only sequence.
  // Never select this batch for appearance: a run of related results must remain
  // visible. Objective extremes from a wider fixed pool supplement that review.
  const defaultPool = Array.from({ length: 256 }, (_, i) => {
    const specimen = createDesign({ seed: `slot-machine/${i + 1}` });
    const shape = signature(specimen);
    return { specimen, metrics: { rows: specimen.scene.rows, cells: Math.round(shape[2] * specimen.scene.rows * 79), density: shape[2], complexity: specimen.complexity, weight: specimen.weight } };
  });
  const defaultBatch = defaultPool.slice(0, 24);
  const extremeCriteria = [
    ['fewest cells', 'cells', false], ['most cells', 'cells', true],
    ['shortest', 'rows', false], ['tallest', 'rows', true],
    ['lowest complexity budget', 'complexity', false], ['highest complexity budget', 'complexity', true],
    ['lowest role weight', 'weight', false], ['highest role weight', 'weight', true],
    ['sparsest', 'density', false], ['densest', 'density', true],
  ];
  const defaultExtremes = new Map();
  for (const [label, key, descending] of extremeCriteria) {
    const chosen = defaultPool.reduce((best, item) => (descending ? item.metrics[key] > best.metrics[key] : item.metrics[key] < best.metrics[key]) ? item : best);
    const existing = defaultExtremes.get(chosen.specimen.seed);
    if (existing) existing.labels.push(label);
    else defaultExtremes.set(chosen.specimen.seed, { ...chosen, labels: [label] });
  }
  check(['prompt', 'surface', 'network', 'assembly'].every((engine) => defaultPool.some(({ specimen }) => specimen.engine === engine)), 'seed-only default pool lost a procedural family');
  check(Array.from({ length: 10 }, (_, i) => i + 1).every((n) => defaultPool.some(({ metrics }) => metrics.complexity === n)), 'seed-only default pool did not reach every complexity');
  check(defaultPool.some(({ metrics }) => metrics.rows === 1) && defaultPool.some(({ metrics }) => metrics.rows === 12), 'seed-only defaults did not reach short and tall footprints');
  check(defaultPool.some(({ metrics }) => metrics.weight < 0.05) && defaultPool.some(({ metrics }) => metrics.weight > 0.95), 'seed-only defaults did not reach both weight extremes');
  const exportDefault = (args) => {
    const result = spawnSync(process.execPath, ['bin/promptly.js', ...args], { cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 16 * 1024 * 1024 });
    check(result.status === 0, `default CLI export failed: ${result.stderr}`);
    const saved = JSON.parse(result.stdout.match(/^# Recipe: (.+)$/m)?.[1] ?? 'null');
    const specimen = fromRecipe(saved);
    check(specimen.version === 7 && specimen.info && specimen.palette === 'generated', 'bare/seed-only CLI did not use fresh defaults');
    return { specimen, source: result.stdout };
  };
  const bare = exportDefault([]);
  const defaultLive = [{ ...bare, name: 'default-bare', labels: ['actual no-flags roll'] }];
  const exercised = new Set();
  for (const { specimen, labels = [] } of [...defaultBatch, ...defaultExtremes.values()]) {
    if (exercised.has(specimen.seed)) continue;
    exercised.add(specimen.seed);
    defaultLive.push({ ...exportDefault(['--seed', specimen.seed]), name: `default-${specimen.seed.split('/').at(-1)}`, labels });
  }
  for (const { specimen, source, name } of defaultLive) {
    const file = `${output}/${name}.zsh`;
    writeFileSync(file, source);
    submit(`source ${quoteZsh(file)}; clear`);
    check(state().cursor.x === specimen.cursor && state().cursor.y === specimen.scene.rows - 1, `${specimen.seed}: default input anchor drifted`);
    check(normalize(state().text) === normalize(preview(specimen, { width: 120, color: false })), `${specimen.seed}: default CLI export differs from preview`);
    check(state().text.includes(userInfo().username) && state().text.includes('promptly'), `${specimen.seed}: default live identity missing`);
    // Keep bracketed-paste handling out of this physical-key editing check.
    press('e', 'c', 'h', 'o', 'Space', 's', 'l', '0', 't');
    press('Left', 'Left', 'Delete');
    press('o', 'Ctrl+E');
    check(state().cursor.x === specimen.cursor + 9, `${specimen.seed}: default in-line editing drifted`);
    const backdrop = state().colors.background;
    check(cells(specimen.cursor, specimen.scene.rows - 1, 9).every((cell) => cell.bg === 'default' || cell.bg === backdrop), `${specimen.seed}: default paint entered the command buffer`);
    snapshot(name);
    press('Enter');
    check(state().text.includes('\nslot\n'), `${specimen.seed}: default edited command failed`);
  }
  console.log(`PASS bare invocation and ${defaultLive.length - 1} seed-only CLI exports: all families, objective extremes, actual source, live editing and entry clearance`);

  submit('promptly_off; clear');

  const explorerReport = testExplorer({ tui, state, check, eventually, snapshot, output });
  const v7Report = testV7({ tui, state, check, eventually, snapshot, output, cells });

  const normalizedColors = ['#707070', '#969696', '#eeeeee', '#bbbbbb', '#d8d8d8', '#ffffff', '#303030'];
  for (const [name, subtitle, commonColors] of [
    ['relations-colored', 'consecutive seeds / natural colors', null],
    ['relations-normalized', 'same consecutive seeds / fixed grayscale palette', normalizedColors],
  ]) {
    const lines = ['  P R O M P T L Y  /  relation study', `  ${subtitle}`, ''];
    for (const [i, specimen] of consecutive.entries()) {
      lines.push(`  ${String(i + 1).padStart(2, '0')}  ${specimen.seed}`, '');
      lines.push(preview(commonColors ? { ...specimen, colors: commonColors } : specimen, { width: 120 }).trimEnd(), '');
    }
    const sheet = `${output}/${name}.ansi`;
    writeFileSync(sheet, lines.join('\n') + '\n');
    tui('resize', '120', String(lines.join('\n').split('\n').length + 4));
    submit(`clear; cat ${quoteZsh(sheet)}`);
    check(consecutive.every((specimen) => state().text.includes(specimen.seed)), `${name}: contact sheet omitted a consecutive specimen`);
    fitRows();
    snapshot(name);
  }

  const defaultSheets = [
    ...Array.from({ length: Math.ceil(defaultBatch.length / 6) }, (_, i) => ({ name: `defaults-${i + 1}`, title: `unselected consecutive seeds ${i * 6 + 1}-${Math.min(defaultBatch.length, i * 6 + 6)}`, entries: defaultBatch.slice(i * 6, i * 6 + 6) })),
    ...Array.from({ length: Math.ceil(defaultExtremes.size / 5) }, (_, i) => ({ name: `default-extremes-${i + 1}`, title: 'objective extremes / fixed 256-seed pool', entries: [...defaultExtremes.values()].slice(i * 5, i * 5 + 5) })),
  ];
  for (const { name, title, entries } of defaultSheets) for (const commonColors of [null, normalizedColors]) {
    const suffix = commonColors ? '-normalized' : '';
    const lines = ['  P R O M P T L Y  /  seed-only defaults', `  ${title} / ${commonColors ? 'fixed grayscale' : 'natural colors'}`, ''];
    for (const { specimen, metrics, labels } of entries) {
      lines.push(`  ${specimen.seed}  |  ${specimen.engine}  |  detail ${metrics.complexity}  |  ${metrics.rows} rows${labels ? `  |  ${labels.join(', ')}` : ''}`, '');
      lines.push(preview(commonColors ? { ...specimen, colors: commonColors } : specimen, { width: 120 }).trimEnd(), '');
    }
    const sheet = `${output}/${name}${suffix}.ansi`;
    writeFileSync(sheet, lines.join('\n') + '\n');
    tui('resize', '120', String(lines.join('\n').split('\n').length + 4));
    submit(`clear; cat ${quoteZsh(sheet)}`);
    check(entries.every(({ specimen }) => state().text.includes(specimen.seed)), `${name}${suffix}: default contact sheet omitted a specimen`);
    fitRows();
    snapshot(`${name}${suffix}`);
  }

  tui('resize', '120', '88');
  submit('clear; node bin/promptly.js gallery --seed possibility --width 120 --complexity 8 --count 8');
  fitRows();
  snapshot('gallery');
  check(state().text.includes('P R O M P T L Y'), 'gallery did not render');
  tui('resize', '120', '45');
  submit('clear; node bin/promptly.js gallery --engine prompt --seed closely --width 120 --complexity 8 --count 6');
  fitRows();
  snapshot('prompt-gallery');
  check(state().text.includes('P R O M P T L Y'), 'compact gallery did not render');
  tui('resize', '120', '45');
  submit('clear; node bin/promptly.js gallery --engine surface --seed open-medium --width 120 --complexity 8 --count 6');
  fitRows();
  snapshot('surfaces');
  check(state().text.includes('P R O M P T L Y'), 'surface gallery did not render');
  writeFileSync(`${output}/report.json`, JSON.stringify({ backend: 'ghostty', checks, explorer: explorerReport, v7: v7Report, styles: [...Object.keys(grammars), 'network', 'assembly', 'surface'], resizeWidths: [80, 40, 27, 160, 120], surfaceResizeWidths: [80, 79, 40, 28, 27, 120], liveRoleBands: { engines: ['assembly', 'network'], resizeWidths: [80, 40, 120] }, legacySurfaces: { version: 5, backgroundShapes: backgroundShapes.size, multicoloredSurfaces, contours: contours.map(([name]) => name) }, consecutiveSeeds: consecutive.map((specimen) => specimen.seed), defaults: { bareSeed: bare.specimen.seed, poolSize: defaultPool.length, consecutive: defaultBatch.map(({ specimen, metrics }) => ({ seed: specimen.seed, engine: specimen.engine, ...metrics })), extremes: [...defaultExtremes.values()].map(({ specimen, metrics, labels }) => ({ seed: specimen.seed, engine: specimen.engine, ...metrics, labels })), liveSeeds: defaultLive.map(({ specimen }) => specimen.seed) }, glyphModes: ['unicode', 'ascii', 'powerline'] }, null, 2) + '\n');
  console.log(`PASS ${checks} assertions. Captures: ${output}`);
} catch (error) {
  try { snapshot('failure'); } catch { /* Keep the original assertion failure. */ }
  throw error;
} finally {
  try { tui('close'); } catch { /* Session may already have exited. */ }
}
