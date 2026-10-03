// An ornament is a tiny expression tree, not a saved decorative string.
// Alphabet and expression structure are independent from network topology.
export const alphabets = {
  geometric: { atoms: [...'·○◇◈⊙⊕△▽'], pairs: [['(', ')'], ['[', ']'], ['⟨', '⟩']], separators: ['·', ' ', ':'] },
  punctuation: { atoms: [...'.:*+=~!?'], pairs: [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>']], separators: ['.', ':', '-'] },
  technical: { atoms: [...'0123456789ABCDEF'], pairs: [['[', ']'], ['(', ')'], ['<', '>']], separators: [':', '/', '-'] },
  granular: { atoms: [...'·░▒▓▁▂▃▄▅▆▇'], pairs: [['[', ']'], ['(', ')']], separators: [' ', '·', ':'] },
  runic: { atoms: [...'ᚠᚢᚦᚨᚱᚲᚷᚹᚾᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'], pairs: [['⟨', '⟩'], ['[', ']']], separators: ['·', ' ', ':'] },
};

const opposite = new Map([['(', ')'], [')', '('], ['[', ']'], [']', '['], ['{', '}'], ['}', '{'], ['<', '>'], ['>', '<'], ['⟨', '⟩'], ['⟩', '⟨'], ['╱', '╲'], ['╲', '╱']]);
export function renderExpression(node) {
  switch (node.op) {
    case 'atom': return node.value;
    case 'sequence': return node.children.map(renderExpression).join(node.separator);
    case 'enclose': return node.pair[0] + renderExpression(node.child) + node.pair[1];
    case 'repeat': return Array(node.count).fill(renderExpression(node.child)).join(node.separator);
    case 'reflect': {
      const first = renderExpression(node.child);
      return first + node.pivot + [...first].reverse().map((c) => opposite.get(c) ?? c).join('');
    }
    default: throw new Error(`Unknown ornament operation: ${node.op}`);
  }
}

export function expression(rng, alphabet, budget, depth = 3) {
  const set = alphabets[alphabet];
  if (budget < 3 || depth < 1 || rng.chance(0.22)) return { op: 'atom', value: rng.pick(set.atoms) };
  const op = rng.pick(['enclose', 'sequence', 'repeat', 'reflect']);
  if (op === 'enclose') return { op, pair: rng.pick(set.pairs), child: expression(rng, alphabet, budget - 2, depth - 1) };
  const separator = rng.pick(set.separators);
  if (op === 'reflect') return { op, pivot: separator, child: expression(rng, alphabet, Math.floor((budget - 1) / 2), depth - 1) };
  const count = budget >= 5 ? rng.int(2, 3) : 2;
  const childBudget = Math.floor((budget - count + 1) / count);
  if (op === 'repeat') return { op, count, separator, child: expression(rng, alphabet, childBudget, depth - 1) };
  return { op, separator, children: Array.from({ length: count }, () => expression(rng, alphabet, childBudget, depth - 1)) };
}

// Connectivity mask: north=1, east=2, south=4, west=8. End caps, corners,
// tees and crosses all emerge from the same four edge bits.
export const materials = {
  rounded: ' ╵╶╰╷│╭├╴╯─┴╮┤┬┼',
  square:  ' ╵╶└╷│┌├╴┘─┴┐┤┬┼',
  double:  ' ║═╚║║╔╠═╝═╩╗╣╦╬',
  heavy:   ' ╹╺┗╻┃┏┣╸┛━┻┓┫┳╋',
  dashed:  ' ╵╶╰╷┆╭├╴╯┄┴╮┤┬┼',
};
