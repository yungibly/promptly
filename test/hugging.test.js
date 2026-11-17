import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { createDesign } from '../src/design.js';
import { Scene, left, anchor } from '../src/scene.js';
import { compile } from '../src/compile.js';
import { flatten } from '../src/flatten.js';

const base = createDesign({ seed: 'hugging', engine: 'surface', height: 2 });
const wide = (char) => /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u.test(char) ? 2 : 1;
const cellWidth = (text) => [...text].reduce((n, char) => n + wide(char), 0);
// macOS keeps temporary files behind the /var -> /private/var symlink; zsh
// compares HOME with the physical PWD, so use the resolved path.
const root = realpathSync(mkdtempSync(join(tmpdir(), 'promptly-hug-')));
test.after(() => rmSync(root, { recursive: true, force: true }));

// Run the exported source in zsh. A username cannot be changed without
// privileges, so `user` substitutes a literal value for `%n` in the source.
function render(scene, { width = 100, cwd = root, home = root, user, cursor = 999 } = {}) {
  let source = compile({ ...base, scene, cursor });
  if (user) source = source.replaceAll('%n%>>', `${user}%>>`);
  const result = spawnSync('zsh', ['-f'], { input: `COLUMNS=${width}\n${source}\nprint -rP -- "$PROMPT"\n`, cwd, encoding: 'utf8',
    env: { ...process.env, HOME: home, TERM: 'xterm-256color', COLORTERM: 'truecolor' } });
  assert.equal(result.stderr, '');
  return result.stdout;
}

// Cells with their background, read from the actual SGR output.
function cells(output) {
  const rows = [[]];
  let bg = null;
  for (const token of output.match(/\x1b\[[0-9;]*m|[^\x1b]/gu)) {
    if (token.startsWith('\x1b[')) {
      const codes = token.slice(2, -1).split(';');
      if (codes[0] === '48') bg = codes.slice(2).join(';');
      if (codes[0] === '49' || codes[0] === '0' || codes[0] === '') bg = null;
    } else if (token === '\n') rows.push([]);
    else for (let i = 0; i < wide(token); i++) rows.at(-1).push({ char: i ? '' : token, bg });
  }
  return rows;
}
const plain = (output) => cells(output).map((row) => row.map((cell) => cell.char).join('').trimEnd());
const at = (row, column) => cells(row)[0][column]?.char;

function expected(value, limit, start = false) {
  if (cellWidth(value) <= limit) return value;
  const chars = [...value];
  let kept = '';
  while (chars.length && cellWidth(kept) + wide(start ? chars[0] : chars.at(-1)) <= limit - 2) kept = start ? kept + chars.shift() : chars.pop() + kept;
  return start ? `${kept}..` : `..${kept}`;
}

test('a hugging bracket follows short, long, home-relative, and wide directories while later columns stay fixed', () => {
  const home = join(root, 'a-rather-long-home-directory', 'for-someone-with-deep-nesting');
  const directories = [
    ['/', '/'],
    [join(root, 'p'), join(root, 'p')],
    [home, '~'],
    [join(home, 'Code', 'promptly'), '~/Code/promptly'],
    [join(home, 'Code', 'a-project-with-a-very-long-name', 'src'), '~/Code/a-project-with-a-very-long-name/src'],
    [join(root, '界面界面界面'), join(root, '界面界面界面')],
    [join(home, 'x', '界面界面界面界面界面界面'), '~/x/界面界面界面界面界面界面'],
  ];
  for (const [cwd, shown] of directories) {
    mkdirSync(cwd, { recursive: true });
    const scene = new Scene(1).text(0, left(0), '─[', 1)
      .slot(0, left(2), 'directory', 22, 3, { suffix: ']', suffixInk: 1, pad: '─', padInk: 0 })
      .text(0, left(24), '╮', 1);
    const line = plain(render(scene, { cwd, home }))[0];
    const value = expected(shown, 21);
    assert.equal(line, `─[${value}]${'─'.repeat(21 - cellWidth(value))}╮`, cwd);
    assert.equal(cellWidth(line), 25);
  }
});

test('usernames truncate at their end, leaving room for hugging caps, in fixed and relative positions', () => {
  for (const user of [userInfo().username, 'ab', 'eightchr', 'averyveryverylongname']) {
    for (const width of [80, 100, 157]) {
      const scene = new Scene(1)
        .slot(0, left(1), 'username', 9, { fg: 2, bg: 6 }, { suffix: '◗', suffixInk: 6, pad: '·', padInk: 0 })
        .text(0, left(10), '│', 1)
        .slot(0, anchor(500, -4), 'username', 8, 3, { suffix: ')' })
        .text(0, anchor(500, 4), '┤', 1);
      const output = render(scene, { width, user });
      const line = plain(output)[0], value = expected(user, 8, true), middle = Math.trunc(500 * (width - 2) / 1000);
      assert.equal(line.slice(0, 11), ` ${value}◗${'·'.repeat(8 - value.length)}│`, `${user}@${width}`);
      assert.equal(at(output, middle - 4 + expected(user, 7, true).length), ')', `${user}@${width}: relative suffix`);
      assert.equal(at(output, middle + 4), '┤', `${user}@${width}: relative boundary moved`);
      // The filled surface ends with the text and its cap; the pad is plain.
      const filled = cells(output)[0].map((cell, x) => cell.bg ? x : -1).filter((x) => x >= 0);
      assert.deepEqual(filled, Array.from({ length: value.length }, (_, i) => i + 1), `${user}: surface should end with the text`);
    }
  }
});

test('compound live runs flow several values and literal glyphs inside one fixed reservation', () => {
  const cwd = join(root, 'compound', 'directory');
  mkdirSync(cwd, { recursive: true });
  const parts = [{ text: '(', ink: 1 }, { role: 'username', width: 6, ink: 2 }, { text: ')─[', ink: 1 }, { role: 'directory', width: 12, ink: 3 }, { text: ']', ink: 1 }];
  for (const user of ['ab', 'averyveryverylongname']) {
    const scene = new Scene(2).live(0, left(2), 30, parts, { text: ' ' }).text(0, left(32), '◆', 4).text(1, left(0), '›', 4);
    const [line] = plain(render(scene, { cwd, user }));
    const flowing = `(${expected(user, 6, true)})─[../directory]`;
    assert.equal(line, `  ${flowing}${' '.repeat(30 - cellWidth(flowing))}◆`, user);
  }
});

test('ASCII mode keeps hugging geometry, and pad or literal metacharacters stay literal text', () => {
  const build = (glyphs, pad) => new Scene(1, glyphs).text(0, left(0), '◖', 6)
    .live(0, left(1), 20, [{ role: 'directory', width: 10, ink: { fg: 2, bg: 6 } }, { text: '◗', ink: 6 }, { text: '%n$(id)`\\', ink: 1 }], { text: pad, ink: 1 })
    .text(0, left(21), '╮', 1);
  const cwd = join(root, 'q');
  mkdirSync(cwd, { recursive: true });
  const unicode = plain(render(build('unicode', '·─'), { cwd, home: cwd }))[0];
  const ascii = plain(render(build('ascii', '·─'), { cwd, home: cwd }))[0];
  // A pad pattern is phased from the run's first cell, not from the value end.
  assert.equal(unicode, '◖~◗%n$(id)`\\─·─·─·─·─╮');
  assert.equal(ascii, '(~)%n$(id)`\\-.-.-.-.-+');
  assert.match(ascii, /^[\x20-\x7e]+$/);
  for (const pad of ['.', ')', '%', '$', '`', '\\', '(', ',']) {
    assert.equal(plain(render(build('unicode', pad), { cwd, home: cwd }))[0], `◖~◗%n$(id)\`\\${pad.repeat(9)}╮`, pad);
  }
});

test('flatten keeps a hugging run as its full reservation and rejects overpainting it', () => {
  const scene = new Scene(2).slot(0, left(3), 'directory', 12, 3, { suffix: ']', pad: '─' }).text(0, left(15), '╮', 1);
  const [row] = flatten({ scene, cursor: 0 }, 79);
  const span = row.find((part) => part.role);
  assert.equal(span.to.offset - span.from.offset, 12);
  assert.deepEqual(span.pad, { text: '─', ink: 0 });
  // A blank pad ending an art row draws nothing, so it compiles to nothing.
  const trailing = new Scene(2).slot(0, left(0), 'directory', 12, 3, { suffix: ']' }).text(1, left(0), '›', 4);
  assert.match(compile({ ...base, scene: trailing, cursor: 2 }), /%11<\.\.<%~%<<\]%f%b%k/);
  scene.text(0, left(8), 'x', 1);
  assert.throws(() => compile({ ...base, scene, cursor: 2 }), /clipped or overpainted/);
  const invalid = new Scene(1);
  assert.throws(() => invalid.live(0, left(0), 6, [{ role: 'directory', width: 6 }, { text: ']' }]), /exceed/);
  assert.throws(() => invalid.live(0, left(0), 6, [{ text: '[' }]), /needs a username or directory/);
  assert.throws(() => invalid.slot(0, left(0), 'host', 6, 2, {}), /Unknown live role/);
  assert.throws(() => invalid.slot(0, left(0), 'directory', 8, 2, { suffix: '\x1b[2J' }), /single-cell/);
  for (const glyph of ['😀', '界', 'Ａ', '\u0301']) assert.throws(() => invalid.slot(0, left(0), 'directory', 8, 2, { pad: glyph }), /single-cell/);
});
