import { readFileSync } from 'node:fs';
import { recipe } from './design.js';
import { flatten, distance, coordinate, spanLiteral, spanKey } from './flatten.js';
import { contrastInk } from './palettes.js';

export const quoteZsh = (text) => `'${String(text).replaceAll("'", "'\\''")}'`;
const promptText = (text) => text.replaceAll('%', '%%');
const expansionText = (text) => promptText(text).replace(/[\\$`]/g, '\\$&');

export function compile(design) {
  const runtime = typeof __PROMPTLY_RUNTIME__ === 'string' ? __PROMPTLY_RUNTIME__ : readFileSync(new URL('./runtime.zsh', import.meta.url), 'utf8');
  const constants = new Map(), frames = [], variants = [], cache = new Map();
  const constant = (text) => {
    if (!constants.has(text)) constants.set(text, `_promptly_text${constants.size + 1}`);
    return constants.get(text);
  };
  function spanExpression(span) {
    if (span.role) {
      const width = span.to.offset - span.from.offset;
      if (span.from.at !== span.to.at || span.from.at !== span.origin.at || span.from.offset !== span.origin.offset || width !== span.text.length) {
        throw new Error('Live role reservation was clipped or overpainted.');
      }
      const code = span.role === 'username' ? '%n' : '%~';
      // Native truncation counts terminal cells (including wide characters).
      // Unroll padding conditions in the CLI; there is no prompt-time loop.
      const padding = Array.from({ length: width }, (_, i) => {
        const end = { ...span.from, offset: span.from.offset + i + 1 };
        const column = end.at ? '$(( ' + coordinate(end) + ' ))' : end.offset;
        return `%${column}(l.. )`;
      }).join('');
      return `%${width}<..<${code}%<<${padding}`;
    }
    const literal = spanLiteral(span);
    if (literal !== null) return expansionText(literal);
    const length = distance(span.to, span.from);
    let expression;
    if ([...span.text].length === 1 && !/[\\$`:%]/.test(span.text)) {
      expression = '${(l:' + length + '::' + span.text + ':)}';
    } else {
      const name = constant(span.text), size = [...span.text].length;
      const phase = size === 1 ? '0' : `((${distance(span.from, span.origin)})%${size}+${size})%${size}`;
      expression = '${(pr:(' + length + ')+(' + phase + ')::$' + name + ':)}';
      if (size > 1) expression = '${' + expression + ':(' + phase + '):(' + length + ')}';
      if (span.text.includes('%')) expression = '${' + expression + '//\\%/%%}';
    }
    return expression;
  }
  function frame(composition, width) {
    const rows = flatten(composition, width);
    const signature = rows.map((row) => row.map(spanKey).join('|')).join('\n');
    if (cache.has(signature)) return cache.get(signature);
    const result = rows.map((row) => {
      let ink = -1, background = null;
      return row.map((span) => {
        let color = '';
        const style = typeof span.ink === 'object' ? span.ink : { fg: span.ink, bg: null };
        const bg = style.bg == null ? null : design.colors[style.bg];
        const preferred = style.fg === 'contrast' ? undefined : design.colors[style.fg ?? 2];
        const fg = bg ? contrastInk(bg, preferred) : preferred ?? contrastInk('#000000');
        if (bg !== background) {
          color += bg ? `%K{${bg}}` : '%k';
          background = bg;
        }
        if ((span.role || /[^ ]/.test(span.text) || bg) && fg !== ink) {
          color += `%F{${fg}}`;
          ink = fg;
        }
        return color + spanExpression(span);
      }).join('') + '%f%b%k';
    }).join('\n');
    cache.set(signature, result);
    return result;
  }
  // Resolve each supported cell width during generation. Adjacent widths usually
  // share one string plan; only overlay/topology changes add another case.
  for (let width = 1; width <= 1000; width++) {
    const text = width < 27 ? `%F{${design.colors[4]}}>${width > 1 ? ' ' : ''}%f%b%k`
      : frame(width < 79 ? design.compact : design, width);
    let index = frames.indexOf(text);
    if (index < 0) { index = frames.length; frames.push(text); }
    const previous = variants.at(-1);
    if (previous?.index === index) previous.end = width;
    else variants.push({ end: width, index });
  }
  // Width-relative occlusion can create many transitions. A balanced arithmetic
  // decision tree avoids zsh's recursion limit while preserving native expansion.
  // Older recipes retain their exact exported source.
  const choose = (lo, hi) => {
    if (lo === hi) return String(variants[lo].index + 1);
    const mid = Math.floor((lo + hi) / 2);
    return `(_promptly_w<=${variants[mid].end}?${choose(lo, mid)}:${choose(mid + 1, hi)})`;
  };
  const selection = design.version >= 7 ? choose(0, variants.length - 1)
    : variants.map(({ end, index }, i) => i === variants.length - 1 ? `${index + 1}` : `_promptly_w<=${end}?${index + 1}:`).join('');
  // Width-specific junction changes often affect just one row. Share the other
  // rows only when doing so actually makes the export smaller.
  const counts = new Map();
  for (const text of frames) for (const row of text.split('\n')) counts.set(row, (counts.get(row) ?? 0) + 1);
  const shared = [...counts].filter(([row, count]) => row.length * (count - 1) > count * 28 + 32).map(([row]) => row);
  const factored = frames.map((text) => text.split('\n').map((row) => {
    const index = shared.indexOf(row);
    return index < 0 ? row : '${(e)_promptly_rows[' + (index + 1) + ']}';
  }).join('\n'));
  const dynamic = factored.some((text) => text.includes('${'));
  // (e) expands only compiler-authored expressions. Literal text is escaped for
  // that one expansion; color and percent escapes are interpreted by zsh itself.
  const prompt = '${' + (dynamic ? '(e)' : '') + '_promptly_frames[$((_promptly_w=(${COLUMNS:-80}<2?1:${COLUMNS:-80}>1001?1000:${COLUMNS:-80}-1),' + selection + '))]}';
  const chosen = dynamic ? factored : factored.map((text) => text.replace(/\\([\\$`])/g, '$1'));
  return runtime
    .replace('@@RECIPE@@', () => JSON.stringify(recipe(design)))
    .replace('@@TEXTS@@', () => [...constants].map(([text, name]) => `typeset -g ${name}=${quoteZsh(text)}`).join('\n'))
    .replace('@@ROWS@@', () => shared.length ? `typeset -ga _promptly_rows=(\n  ${shared.map(quoteZsh).join('\n  ')}\n)\n` : '')
    .replace('@@FRAMES@@', () => chosen.map(quoteZsh).join('\n  '))
    .replace('@@PROMPT@@', () => quoteZsh(prompt))
    .replace('@@RIGHT@@', () => quoteZsh(design.rightPrompt ? `%F{${design.colors[1]}}${promptText(design.rightPrompt)}%f` : ''))
    .replace('@@PS2@@', () => quoteZsh(`%F{${design.colors[1]}}... %f`));
}
