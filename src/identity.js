import { Scene, left } from './scene.js';
import { random } from './random.js';

// Existing artwork keeps its derivation. Substitute the reserved default label
// with a live user and attach the path to the input role, outside art reservations.
export function withIdentity(composition, { glyphs, label, seed }) {
  const { scene } = composition;
  const material = random(seed, 'material:identity');
  const userColor = material.pick([2, 3, 4]);
  const pathColor = material.pick([2, 3, 4].filter((color) => color !== userColor));
  const userInk = material.chance(0.45) ? { fg: 'contrast', bg: userColor } : userColor;
  const pathInk = material.chance(0.65) ? { fg: 'contrast', bg: pathColor } : pathColor;
  const edge = material.pick([['', ''], ['', ''], ['[', ']'], ['◖', '◗'], ['│', '│']]);
  let hasUser = false;
  if (!label) {
    scene.runs = scene.runs.flatMap((run) => {
      if (hasUser || run.kind || run.end || !run.text.includes('username')) return [run];
      const index = run.text.indexOf('username');
      const shift = run.align === 'right' ? 1 - run.text.length : run.align === 'center' ? -Math.floor(run.text.length / 2) : 0;
      const base = run.x.offset + shift;
      const result = [];
      if (index) result.push({ ...run, align: 'left', text: run.text.slice(0, index), x: { ...run.x, offset: base } });
      const slot = new Scene(scene.rows, glyphs).slot(run.row, { ...run.x, offset: base + index }, 'username', 8, userInk).runs[0];
      result.push(slot);
      if (index + 8 < run.text.length) result.push({ ...run, align: 'left', text: run.text.slice(index + 8), x: { ...run.x, offset: base + index + 8 } });
      hasUser = true;
      return result;
    });
  }
  const row = scene.rows - 1;
  let x = composition.cursor;
  if (!hasUser) {
    scene.slot(row, left(x), 'username', 8, userInk);
    x += 8;
    scene.text(row, left(x++), ' ', 0);
  }
  const edgeWidth = edge[0].length;
  const pathWidth = Math.max(6, Math.min(24, 53 - x - 3 - edgeWidth * 2));
  if (edgeWidth) scene.text(row, left(x++), edge[0], pathColor);
  scene.slot(row, left(x), 'directory', pathWidth, pathInk);
  x += pathWidth;
  if (edgeWidth) scene.text(row, left(x++), edge[1], pathColor);
  scene.text(row, left(x), glyphs === 'ascii' ? ' >' : ' ›', 4);
  return { ...composition, cursor: x + 3,
    ...(composition.program ? { program: { ...composition.program, identity: {
      roles: scene.runs.filter((run) => run.kind === 'slot').map(({ role, row, x, width, ink }) => ({ role, row, x, width, ink })),
      marker: { row, x: x + 1, width: 1 },
    } } } : {}),
  };
}

// At narrow widths preserve useful information and the same live-role contract.
// The usable width starts at 27 cells; this leaves a separate input row.
export function compactIdentity(glyphs) {
  const scene = new Scene(2, glyphs);
  scene.slot(0, left(), 'username', 8, 2)
    .text(0, left(8), ' / ', 0)
    .slot(0, left(11), 'directory', 16, 3)
    .text(1, left(), glyphs === 'ascii' ? '>' : '›', 4);
  return { scene, cursor: 2, rightPrompt: '' };
}
