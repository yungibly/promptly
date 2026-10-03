// Six-role truecolor collections. The first two roles support quiet structure,
// the middle three provide accents, and the last is readable foreground text.
// Colored surfaces paint only their occupied cells, never the terminal itself.
// Keep existing collections unchanged: resolved recipes retain their colors.
export const palettes = {
  phosphor: {
    description: 'Sea glass, ultraviolet, and a radioactive yellow spark',
    colors: ['#536573', '#779197', '#81efc5', '#bf91f3', '#e9ed9a', '#dce8e6'],
  },
  ultraviolet: {
    description: 'Violet wire, ice blue, and electric pink',
    colors: ['#5c536f', '#8c77a5', '#b7a1ff', '#7ee4ef', '#ef98ca', '#e9e0f5'],
  },
  ember: {
    description: 'Oxidized copper with molten amber and rose',
    colors: ['#6d5556', '#9b7570', '#efb779', '#df8d9e', '#b3d4c1', '#f1decc'],
  },
  abyss: {
    description: 'Deep water cyan, bioluminescent green, and pearl',
    colors: ['#3c626e', '#648f9b', '#75dce3', '#9bc9a1', '#ddcdb0', '#daebed'],
  },
  paper: {
    description: 'Warm paper, graphite, brick red, and editorial blue',
    colors: ['#676563', '#a6a19a', '#eee4cd', '#cb6652', '#7794be', '#faf6ed'],
  },
  primary: {
    description: 'Red, blue, and golden yellow with clear white',
    colors: ['#626977', '#929aaa', '#ef414b', '#356ee8', '#f3c83d', '#fbfcff'],
  },
  terracotta: {
    description: 'Clay, dusty olive, and sun-baked cream',
    colors: ['#766354', '#af896e', '#cd7859', '#a6a77b', '#e5b784', '#f3e6cf'],
  },
  botanical: {
    description: 'Forest green, fresh leaf, and marigold',
    colors: ['#536b56', '#84a278', '#3a9369', '#b4cc79', '#ebba51', '#eef1d7'],
  },
  monolith: {
    description: 'Charcoal, concrete, silver, and white',
    colors: ['#666666', '#929292', '#b7b7b7', '#e0e0e0', '#ffffff', '#f2f2f2'],
  },
  candy: {
    description: 'Raspberry, tangerine, and bright periwinkle',
    colors: ['#79566e', '#bc7a9e', '#f05296', '#ffac57', '#8f91f4', '#fff0f6'],
  },
  ochre: {
    description: 'Amber, mustard, and parchment',
    colors: ['#77674d', '#b69a67', '#d69232', '#e2bc63', '#f4d798', '#fff0ce'],
  },
  cobalt: {
    description: 'Cobalt blue, soft silver, and vermilion',
    colors: ['#536785', '#7896b9', '#376be6', '#bccce4', '#ed755c', '#f4f7ff'],
  },
  coral: {
    description: 'Coral red, peach, and gentle warm gray',
    colors: ['#79645f', '#b79787', '#ef775d', '#f0ae90', '#d9c8ac', '#fff1e7'],
  },
  olive: {
    description: 'Olive, khaki, rusty orange, and linen',
    colors: ['#6b6c52', '#a3a17b', '#a3ad60', '#dfbe83', '#cf8557', '#f0edda'],
  },
  sunrise: {
    description: 'Golden yellow, orange, and red on warm ivory',
    colors: ['#826a58', '#b69c7d', '#f0c844', '#f19748', '#df675c', '#fff4d7'],
  },
  plum: {
    description: 'Deep plum, dusty rose, sage, and soft ivory',
    colors: ['#735b70', '#a5819a', '#ae719c', '#dcb0b6', '#a3baa4', '#f3e9ee'],
  },
  velvet: {
    description: 'Deep violet capsules with mint, amber, and pink lettering',
    colors: ['#2a1a4a', '#9d8aad', '#00e5b0', '#e8933a', '#ff6eb4', '#eee9f7'],
  },
};

// Use physical sRGB luminance rather than an RGB average: saturated colors with
// the same average need very different text. Pure black/white guarantees at least
// a 4.58:1 contrast ratio on every opaque surface, independent of terminal theme.
function luminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Invalid truecolor surface: ${hex}`);
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

export function contrastInk(hex, preferred) {
  const background = luminance(hex);
  if (preferred) {
    const foreground = luminance(preferred);
    if ((Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05) >= 4.5) return preferred;
  }
  return (background + 0.05) / 0.05 >= 1.05 / (background + 0.05) ? '#000000' : '#ffffff';
}
