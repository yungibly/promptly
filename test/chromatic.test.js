import test from 'node:test';
import assert from 'node:assert/strict';
import { generateColors, oklchToHex, contrastRatio, DARK_REFERENCE } from '../src/chromatic.js';

test('OKLCH conversion matches independent sRGB primaries and preserves neutral endpoints', () => {
  assert.equal(oklchToHex(0, 0, 0), '#000000');
  assert.equal(oklchToHex(1, 0, 0), '#ffffff');
  assert.equal(oklchToHex(0.627955, 0.257683, 29.233885), '#ff0000');
  assert.equal(oklchToHex(0.866440, 0.294827, 142.495339), '#00ff00');
  assert.equal(oklchToHex(0.452014, 0.313214, 264.052021), '#0000ff');
  assert.equal(contrastRatio('#ffffff', '#000000'), 21);
  assert.equal(contrastRatio('#fafafa', '#fafafa'), 1);
  assert.equal(oklchToHex(0.6, 1e300, 35), oklchToHex(0.6, 1, 35));
  assert.throws(() => oklchToHex(-0.1, 0.2, 30), /OKLCH/);
});

test('generated color programs are deterministic, serializable, and independent of other streams', () => {
  const before = generateColors('continuous');
  generateColors('unrelated');
  assert.deepEqual(generateColors('continuous'), before);
  assert.deepEqual(JSON.parse(JSON.stringify(before)), before);
  assert.notDeepEqual(generateColors('continuous/2').colors, before.colors);
  assert.equal(before.colors.length, 7);
  assert.equal(before.colorProgram.surfaceIndex, 6);
  for (const role of before.colorProgram.roles) assert.equal(oklchToHex(role.lightness, role.chroma, role.hue), role.hex);
  for (const invalid of ['', null, 1, 'x'.repeat(257)]) assert.throws(() => generateColors(invalid), /Color seed/);
});

test('continuous colors cover hue and saturation ranges while retaining contrast and gamut', () => {
  const hueBands = new Set(), palettes = new Set();
  let close = 0, separated = 0, restrained = 0, saturated = 0, gamutReduced = 0;
  for (let i = 0; i < 384; i++) {
    const { colors, colorProgram: program } = generateColors(`color-space/${i}`);
    assert.ok(colors.every((color) => /^#[0-9a-f]{6}$/.test(color)));
    palettes.add(colors.join());
    hueBands.add(Math.floor(program.baseHue / 30));
    close += program.hueSpread < 15;
    separated += program.hueSpread > 140;
    restrained += program.chroma < 0.035;
    saturated += program.chroma > 0.15;
    gamutReduced += program.roles.slice(2, 5).some((role) => role.chroma < program.chroma * 0.69);
    for (const background of [DARK_REFERENCE, colors[6]]) {
      assert.ok(contrastRatio(colors[0], background) >= 2.4);
      assert.ok(contrastRatio(colors[1], background) >= 3);
      for (const foreground of colors.slice(2, 6)) assert.ok(contrastRatio(foreground, background) >= 4.5);
      assert.ok(contrastRatio(colors[5], background) >= 7);
    }
    for (const role of program.roles) {
      assert.ok(role.lightness >= 0 && role.lightness <= 1 && role.chroma >= 0);
      assert.equal(oklchToHex(role.lightness, role.chroma, role.hue), role.hex);
    }
  }
  assert.equal(palettes.size, 384);
  assert.equal(hueBands.size, 12);
  assert.ok(close > 25 && separated > 50, `close ${close}, separated ${separated}`);
  assert.ok(restrained > 40 && saturated > 50, `restrained ${restrained}, saturated ${saturated}`);
  assert.ok(gamutReduced > 20, 'exercise chroma reduction instead of RGB channel clipping');
});
