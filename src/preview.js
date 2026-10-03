import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import { compile } from './compile.js';

export function preview(design, { width = 100, color = true, command = '' } = {}) {
  if (!Number.isInteger(width) || width < 10 || width > 1000) throw new Error('Width must be an integer from 10 to 1000.');
  // One renderer: previews exercise the exact exported zsh, including reflow.
  const source = compile(design) + `\nprint -rP -- "$PROMPT"\n`;
  const result = spawnSync('zsh', ['-f'], {
    input: `COLUMNS=${width}\n${source}`,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    timeout: 10000,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
  });
  if (result.error) throw new Error(`Could not run zsh: ${result.error.message}`);
  if (result.status !== 0 || result.stderr) throw new Error(`zsh render failed: ${result.stderr.trim() || result.status}`);
  let rendered = result.stdout.replace(/\n$/, '');
  // Match the native RPROMPT's one-column right margin for a short example input.
  const right = width >= 80 ? design.rightPrompt : '';
  const line = stripVTControlCharacters(rendered.split('\n').at(-1));
  const available = width - 1 - line.length - command.length - [...right].length;
  rendered += command;
  if (right && available > 0) rendered += ' '.repeat(available) + `\x1b[38;2;${hexRgb(design.colors[1])}m${right}\x1b[0m`;
  rendered += '\n';
  return color ? rendered : stripVTControlCharacters(rendered);
}

function hexRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(';');
}
