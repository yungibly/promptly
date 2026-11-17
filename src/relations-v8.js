import { Scene, anchor, left } from './scene.js';
import { random } from './random.js';
import { materials, alphabets } from './ornaments.js';
import { rolePorts, roleMasks } from './interactions.js';
import { deriveMotif, evolveMotif } from './motifs.js';

// Version 8 compact composition. Live values hug their decoration, so the
// composer arranges text clusters rather than fixed-width fields: values flow
// together or stand apart, lines stack or hang from each other, and command
// entry follows the text or starts below it. Each cluster reserves room for
// any treatment it may receive; unused cells become pad at its end, so weight
// and ornament never move a field, a later cluster, or the input anchor.
const CURSOR = 45;
const place = (x, at = 0) => anchor(at, x - Math.floor(at * 78 / 1000));
const joinWidth = { tight: 1, spaced: 3, word: 4 };
const frameCells = { bracket: 2, pill: 2, segmented: 4, tag: 2, edge: 2 };

function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function planCompact(config) {
  const rng = random(config.roleSeed ?? config.seed, 'structure:relations-v8');
  const height = config.band ? 1 : config.height ?? 2;
  const complexity = config.complexity ?? 3;
  const items = config.info === false ? [] : [{ role: 'username', width: rng.pick([6, 8, 8, 10]) }, { role: 'directory', width: rng.int(16, 28) }];
  if (config.label || !items.length) items.push({ role: 'label', text: config.label || 'prompt', width: (config.label || 'prompt').length });
  shuffle(rng, items).forEach((item, id) => { item.id = id; });
  const follow = height === 1 || rng.chance(0.3);
  const textRows = follow ? height : height - 1;
  // Relations between neighbors: share one flowing cluster, stand apart on a
  // line, or start a new line. Fragments bound the number of clusters.
  const lines = [[[items[0]]]];
  const joins = [];
  for (const item of items.slice(1)) {
    const options = ['flow', 'flow', 'flow', 'gap'];
    // A text line above command entry is the point of a taller follow budget.
    if (lines.length < textRows) options.push(...Array(follow ? 7 : 4).fill('line'));
    let relation = rng.pick(options);
    if (relation === 'gap' && lines.at(-1).length >= (config.fragments ?? 4)) relation = 'flow';
    if (relation === 'line') lines.push([[item]]);
    else if (relation === 'gap') lines.at(-1).push([item]);
    else {
      const previous = lines.at(-1).at(-1).at(-1);
      const word = previous.role === 'username' && item.role === 'directory' && rng.chance(0.3);
      joins.push({ between: [previous.id, item.id], kind: word ? 'word' : rng.pick(['tight', 'tight', 'spaced']) });
      lines.at(-1).at(-1).push(item);
    }
  }
  // A path that ends the input line keeps a modest reservation, so its slack
  // before the cursor stays short.
  const path = items.find((item) => item.role === 'directory'), name = items.find((item) => item.role === 'username');
  if (follow && path && lines.at(-1).flat().includes(path)) path.width = Math.min(path.width, rng.int(15, 21));
  if (follow && name && lines.at(-1).flat().includes(name)) name.width = Math.min(name.width, 8);
  // So does a path that another cluster follows on the same line.
  if (path && lines.some((groups) => groups.length > 1 && groups.slice(0, -1).flat().includes(path))) path.width = Math.min(path.width, rng.int(16, 22));
  // Connections are relations, chosen before any paint; weight 0 leaves
  // their cells empty rather than moving anything.
  const linkChance = 0.25 + 0.55 * (config.connectivity ?? 0.3);
  const attach = follow ? 'follow' : rng.chance(linkChance) ? rng.pick(['rail', 'hook']) : rng.pick(['bare', 'bare', 'align']);
  const clusters = [], plannedLines = [];
  for (const [index, groups] of lines.entries()) {
    const relation = index === 0 ? 'origin' : rng.pick(attach !== 'rail' && rng.chance(linkChance) ? ['align', 'indent', 'step'] : ['align', 'indent', 'indent']);
    const line = { row: index, relation, clusters: [] };
    for (const group of groups) {
      const multi = group.length > 1;
      // Slack on the input line becomes distance to the cursor; keep it small.
      const quiet = follow && index === lines.length - 1 || group !== groups.at(-1);
      const allowance = (quiet ? 2 : 4) + (multi ? 2 : 0);
      const cells = group.reduce((n, item) => n + item.width, 0)
        + joins.filter((join) => group.some((item) => item.id === join.between[1])).reduce((n, join) => n + joinWidth[join.kind], 0);
      const cluster = { id: clusters.length, line: index, items: group.map((item) => item.id), cells, allowance, lead: 0, x: 0, at: 0, width: 0 };
      clusters.push(cluster); line.clusters.push(cluster.id);
    }
    plannedLines.push(line);
  }
  const lastLine = plannedLines.at(-1);
  // A leader or connector needs one quiet cell between the text and the line.
  for (const line of plannedLines) for (const [i, id] of line.clusters.entries()) {
    const cluster = clusters[id];
    const leads = i < line.clusters.length - 1 || line === lastLine && ['follow', 'hook'].includes(attach)
      || line.row < plannedLines.length - 1 && i === 0 && plannedLines[line.row + 1].relation === 'step';
    cluster.lead = leads ? 1 : 0;
  }
  const indent = attach === 'rail' ? 3 : rng.pick([0, 0, 1, 2]);
  const gaps = clusters.map(() => rng.int(1, 3));
  const right = clusters.map(() => rng.chance((config.spread ?? 0.5) * 0.7));
  const relations = plannedLines.map(() => rng.int(2, 4));
  const detail = !follow && plannedLines.length < textRows && complexity >= 4 && rng.chance(0.55) ? { width: rng.int(4, 10) } : null;
  const plan = { height, follow, attach, items, joins, clusters, lines: plannedLines, detail, marker: { row: 0, x: 0 } };
  const shape = { indent, gaps, right, relations };
  // Lay out with the sampled relations, then repair only what does not fit:
  // narrower paths, smaller allowances, simpler relations, then narrower names.
  for (let repair = 0; repair < 60; repair++) {
    layout(plan, shape);
    const problem = check(plan);
    if (!problem) break;
    const on = (role) => items.find((item) => item.role === role && clusters.find((c) => c.items.includes(item.id)).line === problem.line);
    const directory = on('directory'), user = on('username');
    const cluster = clusters.find((c) => c.line === problem.line && c.allowance > 2);
    if (directory && directory.width > 12) { directory.width--; recount(plan); }
    else if (cluster) cluster.allowance--;
    else if (problem.kind === 'hook') plan.attach = 'align';
    // A line inherits its x from the lines above, so simplify any of them.
    else if (plan.lines.slice(1, problem.line + 1).some((line) => line.relation !== 'align')) plan.lines.slice(1, problem.line + 1).findLast((line) => line.relation !== 'align').relation = 'align';
    else if (right.some(Boolean)) right.fill(false);
    else if (plan.follow && plan.lines.length < plan.height) { plan.follow = false; plan.attach = 'bare'; }
    else if (shape.indent && plan.attach !== 'rail') shape.indent = 0;
    else if (directory && directory.width > 6) { directory.width--; recount(plan); }
    else if (user && user.width > 4) { user.width--; recount(plan); }
    else break;
  }
  return plan;
}

function recount(plan) {
  for (const cluster of plan.clusters) {
    cluster.cells = cluster.items.reduce((n, id) => n + plan.items[id].width, 0)
      + plan.joins.filter((join) => cluster.items.includes(join.between[1])).reduce((n, join) => n + joinWidth[join.kind], 0);
  }
}

function layout(plan, { indent, gaps, right, relations }) {
  const { clusters, lines } = plan;
  for (const cluster of clusters) cluster.width = cluster.cells + cluster.allowance + cluster.lead;
  for (const line of lines) {
    const first = clusters[line.clusters[0]];
    const previous = line.row ? clusters[lines[line.row - 1].clusters[0]] : null;
    first.at = 0;
    if (!previous) first.x = indent;
    else if (line.relation === 'step') first.x = previous.x + previous.width + 3;
    else first.x = previous.x + (line.relation === 'indent' ? relations[line.row] : 0);
    const input = line === lines.at(-1) && plan.follow;
    for (const [i, id] of line.clusters.entries()) {
      if (!i) continue;
      const cluster = clusters[id], before = clusters[line.clusters[i - 1]];
      cluster.at = 0;
      cluster.x = before.x + before.width + gaps[id];
      if (!input && right[id] && i === line.clusters.length - 1 && plan.attach !== 'hook') {
        cluster.at = 1000; cluster.x = 78 - cluster.width;
      }
    }
  }
  const last = clusters[lines.at(-1).clusters.at(-1)];
  const end = last.x + last.width;
  plan.rows = lines.length + (plan.follow ? 0 : 1) + (plan.detail ? 1 : 0);
  plan.marker = plan.follow ? { row: lines.length - 1, x: end }
    : { row: plan.rows - 1, x: plan.attach === 'rail' ? 2 : plan.attach === 'hook' ? end + 2 : plan.attach === 'align' ? clusters[0].x : 0 };
  if (plan.detail) Object.assign(plan.detail, { row: lines.length, x: clusters[lines.at(-1).clusters[0]].x });
}

function check(plan) {
  for (const line of plan.lines) for (const id of line.clusters) {
    const cluster = plan.clusters[id];
    if (cluster.at === 0 && cluster.x + cluster.width + (cluster.lead ? 1 : 0) > 78) return { line: line.row, kind: 'width' };
    const before = plan.clusters[line.clusters[line.clusters.indexOf(id) - 1]];
    if (cluster.at && before && cluster.x < before.x + before.width + 2) return { line: line.row, kind: 'right' };
  }
  if (plan.marker.x + 2 > CURSOR) return { line: plan.lines.length - 1, kind: plan.attach === 'hook' ? 'hook' : 'cursor' };
  return null;
}

// Atomic treatments compete for one visual budget. A treatment never changes
// a reservation: it must fit the cells its cluster or item already holds.
export function proposeCompact(plan, config) {
  const seed = config.roleSeed ?? config.seed;
  const rng = random(seed, 'structure:relations-v8:treatments');
  const preference = random(seed, 'structure:relations-v8:preference');
  const weight = config.weight ?? 0.3, complexity = config.complexity ?? 3;
  // The prompt engine prefers line treatments; surface spends more on fill.
  const lineWork = config.engine === 'prompt';
  const budgets = { fill: Math.round(weight ** 1.3 * 46 * (lineWork ? 0.35 : 1)), edge: Math.round(weight * 28), treatments: weight === 0 ? 0 : Math.ceil(weight * 3.5) };
  const estimate = (ids) => ids.reduce((n, id) => n + Math.min(plan.items[id].width, plan.items[id].role === 'directory' ? 14 : 5), 0);
  const proposals = [];
  const add = (proposal, bias) => proposals.push({ id: proposals.length, ...proposal, priority: Number((preference.next() + bias).toFixed(6)) });
  for (const cluster of plan.clusters) {
    const multi = cluster.items.length > 1;
    // Leaving text bare is a treatment too; it competes for the cluster.
    add({ level: 'cluster', target: `cluster:${cluster.id}`, cluster: cluster.id, op: 'bare', cells: 0, fill: 0, edge: 0 }, (1 - weight) * 0.75);
    for (let attempt = 0; attempt < 2 + Math.floor(complexity / 4); attempt++) {
      const op = rng.pick(multi ? ['pill', 'segmented', 'segmented', 'bracket', 'tag', 'edge'] : ['pill', 'pill', 'bracket', 'tag', 'edge']);
      const padded = ['pill', 'segmented', 'bracket'].includes(op) && rng.chance(0.4);
      const cells = op === 'segmented' ? 4 : padded ? 4 : frameCells[op];
      const fill = ['pill', 'segmented'].includes(op) ? estimate(cluster.items) + (padded || op === 'segmented' ? 2 : 0) : 0;
      add({ level: 'cluster', target: `cluster:${cluster.id}`, cluster: cluster.id, op, padded: padded || op === 'segmented', cells, fill, edge: ['pill', 'segmented'].includes(op) ? 2 : cells / 2 }, { pill: weight * (lineWork ? 0.2 : 0.55), segmented: weight * (lineWork ? 0.15 : 0.45), bracket: lineWork ? 0.3 : 0.22, tag: 0.12, edge: lineWork ? 0.15 : 0.06 }[op]);
    }
    if (multi && complexity >= 4) for (const id of cluster.items) {
      const op = rng.pick(['bracket', 'pill', 'tag']);
      add({ level: 'item', target: `item:${id}`, cluster: cluster.id, item: id, op, cells: 2, fill: op === 'pill' ? estimate([id]) : 0, edge: op === 'tag' ? 1 : 2 }, 0.1);
    }
  }
  // A leader carries the eye from text to the next fixed element. Corridors
  // to width-relative clusters stay empty; a long path before the cursor
  // strongly prefers one, so its slack never reads as a blank form field.
  for (const line of plan.lines) for (const [i, id] of line.clusters.entries()) {
    const next = plan.clusters[line.clusters[i + 1]];
    const kind = next ? (next.at ? null : 'gap') : line === plan.lines.at(-1) && plan.follow ? 'follow' : null;
    const path = plan.clusters[id].items.some((item) => plan.items[item].role === 'directory');
    if (kind) add({ level: 'link', target: `leader:${id}`, cluster: id, op: 'leader', kind, cells: 0, fill: 0, edge: kind === 'follow' ? 1 : 3 }, kind === 'follow' ? (path ? 2 : 0.35) : path ? 0.6 : 0.25);
  }
  if (plan.detail) add({ level: 'detail', target: 'detail', op: 'motif', cells: 0, fill: 0, edge: Math.ceil(plan.detail.width / 2) }, 0.15);
  const used = { fill: 0, edge: 0, treatments: 0 }, accepted = [];
  const taken = new Map();
  for (const proposal of [...proposals].sort((a, b) => b.priority - a.priority || a.id - b.id)) {
    const cluster = plan.clusters[proposal.cluster];
    const host = taken.get(`cluster:${proposal.cluster}`);
    const inner = cluster ? accepted.filter((p) => p.cluster === proposal.cluster && p.level === 'item') : [];
    let reason;
    if (taken.has(proposal.target) || proposal.level === 'cluster' && taken.has(`cluster:${proposal.cluster}`)) reason = 'target-already-treated';
    else if (used.treatments >= budgets.treatments) reason = 'treatment-budget';
    else if (used.fill + proposal.fill > budgets.fill || used.edge + proposal.edge > budgets.edge) reason = 'visual-weight-budget';
    // Nested fills would hide each other; a segmented pill owns its items.
    else if (proposal.level === 'item' && host && ['pill', 'segmented'].includes(host.op)) reason = 'inside-surface';
    else if (proposal.level === 'cluster' && ['pill', 'segmented'].includes(proposal.op) && inner.length) reason = 'contains-treatment';
    else if (cluster && proposal.cells + (proposal.level === 'cluster' ? inner : host ? [host] : []).reduce((n, p) => n + p.cells, 0)
      + accepted.filter((p) => p.cluster === proposal.cluster && p.level === 'item' && proposal.level === 'item').reduce((n, p) => n + p.cells, 0) > cluster.allowance) reason = 'no-room';
    proposal.accepted = !reason; proposal.reason = reason ?? 'accepted';
    if (reason) continue;
    accepted.push(proposal);
    taken.set(proposal.target, proposal);
    if (proposal.level === 'cluster') taken.set(`cluster:${proposal.cluster}`, proposal);
    used.fill += proposal.fill; used.edge += proposal.edge; used.treatments += ['link', 'bare'].includes(proposal.level) || proposal.op === 'bare' ? 0 : 1;
  }
  return { budgets, used, proposals, accepted };
}

export function composeRelationsV8(config) {
  const plan = planCompact(config);
  const treatment = proposeCompact(plan, config);
  const material = random(config.roleSeed ?? config.seed, 'material:relations-v8');
  const ornament = random(config.ornamentSeed ?? config.seed, 'ornament:relations-v8');
  const lines = materials[config.material ?? 'rounded'];
  const alphabet = alphabets[config.alphabet ?? 'geometric'];
  const dark = config.colors?.length > 6 ? 6 : 0;
  const inks = material.chance(0.65) ? { username: 2, directory: 3, label: 4 } : { username: 3, directory: 2, label: 4 };
  const stroke = material.pick([0, 1, 1]);
  const surface = () => material.chance(0.6) ? { bg: dark, dark: true } : { bg: material.pick([2, 3, 4]), dark: false };
  const marker = ornament.pick(['›', '›', '❯', '>', '▸', '»']);
  const cap = (side) => ornament.pick(side === 'left' ? ['◖', '▐', '▐', ' ', ' '] : ['◗', '▌', '▌', ' ', ' ']);
  // One bracket family per composition; sockets only where a line meets one.
  const pair = ornament.pick([...alphabet.pairs, ['[', ']'], ['(', ')'], [lines[5], lines[5]]]);
  const innerPair = pair[0] === '[' ? ['(', ')'] : ['[', ']'];
  const socket = ornament.chance(0.4);
  const tags = config.alphabet === 'geometric' ? alphabet.atoms.filter((atom) => atom !== '·') : ['▪', '•', '◆', '▸', '◇'];
  // One leader per composition keeps lines of different lengths related. It
  // may be a plain line, dots, or a rhythm cut from the shared motif.
  const solid = config.material === 'dashed' ? '─' : lines[10];
  const shared = deriveMotif(config.motifSeed ?? config.seed);
  const beat = evolveMotif(shared, { width: ornament.int(3, 6), step: 1 }).cells;
  const cut = Array.from({ length: Math.max(...beat.map((cell) => cell.x)) + 2 }, (_, x) => beat.some((cell) => cell.x === x) ? beat.find((cell) => cell.x === x).kind === 'mark' ? '·' : solid : ' ');
  const rhythm = [...cut.slice(cut.findIndex((glyph) => glyph !== ' ')), ...cut.slice(0, cut.findIndex((glyph) => glyph !== ' '))].join('');
  const leaderGlyph = ornament.pick((config.density ?? 0.5) > 0.45 ? [lines[10], lines[10], rhythm, '·', `${solid} `] : [lines[10], rhythm, '·', '· ', '╌']);
  const scene = new Scene(plan.rows, config.glyphs);
  const paintLinks = (config.weight ?? 0.3) > 0;
  const byTarget = new Map(treatment.accepted.map((p) => [p.target, p]));
  const paint = [];
  const roles = [];
  for (const cluster of plan.clusters) {
    const frame = byTarget.get(`cluster:${cluster.id}`)?.op === 'bare' ? null : byTarget.get(`cluster:${cluster.id}`) ?? null;
    const leader = byTarget.get(`leader:${cluster.id}`);
    const fill = frame && ['pill', 'segmented'].includes(frame.op) ? surface() : null;
    const second = frame?.op === 'segmented' ? (fill.dark ? { bg: material.pick([2, 3, 4]), dark: false } : { bg: dark, dark: true }) : null;
    const ink = (item, finish = fill) => finish ? { fg: finish.dark ? inks[item.role] : 'contrast', bg: finish.bg } : inks[item.role];
    const capInk = (finish) => finish.bg;
    const parts = [];
    const bracketInk = material.chance(0.5) ? stroke : inks[plan.items[cluster.items[0]].role];
    const brackets = leader && socket ? [lines[13], lines[7]] : pair;
    if (frame?.op === 'bracket') {
      parts.push({ text: brackets[0], ink: bracketInk });
      if (frame.padded) parts.push({ text: ' ', ink: 0 });
    } else if (frame?.op === 'tag') parts.push({ text: `${ornament.pick(tags)} `, ink: 4 });
    else if (frame?.op === 'edge') parts.push({ text: `${ornament.pick([lines[5], '▌', '┃'])} `, ink: bracketInk });
    else if (fill) {
      parts.push({ text: cap('left'), ink: capInk(fill) });
      if (frame.padded) parts.push({ text: ' ', ink: ink(plan.items[cluster.items[0]]) });
    }
    for (const [i, id] of cluster.items.entries()) {
      const item = plan.items[id];
      const finish = second && i > 0 ? second : fill;
      if (i) {
        const join = plan.joins.find((j) => j.between[1] === id);
        const previous = plan.items[cluster.items[i - 1]];
        if (second) {
          const transition = ornament.pick(['▶', '▌', ' ']);
          const wide = joinWidth[join.kind];
          if (wide > 1) parts.push({ text: ' '.repeat(wide - 2) || ' ', ink: ink(previous, fill) });
          parts.push({ text: transition, ink: transition === ' ' ? ink(item, second) : { fg: fill.bg, bg: second.bg } });
          if (wide > 1) parts.push({ text: ' ', ink: ink(item, second) });
        } else {
          const glyph = join.kind === 'word' ? ' in ' : join.kind === 'tight' ? ornament.pick([' ', ' ', ':', '·']) : ` ${ornament.pick(['·', lines[10], '/', ':', ornament.pick(tags)])} `;
          parts.push({ text: glyph, ink: fill ? ink(previous) : join.kind === 'word' ? stroke : glyph.trim() === ':' ? stroke : 4 });
        }
      }
      const accent = byTarget.get(`item:${id}`);
      const local = accent?.op === 'pill' ? surface() : null;
      const inner = frame?.op === 'bracket' ? innerPair : pair;
      if (accent?.op === 'bracket') parts.push({ text: inner[0], ink: stroke });
      if (accent?.op === 'tag') parts.push({ text: `${ornament.pick(tags)} `, ink: 4 });
      if (local) parts.push({ text: cap('left'), ink: local.bg });
      if (item.role === 'label') parts.push({ text: item.text, ink: ink(item, local ?? finish) });
      else parts.push({ role: item.role, width: item.width, ink: ink(item, local ?? finish) });
      if (accent?.op === 'bracket') parts.push({ text: inner[1], ink: stroke });
      if (local) parts.push({ text: cap('right'), ink: local.bg });
    }
    if (frame?.op === 'bracket') {
      if (frame.padded) parts.push({ text: ' ', ink: 0 });
      parts.push({ text: brackets[1], ink: bracketInk });
    } else if (fill) {
      const end = second ?? fill;
      if (frame.padded) parts.push({ text: ' ', ink: ink(plan.items[cluster.items.at(-1)], end) });
      parts.push({ text: cap('right'), ink: capInk(end) });
    }
    if (cluster.lead) parts.push({ text: ' ', ink: 0 });
    // A step or elbow continues from this cluster's end, so its pad is line.
    const line = plan.lines[cluster.line];
    const elbow = paintLinks && (plan.attach === 'hook' && cluster.id === plan.lines.at(-1).clusters.at(-1)
      || line.clusters[0] === cluster.id && plan.lines[line.row + 1]?.relation === 'step');
    const pad = leader ? { text: leaderGlyph, ink: stroke } : elbow ? { text: lines[10], ink: stroke } : { text: ' ', ink: 0 };
    const x = place(cluster.x, cluster.at), row = cluster.line;
    if (cluster.items.every((id) => plan.items[id].role === 'label')) {
      const text = parts.map((part) => part.text).join('');
      parts.forEach((part, i) => scene.text(row, place(cluster.x + [...parts.slice(0, i).map((p) => p.text).join('')].length, cluster.at), part.text, part.ink));
      scene.fill(row, place(cluster.x + [...text].length, cluster.at), place(cluster.x + cluster.width, cluster.at), pad.text, pad.ink);
    } else scene.live(row, x, cluster.width, parts, pad);
    roles.push({ id: cluster.id, row, x: cluster.x, width: cluster.width, at: cluster.at });
    paint.push({ cluster: cluster.id, frame: frame?.op ?? null, fill: fill?.bg ?? null, second: second?.bg ?? null, leader: pad.text.trim() ? pad.text : null });
    // Leaders continue across a gap up to one quiet cell before the next cluster.
    const next = plan.clusters[line.clusters[line.clusters.indexOf(cluster.id) + 1]];
    if (leader && next && next.x - 1 > cluster.x + cluster.width) {
      // Continue a patterned leader in phase with the pad it extends.
      const glyphs = [...pad.text], phase = cluster.width % glyphs.length;
      scene.fill(row, place(cluster.x + cluster.width), place(next.x - 1, next.at), [...glyphs.slice(phase), ...glyphs.slice(0, phase)].join(''), stroke);
    }
  }
  // Connections between lines and to command entry.
  const end = (cluster) => cluster.x + cluster.width;
  for (const line of paintLinks ? plan.lines.slice(1) : []) if (line.relation === 'step') {
    const above = plan.clusters[plan.lines[line.row - 1].clusters[0]];
    scene.text(above.line, left(end(above)), lines[12], stroke);
    scene.text(line.row, left(end(above)), lines[3] + lines[10], stroke);
  }
  if (paintLinks && plan.attach === 'rail') {
    // Each stub reaches one quiet cell before its line's text.
    for (let row = 0; row < plan.rows; row++) {
      const line = plan.lines[row], reach = line ? plan.clusters[line.clusters[0]].x - 2 : 1;
      const text = row === 0 ? lines[6] : row === plan.marker.row ? lines[3] : line ? lines[7] : lines[5];
      scene.text(row, left(0), text + (line || row === plan.marker.row ? lines[10].repeat(Math.max(1, reach)) : ''), stroke);
    }
  }
  if (paintLinks && plan.attach === 'hook') {
    const last = plan.clusters[plan.lines.at(-1).clusters.at(-1)];
    scene.text(last.line, left(end(last)), lines[12], stroke);
    scene.text(plan.marker.row, left(end(last)), lines[3] + lines[10], stroke);
  }
  let motif = null;
  if (plan.detail && byTarget.has('detail')) {
    motif = evolveMotif(deriveMotif(config.motifSeed ?? config.seed), { width: plan.detail.width, step: plan.clusters.length - 1 });
    // Quiet marks with one accent, so the rhythm reads as a rule, not text.
    const accent = ornament.pick(tags);
    for (const cell of motif.cells) scene.text(plan.detail.row, left(plan.detail.x + cell.x), cell.kind === 'mark' ? cell.tone === 3 ? accent : '·' : lines[cell.bits] || '·', cell.kind === 'mark' && cell.tone === 3 ? 4 : stroke);
  }
  scene.text(plan.marker.row, left(plan.marker.x), marker, 4);
  scene.runs.at(-1).purpose = 'input';
  // Height is a budget: drop rows that nothing occupies.
  const used = [...new Set(scene.runs.map((run) => run.row))].sort((a, b) => a - b);
  const rowMap = Object.fromEntries(used.map((row, index) => [row, index]));
  for (const run of scene.runs) run.row = rowMap[run.row];
  scene.rows = used.length;
  const placed = roles.map((role) => ({ ...role, row: rowMap[role.row] }));
  return {
    scene, cursor: plan.marker.x + 2, rightPrompt: '',
    program: {
      engine: 'role-relations/3', lattice: { columns: 79, rows: plan.rows },
      traits: { weight: config.weight ?? 0.3, material: config.material, alphabet: config.alphabet, density: config.density },
      derivation: { ...plan, roles: placed, ...treatment }, annotations: { marker, motif: motif?.evolution ?? null }, paint, rowMap,
      interactions: { mode: 'roles', ports: rolePorts(placed), masks: roleMasks(placed), attachments: [] },
      stats: { fragments: plan.clusters.length, groups: plan.lines.length,
        links: treatment.accepted.filter((p) => p.op === 'leader').length + (['rail', 'hook'].includes(plan.attach) ? 1 : 0) + plan.lines.filter((l) => l.relation === 'step').length,
        filledCells: treatment.used.fill, edgeCells: treatment.used.edge, treatments: treatment.used.treatments,
        accepted: treatment.accepted.length, rejected: treatment.proposals.length - treatment.accepted.length,
        span: Math.max(...plan.clusters.map((c) => c.at ? 79 : c.x + c.width)) },
    },
  };
}
