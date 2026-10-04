// New medium operators are reviewed as native prompts and actual terminal PNGs.
import { writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { createDesign } from '../src/design.js';
import { compile, quoteZsh } from '../src/compile.js';
import { preview } from '../src/preview.js';

export function testV7({ tui, state, check, eventually, snapshot, output, cells }) {
  const normalize = (text) => text.split('\n').map((line) => line.trimEnd()).join('\n').trimEnd();
  const submit = (command) => { tui('submit', command); tui('wait', 'idle'); };
  const features = [
    ...[11, 3, 15, 17].map((i) => createDesign({ seed: `shapes-v7/${i}`, engine: 'surface', height: 2, complexity: 8, weight: 0.9, glyphs: 'powerline' })),
    ...[8, 343, 2].map((i) => createDesign({ seed: `art-v7/${i}`, engine: 'assembly', height: 5, complexity: 8, weight: 0.8, glyphs: 'powerline', ...(i === 343 ? { connectivity: 1 } : {}) })),
    ...[4, 1, 2].map((i) => createDesign({ seed: `art-v7/${i}`, engine: 'network', height: 6, complexity: 8, weight: 0.8, glyphs: 'powerline' })),
  ];
  tui('resize', '120', '28');
  for (const [index, design] of features.entries()) {
    const file = `${output}/v7-feature-${index + 1}.zsh`;
    writeFileSync(file, compile(design));
    submit(`source ${quoteZsh(file)}; clear`);
    check(design.version === 7, `${design.seed}: feature recipe is stale`);
    eventually(() => normalize(state().text) === normalize(preview(design, { width: 120, color: false })), `${design.seed}: v7 source differs from preview`);
    check(state().cursor.x === design.cursor && state().cursor.y === design.scene.rows - 1, `${design.seed}: v7 cursor drifted`);
    check(state().text.includes(userInfo().username) && state().text.includes('promptly'), `${design.seed}: shared medium obscured live fields`);
    tui('type', 'echo shape'); tui('wait', 'idle');
    check(state().cursor.x === design.cursor + 10, `${design.seed}: shared medium moved input`);
    const background = state().colors.background;
    check(cells(design.cursor, design.scene.rows - 1, 10).every((cell) => cell.bg === 'default' || cell.bg === background), `${design.seed}: material entered command buffer`);
    tui('key', 'press', 'Ctrl+C'); tui('wait', 'idle');
  }
  submit('promptly_off; clear');
  const gray = ['#707070', '#969696', '#eeeeee', '#bbbbbb', '#d8d8d8', '#ffffff', '#303030'];
  // Two fixed six-seed runs from the original 24-seed review, without ranking or
  // rejecting specimens. Grayscale reveals shape independent of color variety.
  const consecutive = [...Array(6).keys(), ...Array.from({ length: 6 }, (_, i) => i + 12)].map((i) => createDesign({ seed: `v7-contact/${i}` }));
  const sheets = [
    { name: 'v7-consecutive-1', title: 'Unselected consecutive seeds 1-6', entries: consecutive.slice(0, 6) },
    { name: 'v7-consecutive-3-normalized', title: 'Unselected consecutive seeds 13-18', entries: consecutive.slice(6), normalized: true },
    { name: 'v7-features-1', title: 'Horizontal asymmetric caps, cutouts and layered material', entries: features.slice(0, 4) },
    { name: 'v7-features-2', title: 'Shared-medium art: assembly and connected network', entries: features.slice(4) },
  ];
  for (const { name, title, entries, normalized } of sheets) {
    const lines = ['  P R O M P T L Y / v7', `  ${title} / ${normalized ? 'fixed grayscale' : 'natural colors'}`, ''];
    for (const design of entries) {
      lines.push(`  ${design.seed} / ${design.engine} / complexity ${design.complexity} / ${design.scene.rows} rows / ${design.program.interactions?.mode ?? 'roles'}`, '', preview(normalized ? { ...design, colors: gray } : design, { width: 120 }).trimEnd(), '');
    }
    const text = lines.join('\n') + '\n', file = `${output}/${name}.ansi`;
    writeFileSync(file, text);
    tui('resize', '120', String(text.split('\n').length + 6));
    submit(`clear; cat ${quoteZsh(file)}`);
    eventually(() => entries.every((design) => state().text.includes(design.seed)) && state().text.trimEnd().endsWith('before>'), `${name}: incomplete contact sheet`);
    tui('resize', '120', String(Math.max(24, state().cursor.y + 3))); tui('wait', 'idle');
    snapshot(name);
  }
  console.log('PASS v7 asymmetric caps, motif layers, shared-medium attachment/occlusion, live fields and uncurated visual sheets');
  return { features: features.map((design) => ({ seed: design.seed, engine: design.engine, interaction: design.program.interactions?.mode })), consecutive: consecutive.map((design) => design.seed) };
}
