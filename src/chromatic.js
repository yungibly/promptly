import { random } from './random.js';

// These relationships are sampled continuously, not selected from palette names.
// sRGB matrices: https://bottosson.github.io/posts/oklab/ (public-domain reference).
// Contrast: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
export const DARK_REFERENCE = '#242733';
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round = (n) => Math.round(n * 1e6) / 1e6;
const hue = (n) => round((n % 360 + 360) % 360);

function linearRGB(lightness, chroma, angle) {
  const radians = angle * Math.PI / 180;
  const a = chroma * Math.cos(radians), b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const inGamut = (channels) => channels.every((n) => n >= -1e-7 && n <= 1 + 1e-7);
const encode = (channels) => '#' + channels.map((n) => {
  const linear = clamp(n, 0, 1);
  const srgb = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.round(srgb * 255).toString(16).padStart(2, '0');
}).join('');

function mappedColor(lightness, chroma, angle) {
  if (![lightness, chroma, angle].every(Number.isFinite) || lightness < 0 || lightness > 1 || chroma < 0) {
    throw new Error('OKLCH requires finite lightness 0–1, nonnegative chroma, and hue.');
  }
  lightness = round(lightness); angle = hue(angle); chroma = round(chroma);
  // Reduce chroma on the same hue/lightness ray. Independent RGB clipping would
  // change the relationship we sampled and make saturated colors bunch together.
  if (!inGamut(linearRGB(lightness, chroma, angle))) {
    let lo = 0, hi = Math.min(chroma, 1);
    for (let i = 0; i < 24; i++) {
      const middle = (lo + hi) / 2;
      if (inGamut(linearRGB(lightness, middle, angle))) lo = middle;
      else hi = middle;
    }
    chroma = Math.floor(lo * 1e6) / 1e6;
  }
  return { lightness, chroma, hue: angle, hex: encode(linearRGB(lightness, chroma, angle)) };
}

// Useful to other generation-time material operators; never emitted to zsh.
export const oklchToHex = (lightness, chroma, angle) => mappedColor(lightness, chroma, angle).hex;

function luminance(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('Expected a six-digit sRGB color.');
  const channels = [1, 3, 5].map((offset) => {
    const n = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function readableColor(lightness, chroma, angle, backgrounds, minimum) {
  let color = mappedColor(lightness, chroma, angle);
  // Test the quantized sRGB result, not an approximate OKLCH lightness. Only
  // lightness moves for readability; chroma reduction remains the gamut mapper's
  // responsibility. Bounded CLI work, independent of text/geometry generation.
  while (backgrounds.some((background) => contrastRatio(color.hex, background) < minimum)) {
    if (color.lightness >= 1) throw new Error('No readable foreground exists for the specified backgrounds.');
    color = mappedColor(Math.min(1, color.lightness + 0.002), chroma, angle);
  }
  return color;
}

export function generateColors(colorSeed) {
  if (typeof colorSeed !== 'string' || !colorSeed.length || colorSeed.length > 256) throw new Error('Color seed must contain 1–256 characters.');
  const relationships = random(colorSeed, 'color:relationships');
  const values = random(colorSeed, 'color:lightness');
  const chromas = random(colorSeed, 'color:chroma');
  const baseHue = hue(relationships.next() * 360);
  const hueSpread = round(relationships.next() ** 1.6 * 220);
  const balance = round(relationships.next() - 0.4);
  const chroma = round(0.005 + chromas.next() ** 1.3 * 0.21);
  const lightness = round(0.64 + values.next() * 0.17);
  const lightnessSpread = round(0.02 + values.next() * 0.13);
  const surface = mappedColor(0.18 + values.next() * 0.11, 0.004 + chroma * 0.24, baseHue + hueSpread * balance);
  const backgrounds = [DARK_REFERENCE, surface.hex];
  const roles = [
    { role: 'quiet', ...readableColor(0.49 + values.next() * 0.1, chroma * 0.24, baseHue, backgrounds, 2.4) },
    { role: 'line', ...readableColor(0.57 + values.next() * 0.1, chroma * 0.4, baseHue + hueSpread * balance, backgrounds, 3) },
  ];
  for (const [index, angle] of [baseHue, baseHue + hueSpread, baseHue + hueSpread * balance].entries()) {
    roles.push({ role: `accent${index + 1}`, ...readableColor(
      clamp(lightness + (values.next() - 0.5) * lightnessSpread, 0.58, 0.91),
      chroma * (0.7 + chromas.next() * 0.5), angle, backgrounds, 4.5,
    ) });
  }
  roles.push({ role: 'text', ...readableColor(0.89 + values.next() * 0.07, chroma * 0.1, baseHue, backgrounds, 7) });
  roles.push({ role: 'surface', ...surface });
  return {
    colors: roles.map(({ hex }) => hex),
    colorProgram: {
      generator: 'chromatic-relationships/1', space: 'oklch',
      baseHue, hueSpread, balance, chroma, lightness, lightnessSpread,
      referenceBackground: DARK_REFERENCE, surfaceIndex: 6, roles,
    },
  };
}
