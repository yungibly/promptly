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

export const ascii = (text) => [...text].map((c) => c.codePointAt(0) < 127 ? c : fallback.get(c) ?? '*').join('');
const glyphText = (text, mode) => mode === 'ascii' ? ascii(text) : mode === 'powerline'
  ? text.replaceAll('◖', '\ue0b6').replaceAll('◗', '\ue0b4').replaceAll('◀', '\ue0b2').replaceAll('▶', '\ue0b0') : text;

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
  slot(row, x, role, width, ink = 2) {
    if (!['username', 'directory'].includes(role)) throw new Error(`Unknown live role: ${role}`);
    if (!Number.isInteger(width) || width < 2 || width > 64) throw new Error('Live role width must be 2–64 cells.');
    this.runs.push({ kind: 'slot', row, x, role, width, text: ' '.repeat(width), ink, align: 'left', minWidth: 0 });
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
