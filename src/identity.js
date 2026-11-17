import { Scene, left } from './scene.js';

// The narrow-width fallback (28–79 columns): live fields above an input row.
// Version 8 lets the path follow the name instead of a fixed column.
export function compactIdentity(glyphs, version = 7) {
  const scene = new Scene(2, glyphs);
  if (version >= 8) {
    scene.live(0, left(), 27, [{ role: 'username', width: 8, ink: 2 }, { text: ' / ', ink: 0 }, { role: 'directory', width: 16, ink: 3 }]);
  } else {
    scene.slot(0, left(), 'username', 8, 2)
      .text(0, left(8), ' / ', 0)
      .slot(0, left(11), 'directory', 16, 3);
  }
  scene.text(1, left(), glyphs === 'ascii' ? '>' : '›', 4);
  return { scene, cursor: 2, rightPrompt: '' };
}
