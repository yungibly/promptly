import { readFileSync } from 'node:fs';
import { recipe } from './design.js';

export const quoteZsh = (text) => `'${String(text).replaceAll("'", "'\\''")}'`;
const position = ({ at, offset }) => `(${at} * (_pp_w - 1) / 1000 + (${offset}))`;

function compileScene({ scene, cursor, rightPrompt }) {
  const lines = [`_pp_height=${scene.rows}`, `_pp_cursor=${cursor}`, `_pp_right=${quoteZsh(rightPrompt)}`];
  for (const run of scene.runs) {
    if (run.kind === 'wire') {
      lines.push(`_promptly_wire ${run.from.row} "$(( ${position(run.from.x)} ))" ${run.to.row} "$(( ${position(run.to.x)} ))" ${run.ink} ${quoteZsh(run.charset)}`);
      continue;
    }
    const length = [...run.text].length;
    let x = position(run.x);
    if (run.align === 'right') x += ` - ${length - 1}`;
    if (run.align === 'center') x += ` - ${Math.floor(length / 2)}`;
    const count = run.end ? `${position(run.end)} - ${position(run.x)}` : length;
    const paint = `_promptly_paint ${run.row} "$(( ${x} ))" "$(( ${count} ))" ${run.ink} ${quoteZsh(run.text)}`;
    lines.push(run.minWidth ? `if (( _pp_w >= ${run.minWidth} )); then ${paint}; fi` : paint);
  }
  return lines.join('\n    ');
}

export function compile(design) {
  const runtime = readFileSync(new URL('./runtime.zsh', import.meta.url), 'utf8');
  return runtime
    .replace('@@RECIPE@@', () => JSON.stringify(recipe(design)))
    .replace('@@COLORS@@', () => design.colors.map(quoteZsh).join(' '))
    .replace('@@RIGHT@@', () => quoteZsh(`%F{${design.colors[1]}}${design.rightPrompt}%f`))
    .replace('@@FULL@@', () => compileScene(design))
    .replace('@@COMPACT@@', () => compileScene(design.compact));
}
