import { Scene, left } from './scene.js';

export function compactIdentity(glyphs) {
  const scene = new Scene(2, glyphs);
  scene.slot(0, left(), 'username', 8, 2)
    .text(0, left(8), ' / ', 0)
    .slot(0, left(11), 'directory', 16, 3)
    .text(1, left(), glyphs === 'ascii' ? '>' : '›', 4);
  return { scene, cursor: 2, rightPrompt: '' };
}
