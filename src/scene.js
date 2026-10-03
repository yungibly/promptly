// Responsive cell-space IR. Coordinates are affine anchors in a row, never
// pixel positions or terminal cursor movements. Later runs overlay earlier ones.
export const anchor = (at, offset = 0) => ({ at, offset });
export const left = (offset = 0) => anchor(0, offset);
export const right = (offset = 0) => anchor(1000, offset);
export const middle = (offset = 0) => anchor(500, offset);

const fallback = new Map();
for (const [chars, replacement] of [
  ['─━═╌╍┄┅┈┉╴╶', '-'], ['│┃║╎╏┆┇┊┋', '|'],
  ['╭┌┏╔╮┐┓╗╰└┗╚╯┘┛╝┬┴├┤┼╪╫╞╡╟╢╤╧', '+'],
  ['╱', '/'], ['╲', '\\'], ['╳', 'X'],
  ['·∙⋅•∘°˙', '.'], ['⋮⁝', ':'], ['⋰', '/'], ['⋱', '\\'],
  ['◇◆◈◊⟐⟡⬡⌬', '*'], ['○◌◎⊙⊚⊕⊗', 'o'],
  ['△▲▵▴', '^'], ['▽▼▿▾', 'v'], ['▷▹▸❯»›', '>'], ['◁◃◂❮«‹', '<'],
  ['⟨〈⟪', '<'], ['⟩〉⟫', '>'], ['⟦⌈⌊', '['], ['⟧⌉⌋', ']'],
  ['≋≈∿', '~'], ['═≡', '='], ['ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ', 'x'],
  ['░▒▓█▁▂▃▄▅▆▇', '#'], ['✦✧✶✳', '*'], ['⌁', '~'], ['⊣⊢', '+'],
]) for (const char of chars) fallback.set(char, replacement);

export const ascii = (text) => [...text].map((c) => c.codePointAt(0) < 127 ? c : fallback.get(c) ?? '*').join('');

export class Scene {
  constructor(rows, glyphs = 'unicode') {
    this.rows = rows;
    this.glyphs = glyphs;
    this.runs = [];
  }
  text(row, x, text, ink = 2, align = 'left', minWidth = 0) {
    this.runs.push({ row, x, text: this.glyphs === 'ascii' ? ascii(text) : text, ink, align, minWidth });
    return this;
  }
  fill(row, x, end, text = '─', ink = 0, minWidth = 0) {
    this.runs.push({ row, x, end, text: this.glyphs === 'ascii' ? ascii(text) : text, ink, minWidth });
    return this;
  }
  // Orthogonal branches have explicit corners, so the route reads as one thing.
  bridge(row, x, end, ink = 0, pattern = '─') {
    return this.fill(row, x, end, pattern, ink);
  }
}
