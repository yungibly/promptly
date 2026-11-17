import { Scene, left as l, right as r } from './scene.js';
import { compose } from './compose.js';
import { assemble } from './assembly.js';
import { composeRelations } from './relations.js';
import { composeRelationsV7 } from './relations-v7.js';
import { engines } from './engines.js';

// Builders for engines that do not use the shared compact role composer.
export const builders = { network: compose, assembly: assemble };

// Compact engines share the role composer; larger engines build their own art.
export function build(config) {
  if (engines[config.engine].compact) return (config.evolved ? composeRelationsV7 : composeRelations)(config);
  return builders[config.engine](config);
}

export function compact({ glyphs, label, sigil }) {
  const s = new Scene(2, glyphs);
  s.text(0, l(), `╭─ ${label}`, 2)
    .fill(0, l(label.length + 5), r(-5), '·', 0)
    .text(0, r(), `⟨${sigil}⟩`, 3, 'right')
    .text(1, l(), '╰─', 1).text(1, l(3), sigil, 4);
  return { scene: s, cursor: 5, rightPrompt: '' };
}
