// Hugging live fields in a real shell: decoration follows `cd`, while every
// column after a reservation stays put and paint never reaches command entry.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createDesign } from '../src/design.js';
import { Scene, left, anchor } from '../src/scene.js';
import { compile, quoteZsh } from '../src/compile.js';
import { preview } from '../src/preview.js';

export function testHugging({ tui, state, check, eventually, snapshot, output, cells }) {
  const normalize = (text) => text.split('\n').map((line) => line.trimEnd()).join('\n').trimEnd();
  const submit = (command) => { tui('submit', command); tui('wait', 'idle'); };
  const scene = new Scene(2).text(0, left(0), '╭─[', 1)
    .slot(0, left(3), 'directory', 24, 3, { suffix: ']', suffixInk: 1, pad: '─', padInk: 0 })
    .text(0, left(27), '┤', 1)
    .text(0, left(29), '◖', 6)
    .live(0, left(30), 14, [{ role: 'username', width: 8, ink: { fg: 2, bg: 6 } }, { text: '◗', ink: 6 }], { text: '·', ink: 0 })
    .text(0, anchor(1000, -2), '╮', 1)
    .text(1, left(0), '╰─›', 4);
  const design = { ...createDesign({ seed: 'hugging-terminal', engine: 'surface', height: 2 }), scene, cursor: 4 };
  const file = `${output}/hugging.zsh`;
  writeFileSync(file, compile(design));
  submit(`source ${quoteZsh(file)}; clear`);
  // Short absolute paths fit; the long leaf truncates inside its reservation.
  const root = resolve(tmpdir(), 'promptly-hug');
  const ends = new Set();
  for (const leaf of ['a', 'a-much-longer-directory/with/several/levels', '界面界面', 'd%n$(id)']) {
    const cwd = resolve(root, leaf);
    mkdirSync(cwd, { recursive: true });
    for (const width of [120, 90]) {
      tui('resize', String(width), '24');
      submit(`cd ${quoteZsh(cwd)}; clear`);
      eventually(() => normalize(state().text) === normalize(preview(design, { width, color: false, cwd })), `${leaf}@${width}: hugging prompt differs from preview`);
      const row = cells(0, 0, width);
      const close = row.findIndex((cell) => cell.char === ']');
      ends.add(close);
      check(close > 3 && close <= 26 && row[close - 1].char !== ' ', `${leaf}: bracket does not follow the directory`);
      check(row.slice(close + 1, 27).every((cell) => cell.char === '─'), `${leaf}: leader does not fill to the reservation end`);
      check(row[27].char === '┤' && row[width - 4].char === '╮', `${leaf}@${width}: columns after the reservation moved`);
      const filled = row.map((cell, x) => cell.bg !== 'default' && cell.bg !== state().colors.background ? x : -1).filter((x) => x >= 0);
      const cap = row.findIndex((cell, x) => x > 29 && cell.char === '◗');
      check(filled.length && filled[0] === 30 && filled.at(-1) === cap - 1, `${leaf}: surface does not end with the username`);
      tui('type', 'echo hug'); tui('wait', 'idle');
      check(state().cursor.x === design.cursor + 8 && state().cursor.y === 1, `${leaf}: hugging moved command entry`);
      tui('key', 'press', 'Ctrl+C'); tui('wait', 'idle');
    }
    snapshot(`hugging-${leaf === '界面界面' ? 'wide' : leaf.startsWith('d%') ? 'literal' : leaf.length > 1 ? 'long' : 'short'}`);
  }
  check(ends.size >= 2, 'hugging bracket did not move with the directory length');

  // Version-8 compact relations as live prompts: a leader into the cursor, an
  // elbow, a segmented pill, a split line, a stepped line, and a rail.
  const relations = [['live-v8/2', 'prompt'], ['live-v8/1', 'surface'], ['live-v8/3', 'surface'], ['live-v8/14', 'prompt'], ['live-v8/15', 'surface'], ['live-v8/30', 'prompt']];
  tui('resize', '120', '24');
  for (const [seed, engine] of relations) {
    const compact = createDesign({ seed, engine });
    const source = `${output}/${seed.replace('/', '-')}.zsh`;
    writeFileSync(source, compile(compact));
    for (const leaf of ['a', 'a-much-longer-directory/with/several/levels']) {
      const cwd = resolve(root, leaf);
      submit(`source ${quoteZsh(source)}; cd ${quoteZsh(cwd)}; clear`);
      eventually(() => normalize(state().text) === normalize(preview(compact, { width: 120, color: false, cwd })), `${seed}/${leaf}: compact prompt differs from preview`);
      check(state().cursor.x === compact.cursor && state().cursor.y === compact.scene.rows - 1, `${seed}/${leaf}: hugging moved the input anchor`);
      tui('type', 'echo v8'); tui('wait', 'idle');
      const background = state().colors.background;
      check(state().cursor.x === compact.cursor + 7 && cells(compact.cursor, compact.scene.rows - 1, 7).every((cell) => cell.bg === 'default' || cell.bg === background), `${seed}: paint reached command entry`);
      tui('key', 'press', 'Ctrl+C'); tui('wait', 'idle');
    }
    snapshot(`compact-v8-${seed.split('/')[1]}`);
  }
  // Later checks run the CLI relative to the repository.
  submit(`promptly_off; cd ${quoteZsh(process.cwd())}; clear`);
  tui('resize', '120', '24');
  console.log('PASS hugging live fields and version-8 compact relations follow cd while later columns, colors, and command entry stay fixed');
}
