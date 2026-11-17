import test from 'node:test';
import assert from 'node:assert/strict';
import { random } from '../src/random.js';
import { generateColors } from '../src/chromatic.js';
import { palette } from '../src/systems/raster.js';
import { texture, textureKinds, rhythm, rhythmKinds } from '../src/systems/texture.js';
import { emit, fixed } from '../src/systems/raster.js';
import { createDesign } from '../src/design.js';
import { preview } from '../src/preview.js';
import { Scene, left } from '../src/scene.js';

const colors = (seed) => palette(generateColors(seed).colors, random(seed, 'material:test'));
const HEX = /^#[0-9a-f]{6}$/;
const occupancy = (cells) => cells.map((line) => line.map((cell) => cell ? 1 : 0).join('')).join('\n');

test('every texture fills its grid with one-cell glyphs and palette inks', () => {
  for (const kind of textureKinds) for (const width of [6, 13, 40]) for (const rows of [1, 2]) for (let i = 0; i < 4; i++) {
    const options = { width, rows, colors: colors(`texture/${i}`), anchor: i % 2 ? Math.floor(width / 3) : undefined };
    const cells = texture(kind, random(`texture/${kind}/${width}/${rows}/${i}`, 'texture'), options);
    assert.equal(cells.length, rows, kind);
    assert.ok(cells.every((line) => line.length === width), kind);
    const painted = cells.flat().filter(Boolean);
    assert.ok(painted.length > 0, `${kind} ${width}x${rows}: empty`);
    for (const cell of painted) {
      assert.equal([...cell.ch].length, 1, `${kind}: ${cell.ch}`);
      assert.match(cell.ch, /^[ -~·∙─-▟⠀-⣿]$/u, `${kind}: ${cell.ch}`);
      assert.ok(cell.fg === undefined || HEX.test(cell.fg), `${kind}: ${cell.fg}`);
      assert.ok(cell.bg === undefined || HEX.test(cell.bg), `${kind}: ${cell.bg}`);
      assert.ok(cell.fg || cell.bg, kind);
    }
  }
});

test('narrow textures are never empty, and anchored beds peak at the anchor', () => {
  for (const kind of textureKinds) for (const width of [1, 2, 6]) for (const rows of [1, 2]) for (let i = 0; i < 200; i++) {
    const cells = texture(kind, random(String(i), 'texture'), { width, rows, colors: colors('narrow') });
    assert.ok(cells.flat().some(Boolean), `${kind} ${width}x${rows} seed ${i}: empty`);
  }
  const lightness = (hex) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
  for (let i = 0; i < 40; i++) {
    const bed = texture('gradient', random(String(i), 'texture'), { width: 20, rows: 1, colors: colors(`bed/${i}`), anchor: 0 });
    assert.ok(lightness(bed[0][0].bg) >= lightness(bed[0][19].bg), `seed ${i}: bed brightens away from its anchor`);
  }
});

test('detail changes each texture without changing its footprint', () => {
  for (const kind of textureKinds) {
    const make = (detail) => texture(kind, random(`detail/${kind}`, 'texture'), { width: 30, rows: 2, colors: colors('detail'), detail });
    const low = make(0), high = make(1);
    assert.equal(low.length, high.length); assert.ok(low.every((line, y) => line.length === high[y].length));
    assert.notDeepEqual(low, high, `${kind}: detail had no effect`);
  }
  assert.throws(() => texture('maze', random('x'), { width: 4, colors: colors('x'), detail: 2 }), /detail/);
});

test('textures are deterministic, and ASCII keeps the exact occupied cells', () => {
  for (const kind of textureKinds) for (const rows of [1, 2]) {
    const options = { width: 24, rows, colors: colors('ascii'), anchor: 5, fade: 'both' };
    const make = (ascii) => texture(kind, random(`same/${kind}/${rows}`, 'texture'), { ...options, ascii });
    assert.deepEqual(make(false), make(false), kind);
    const unicode = make(false), ascii = make(true);
    assert.equal(occupancy(ascii), occupancy(unicode), `${kind}: ASCII moved a cell`);
    for (const cell of ascii.flat().filter(Boolean)) assert.match(cell.ch, /^[\x20-\x7e]$/, `${kind}: ${cell.ch}`);
  }
});

test('fades dissolve toward their edge and never add cells', () => {
  for (const kind of textureKinds) {
    const make = (fade) => texture(kind, random(`fade/${kind}`, 'texture'), { width: 30, rows: 2, colors: colors('fade'), fade });
    const full = make('none'), right = make('right'), left = make('left');
    const count = (cells, from, to) => cells.flat().filter((cell, i) => cell && i % 30 >= from && i % 30 < to).length;
    for (const faded of [right, left]) faded.flat().forEach((cell, i) => assert.ok(!cell || full.flat()[i], kind));
    assert.ok(count(right, 25, 30) <= count(full, 25, 30) && count(left, 0, 5) <= count(full, 0, 5), kind);
    if (count(full, 27, 30) >= 4) assert.ok(count(right, 27, 30) < count(full, 27, 30), `${kind}: right fade kept its edge`);
  }
  assert.throws(() => texture('nonsense', random('x'), { width: 4, colors: colors('x') }), /Unknown texture/);
});

test('rhythms are short repeatable patterns with an ASCII twin', () => {
  for (const kind of rhythmKinds) {
    const unicode = rhythm(kind, random(`rhythm/${kind}`), { colors: colors('rhythm') });
    const ascii = rhythm(kind, random(`rhythm/${kind}`), { colors: colors('rhythm'), ascii: true });
    for (const { text } of [unicode, ascii]) assert.ok([...text].length >= 1 && [...text].length <= 8, kind);
    assert.equal([...ascii.text].length, [...unicode.text].length, kind);
    assert.match(ascii.text, /^[\x20-\x7e]+$/);
    assert.match(unicode.ink, HEX);
    assert.equal(unicode.ink, ascii.ink);
  }
});

test('textures and rhythms compile into the exported prompt and render literally in zsh', () => {
  for (const glyphs of ['unicode', 'ascii']) {
    const base = createDesign({ seed: 'texture-render', engine: 'prompt', glyphs });
    const scene = new Scene(3, glyphs), shades = colors('render'), ascii = glyphs === 'ascii';
    textureKinds.forEach((kind, i) => emit(scene, texture(kind, random(kind), { width: 12, rows: 2, colors: shades, ascii }), fixed(0, i * 13)));
    const patterns = rhythmKinds.map((kind, i) => {
      const { text, ink } = rhythm(kind, random(kind), { colors: shades, ascii });
      scene.fill(2, left(i * 10), left(i * 10 + 8), text, ink);
      return text;
    });
    scene.text(2, left(90), '>', 4);
    const plain = preview({ ...base, scene, cursor: 92, rightPrompt: '' }, { width: 120, color: false }).split('\n');
    assert.equal(plain.length, 4);
    patterns.forEach((text, i) => assert.equal([...plain[2]].slice(i * 10, i * 10 + 8).join(''), [...text.repeat(8)].slice(0, 8).join(''), `${glyphs}: ${text}`));
  }
});
