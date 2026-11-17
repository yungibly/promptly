import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import { compile } from './compile.js';

export function preview(design, { width = 100, color = true, command = '', cwd } = {}) {
  if (!Number.isInteger(width) || width < 10 || width > 1000) throw new Error('Width must be an integer from 10 to 1000.');
  // One renderer: previews exercise the exact exported zsh, including reflow.
  // The right prompt is expanded by the same export, after a separator.
  const source = compile(design) + `\nprint -rP -- "$PROMPT"\nprint -rn -- $'\\x1e'\nprint -rnP -- "$RPROMPT"\n`;
  const result = spawnSync('zsh', ['-f'], {
    input: `COLUMNS=${width}\n${source}`,
    encoding: 'utf8',
    cwd,
    maxBuffer: 8 * 1024 * 1024,
    timeout: 10000,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
  });
  if (result.error) throw new Error(`Could not run zsh: ${result.error.message}`);
  if (result.status !== 0 || result.stderr) throw new Error(`zsh render failed: ${result.stderr.trim() || result.status}`);
  const [left, right = ''] = result.stdout.split('\x1e');
  let rendered = left.replace(/\n$/, '');
  // Match the native RPROMPT's one-column right margin for a short example input.
  const cursor = width >= 80 ? design.cursor : width >= 28 ? design.compact.cursor : 2;
  const visible = [...stripVTControlCharacters(right)].length;
  const available = width - 1 - cursor - command.length - visible;
  rendered += command;
  if (visible && available > 0) rendered += ' '.repeat(available) + right + '\x1b[0m';
  rendered += '\n';
  return color ? rendered : stripVTControlCharacters(rendered);
}
