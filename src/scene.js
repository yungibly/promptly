// Responsive cell-space IR. Coordinates are affine anchors in a row, never
// pixel positions or terminal cursor movements. Later runs overlay earlier ones.
export const anchor = (at, offset = 0) => ({ at, offset });
export const left = (offset = 0) => anchor(0, offset);
export const right = (offset = 0) => anchor(1000, offset);
export const middle = (offset = 0) => anchor(500, offset);

const fallback = new Map();
for (const [chars, replacement] of [
  ['─━═╌╍┄┅┈┉╴╶', '-'], ['│┃║╎╏┆┇┊┋', '|'],
  ['╭┌┏╔╮┐┓╗╰└┗╚╯┘┛╝┬┴├┤┼╪╫╞╡╟╢╤╧╠╣╦╩╬┣┫┳┻╋', '+'],
  ['╵╷╹╻', '|'], ['╺╸', '-'],
  ['╱', '/'], ['╲', '\\'], ['╳', 'X'],
  ['·∙⋅•∘°˙', '.'], ['⋮⁝', ':'], ['⋰', '/'], ['⋱', '\\'],
  ['◇◆◈◊⟐⟡⬡⌬', '*'], ['○◌◎⊙⊚⊕⊗', 'o'],
  ['△▲▵▴', '^'], ['▽▼▿▾', 'v'], ['▷▹▸▶❯»›', '>'], ['◁◃◂◀❮«‹', '<'],
  ['◖', '('], ['◗', ')'], ['▌▐', '|'], ['▀▗▖▝▘', '#'],
  ['⟨〈⟪', '<'], ['⟩〉⟫', '>'], ['⟦⌈⌊', '['], ['⟧⌉⌋', ']'],
  ['≋≈∿', '~'], ['═≡', '='], ['ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ', 'x'],
  ['░▒▓█▁▂▃▄▅▆▇', '#'], ['✦✧✶✳', '*'], ['⌁', '~'], ['⊣⊢', '+'],
]) for (const char of chars) fallback.set(char, replacement);
// Version-8 rasters: braille keeps its approximate density in one cell.
for (let bits = 1; bits < 256; bits++) {
  const dots = bits.toString(2).replaceAll('0', '').length;
  fallback.set(String.fromCodePoint(0x2800 + bits), dots <= 2 ? '.' : dots <= 5 ? ':' : '#');
}

export const ascii = (text) => [...text].map((c) => c.codePointAt(0) < 127 ? c : fallback.get(c) ?? '*').join('');
const glyphText = (text, mode) => mode === 'ascii' ? ascii(text) : mode === 'powerline'
  ? text.replaceAll('◖', '\ue0b6').replaceAll('◗', '\ue0b4').replaceAll('◀', '\ue0b2').replaceAll('▶', '\ue0b0') : text;

function checkRole(role, width) {
  if (!['username', 'directory'].includes(role)) throw new Error(`Unknown live role: ${role}`);
  if (!Number.isInteger(width) || width < 2 || width > 64) throw new Error('Live role width must be 2–64 cells.');
  return true;
}
// Reservations count one cell per glyph, so reject controls, marks, emoji,
// and East Asian wide or fullwidth characters in decoration.
const multiCell = /[\p{Cc}\p{Cf}\p{Cs}\p{Cn}\p{M}\p{Emoji_Presentation}\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\ua960-\ua97f\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6\u{1f300}-\u{1f64f}\u{1f900}-\u{1f9ff}\u{20000}-\u{3fffd}]/u;
function checkGlyphs(text, limit) {
  if (typeof text !== 'string' || !text.length || [...text].length > limit || multiCell.test(text)) throw new Error(`Live run glyphs must be 1–${limit} single-cell characters.`);
  return text;
}

export class Scene {
  constructor(rows, glyphs = 'unicode') {
    this.rows = rows;
    this.glyphs = glyphs;
    this.runs = [];
  }
  text(row, x, text, ink = 2, align = 'left', minWidth = 0) {
    this.runs.push({ row, x, text: glyphText(text, this.glyphs), ink, align, minWidth });
    return this;
  }
  // Live roles have a fixed cell reservation. The compiler emits only native
  // zsh prompt escapes, keeping user/path data out of shell expression source.
  // With `options`, decoration hugs the value: `suffix` glyphs follow its last
  // cell (truncation leaves room for them) and `pad` fills the rest of the
  // reservation, so the gap lies outside a bracket or becomes a leader line.
  slot(row, x, role, width, ink = 2, options) {
    if (!options) {
      checkRole(role, width);
      this.runs.push({ kind: 'slot', row, x, role, width, text: ' '.repeat(width), ink, align: 'left', minWidth: 0 });
      return this;
    }
    const suffix = options.suffix ? [{ text: options.suffix, ink: options.suffixInk ?? ink }] : [];
    const live = width - suffix.reduce((n, part) => n + [...glyphText(part.text, this.glyphs)].length, 0);
    return this.live(row, x, width, [{ role, width: live, ink }, ...suffix], { text: options.pad ?? ' ', ink: options.padInk ?? 0 });
  }
  // A compound live run. Literal glyphs and live values flow in order, each
  // value truncated to its own width; `pad` then fills to the fixed end of the
  // reservation. Pad patterns stay phase-aligned to the run's first column.
  live(row, x, width, parts, pad = {}) {
    if (!Number.isInteger(width) || width < 2 || width > 96) throw new Error('Live run width must be 2–96 cells.');
    const checked = parts.map((part) => {
      if (part.role) return checkRole(part.role, part.width) && { role: part.role, width: part.width, ink: part.ink ?? 2 };
      return { text: checkGlyphs(glyphText(part.text, this.glyphs), 24), ink: part.ink ?? 2 };
    });
    const first = checked.find((part) => part.role);
    if (!first) throw new Error('A live run needs a username or directory part.');
    if (checked.reduce((n, part) => n + (part.width ?? [...part.text].length), 0) > width) throw new Error('Live run parts exceed their reservation.');
    // A pad is a short repeating pattern, or a texture strip as long as the
    // reservation with one ink per glyph, revealed wherever the text ends.
    const fill = { text: checkGlyphs(glyphText(pad.text ?? ' ', this.glyphs), 96), ink: pad.ink ?? 0 };
    if (Array.isArray(fill.ink) && fill.ink.length !== [...fill.text].length) throw new Error('A textured pad needs one ink per glyph.');
    this.runs.push({ kind: 'slot', row, x, role: first.role, width, text: ' '.repeat(width), ink: first.ink, align: 'left', minWidth: 0, parts: checked, pad: fill });
    return this;
  }
  fill(row, x, end, text = '─', ink = 0, minWidth = 0) {
    this.runs.push({ row, x, end, text: glyphText(text, this.glyphs), ink, minWidth });
    return this;
  }
  wire(from, to, ink, charset) {
    this.runs.push({ kind: 'wire', from, to, ink, charset: this.glyphs === 'ascii' ? ascii(charset) : charset });
    return this;
  }
  // Orthogonal branches have explicit corners, so the route reads as one thing.
  bridge(row, x, end, ink = 0, pattern = '─') {
    return this.fill(row, x, end, pattern, ink);
  }
}
