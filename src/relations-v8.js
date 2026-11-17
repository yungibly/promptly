import { Scene, anchor, left } from './scene.js';
import { random } from './random.js';
import { materials, alphabets } from './ornaments.js';
import { rolePorts, roleMasks } from './interactions.js';
import { palette, ramp, mix, emit, fixed } from './systems/raster.js';
import { texture, rhythm, rhythmKinds } from './systems/texture.js';

// Version 8 compact composition. Live values hug their decoration, so the
// composer arranges text clusters rather than fixed-width fields: values flow
// together or stand apart, lines stack or hang from each other, and command
// entry follows the text or starts below it. Each cluster's reservation is a
// small canvas: the text sits at its start and the rest reveals a texture,
// a gradient bed, or a rhythm. Positions are planned before any paint, so
// weight, ornament, complexity, and color never move a field or the input.
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
    if (lines.length < textRows) options.push('line', 'line', 'line', 'line');
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
      // Elsewhere the reservation holds a bed's dissolving edge or a texture.
      const quiet = follow && index === lines.length - 1 || group !== groups.at(-1);
      const allowance = (quiet ? 3 : 6) + (multi ? 2 : 0);
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
  // Texture room. A strip row needs a row the height budget can spare; a tail
  // continues a line's texture past its last reservation. Paint comes later.
  const spare = height - plannedLines.length - (follow ? 0 : 1);
  const strip = spare > 0 && rng.chance(0.85) ? { position: follow || rng.chance(0.5) ? 'above' : 'below', width: rng.int(12, 30), shift: rng.int(0, 2) } : null;
  const reach = plannedLines.map(() => rng.int(6, 16));
  const plan = { height, follow, attach, items, joins, clusters, lines: plannedLines, strip, top: strip?.position === 'above' ? 1 : 0, tails: [], marker: { row: 0, x: 0 } };
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
    else if (plan.follow && plan.lines.length < plan.height && !plan.strip) { plan.follow = false; plan.attach = 'bare'; }
    else if (shape.indent && plan.attach !== 'rail') shape.indent = 0;
    else if (directory && directory.width > 6) { directory.width--; recount(plan); }
    else if (user && user.width > 4) { user.width--; recount(plan); }
    else break;
  }
  // A tail ends a line, except where an elbow, a step, or command entry does.
  plan.tails = plannedLines.map((line, i) => {
    const last = clusters[line.clusters.at(-1)];
    if (last.at || plan.follow && line === lastLine || plan.attach === 'hook' && line === lastLine) return null;
    if (line.clusters.length === 1 && plannedLines[i + 1]?.relation === 'step') return null;
    const length = Math.min(reach[i], 78 - last.x - last.width);
    return length >= 4 ? { cluster: last.id, length } : null;
  });
  if (plan.strip) plan.strip.width = Math.min(plan.strip.width, 78 - plan.strip.x);
  return plan;
}

function recount(plan) {
  for (const cluster of plan.clusters) {
    cluster.cells = cluster.items.reduce((n, id) => n + plan.items[id].width, 0)
      + plan.joins.filter((join) => cluster.items.includes(join.between[1])).reduce((n, join) => n + joinWidth[join.kind], 0);
  }
}

// Planning rows: an optional strip above, the text lines, an optional strip
// below, then command entry unless it follows the last line.
const rowOf = (plan, line) => plan.top + line;

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
  const below = plan.strip?.position === 'below' ? 1 : 0;
  plan.rows = plan.top + lines.length + below + (plan.follow ? 0 : 1);
  plan.marker = plan.follow ? { row: rowOf(plan, lines.length - 1), x: end }
    : { row: plan.rows - 1, x: plan.attach === 'rail' ? 2 : plan.attach === 'hook' ? end + 2 : plan.attach === 'align' ? clusters[0].x : 0 };
  if (plan.strip) {
    const near = clusters[lines[below ? lines.length - 1 : 0].clusters[0]];
    Object.assign(plan.strip, { row: below ? rowOf(plan, lines.length) : 0, x: near.x + plan.strip.shift });
  }
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
// a reservation: it must fit the cells its cluster or item already holds, or
// the tail and strip room the plan set aside.
export function proposeCompact(plan, config) {
  const seed = config.roleSeed ?? config.seed;
  const rng = random(seed, 'structure:relations-v8:treatments');
  const preference = random(seed, 'structure:relations-v8:preference');
  const weight = config.weight ?? 0.3, complexity = config.complexity ?? 3;
  // The prompt engine prefers line treatments; surface spends more on fill.
  // Any weight affords one quiet gesture, such as a rhythm or a short tail.
  const lineWork = config.engine === 'prompt';
  const budgets = { fill: Math.round(weight ** 1.3 * 46 * (lineWork ? 0.35 : 1)), edge: weight ? Math.max(4, Math.round(weight * 28)) : 0, treatments: weight === 0 ? 0 : Math.ceil(weight * 3.5) };
  const estimate = (ids) => ids.reduce((n, id) => n + Math.min(plan.items[id].width, plan.items[id].role === 'directory' ? 14 : 5), 0);
  const proposals = [];
  const add = (proposal, bias) => proposals.push({ id: proposals.length, ...proposal, priority: Number((preference.next() + bias).toFixed(6)) });
  for (const cluster of plan.clusters) {
    const multi = cluster.items.length > 1;
    // Leaving text bare is a treatment too; it competes for the cluster.
    add({ level: 'cluster', target: `cluster:${cluster.id}`, cluster: cluster.id, op: 'bare', cells: 0, fill: 0, edge: 0 }, (1 - weight) * 0.7);
    for (let attempt = 0; attempt < 2 + Math.floor(complexity / 4); attempt++) {
      const op = rng.pick(multi ? ['bed', 'pill', 'segmented', 'segmented', 'bracket', 'tag', 'edge'] : ['bed', 'bed', 'pill', 'bracket', 'tag', 'edge']);
      const padded = ['pill', 'segmented', 'bracket'].includes(op) && rng.chance(0.4);
      // A bed is a gradient under the text that dissolves into a left edge
      // of one or two cells; its right side is the reservation's own texture.
      const cap = op === 'bed' ? rng.int(1, 2) : 0;
      const cells = op === 'bed' ? cap + 1 : op === 'segmented' ? 4 : padded ? 4 : frameCells[op];
      const fill = op === 'bed' ? estimate(cluster.items) + 4 : ['pill', 'segmented'].includes(op) ? estimate(cluster.items) + (padded || op === 'segmented' ? 2 : 0) : 0;
      add({ level: 'cluster', target: `cluster:${cluster.id}`, cluster: cluster.id, op, padded: padded || op === 'segmented', cap, cells, fill, edge: ['pill', 'segmented', 'bed'].includes(op) ? 2 : cells / 2 },
        { bed: weight * (lineWork ? 0.2 : 0.6), pill: weight * (lineWork ? 0.15 : 0.35), segmented: weight * (lineWork ? 0.1 : 0.35), bracket: lineWork ? 0.25 : 0.15, tag: 0.1, edge: lineWork ? 0.12 : 0.05 }[op]);
    }
    if (multi && complexity >= 4) for (const id of cluster.items) {
      const op = rng.pick(['bracket', 'pill', 'tag']);
      add({ level: 'item', target: `item:${id}`, cluster: cluster.id, item: id, op, cells: 2, fill: op === 'pill' ? estimate([id]) : 0, edge: op === 'tag' ? 1 : 2 }, 0.05);
    }
  }
  // A leader carries the eye from text to the next fixed element. Corridors
  // to width-relative clusters stay empty; a long path before the cursor
  // strongly prefers one, so its slack never reads as a blank form field.
  for (const line of plan.lines) for (const [i, id] of line.clusters.entries()) {
    const next = plan.clusters[line.clusters[i + 1]];
    const kind = next ? (next.at ? null : 'gap') : line === plan.lines.at(-1) && plan.follow ? 'follow' : null;
    const path = plan.clusters[id].items.some((item) => plan.items[item].role === 'directory');
    if (kind) add({ level: 'link', target: `leader:${id}`, cluster: id, op: 'leader', kind, cells: 0, fill: 0, edge: kind === 'follow' ? 1 : 3 }, kind === 'follow' ? (path ? 2 : 1) : path ? 0.6 : 0.25);
  }
  for (const tail of plan.tails.filter(Boolean)) add({ level: 'link', target: `tail:${tail.cluster}`, cluster: tail.cluster, op: 'tail', cells: 0, fill: 0, edge: Math.ceil(tail.length / 4) }, 0.45);
  if (plan.strip) add({ level: 'row', target: 'strip', op: 'strip', cells: 0, fill: 0, edge: Math.ceil(plan.strip.width / 4) }, 0.25 + weight * 0.45);
  // A right-prompt accent is occasional; on every prompt it became a habit,
  // and at wide widths a far accent beside a quiet prompt read as confetti.
  if (!config.band && weight >= 0.25 && rng.chance(0.12)) add({ level: 'right', target: 'accent', op: 'accent', cells: 0, fill: 0, edge: 2 }, weight * 0.3);
  const used = { fill: 0, edge: 0, treatments: 0 }, accepted = [];
  const taken = new Map();
  for (const proposal of [...proposals].sort((a, b) => b.priority - a.priority || a.id - b.id)) {
    const cluster = plan.clusters[proposal.cluster];
    const host = taken.get(`cluster:${proposal.cluster}`);
    const inner = cluster ? accepted.filter((p) => p.cluster === proposal.cluster && p.level === 'item') : [];
    let reason;
    if (taken.has(proposal.target) || proposal.level === 'cluster' && taken.has(`cluster:${proposal.cluster}`)) reason = 'target-already-treated';
    else if (!['link', 'bare'].includes(proposal.level) && proposal.op !== 'bare' && used.treatments >= budgets.treatments) reason = 'treatment-budget';
    else if (used.fill + proposal.fill > budgets.fill || used.edge + proposal.edge > budgets.edge) reason = 'visual-weight-budget';
    // One large gesture per prompt: a bed or a strip, not both.
    else if (proposal.op === 'strip' && accepted.some((p) => ['bed', 'accent'].includes(p.op)) || ['bed', 'accent'].includes(proposal.op) && taken.has('strip')) reason = 'one-gesture';
    // Nested fills would hide each other; a segmented pill owns its items.
    else if (proposal.level === 'item' && host && ['pill', 'segmented', 'bed'].includes(host.op)) reason = 'inside-surface';
    else if (proposal.level === 'cluster' && ['pill', 'segmented', 'bed'].includes(proposal.op) && inner.length) reason = 'contains-treatment';
    else if (cluster && proposal.cells + (proposal.level === 'cluster' ? inner : host ? [host] : []).reduce((n, p) => n + p.cells, 0)
      + accepted.filter((p) => p.cluster === proposal.cluster && p.level === 'item' && proposal.level === 'item').reduce((n, p) => n + p.cells, 0) > cluster.allowance) reason = 'no-room';
    proposal.accepted = !reason; proposal.reason = reason ?? 'accepted';
    if (reason) continue;
    accepted.push(proposal);
    taken.set(proposal.target, proposal);
    if (proposal.level === 'cluster') taken.set(`cluster:${proposal.cluster}`, proposal);
    used.fill += proposal.fill; used.edge += proposal.edge; used.treatments += proposal.level === 'link' || proposal.op === 'bare' ? 0 : 1;
  }
  return { budgets, used, proposals, accepted };
}

const inkOf = (cell) => !cell ? 0 : cell.bg ? { fg: cell.fg ?? cell.bg, bg: cell.bg, exact: true } : cell.fg;

export function composeRelationsV8(config) {
  const plan = planCompact(config);
  const treatment = proposeCompact(plan, config);
  const material = random(config.roleSeed ?? config.seed, 'material:relations-v8');
  const ornament = random(config.ornamentSeed ?? config.seed, 'ornament:relations-v8');
  const fork = (key) => random(config.ornamentSeed ?? config.seed, `ornament:relations-v8:${key}`);
  const lines = materials[config.material ?? 'rounded'];
  const alphabet = alphabets[config.alphabet ?? 'geometric'];
  const ascii = config.glyphs === 'ascii';
  const weight = config.weight ?? 0.3;
  const dark = config.colors?.length > 6 ? 6 : 0;
  const inks = material.chance(0.65) ? { username: 2, directory: 3, label: 4 } : { username: 3, directory: 2, label: 4 };
  const stroke = material.pick([0, 1, 1]);
  const colors = palette(config.colors, material);
  const surface = () => material.chance(0.6) ? { bg: dark, dark: true } : { bg: material.pick([2, 3, 4]), dark: false };
  const marker = ornament.pick(['›', '›', '❯', '>', '▸', '»']);
  const cap = (side) => ornament.pick(side === 'left' ? ['◖', '▐', '▐', ' ', ' '] : ['◗', '▌', '▌', ' ', ' ']);
  // One bracket family per composition; sockets only where a line meets one.
  const pair = ornament.pick([...alphabet.pairs, ['[', ']'], ['(', ')'], [lines[5], lines[5]]]);
  const innerPair = pair[0] === '[' ? ['(', ')'] : ['[', ']'];
  const socket = ornament.chance(0.4);
  const tags = config.alphabet === 'geometric' ? alphabet.atoms.filter((atom) => atom !== '·') : ['▪', '•', '◆', '▸', '◇'];
  // One idea per prompt. Quiet prompts carry a single rhythm; others one
  // texture, repeated wherever the plan left room: leaders, tails, a strip,
  // and the right accent. Ornament chooses it, so geometry never depends on it.
  const quiet = weight < 0.25;
  // Surface leans on filled material, prompt on line work. An idea is a pair:
  // a kind that holds up in one row (ridge, dissolve, maze) and the kind for a
  // texture two rows tall, where an automaton, a truchet meander, or a
  // gradient band reads cleanly. Braille waves and sprigs read as grit at this
  // scale, and a one-row gradient tail as a solid slab.
  const [idea, tall] = quiet ? [null, null] : ornament.pick(config.engine === 'prompt'
    ? [['maze', 'maze'], ['maze', 'truchet'], ['ridge', 'truchet'], ['dissolve', 'maze'], ['maze', 'gradient']]
    : [['ridge', 'ridge'], ['dissolve', 'dissolve'], ['ridge', 'gradient'], ['dissolve', 'automaton'], ['ridge', 'automaton'], ['dissolve', 'gradient']]);
  const beat = rhythm(ornament.pick(rhythmKinds.filter((kind) => !['wave', 'chain'].includes(kind))), fork('rhythm'), { colors, ascii });
  // A gradient is brightest at its anchor; other kinds fill their canvas.
  const strip = (key, width, { anchor } = {}) => texture(idea, fork(key), { width, rows: 1, colors, ascii, ...(idea === 'gradient' ? { anchor } : {}) })[0];
  const rhythmCells = (width) => Array.from({ length: width }, (_, x) => { const glyphs = [...beat.text], ch = glyphs[x % glyphs.length]; return ch === ' ' ? null : { ch, fg: beat.ink }; });
  // Lines carry a gradient toward command entry rather than one flat ink.
  const glow = ramp([mix(colors.quiet, colors.ground, 0.2), colors.stops.at(-1)], 6);
  const scene = new Scene(plan.rows, config.glyphs);
  const paintLinks = weight > 0;
  const byTarget = new Map(treatment.accepted.map((p) => [p.target, p]));
  // A bed is then the prompt's one idea; other canvases keep a quiet rhythm.
  const bedded = treatment.accepted.some((p) => p.op === 'bed');
  // Texture lives outside related text: a tail, or a leader into command
  // entry, not a gap between clusters of one line, which keeps the rhythm.
  const textured = (cluster) => {
    if (!idea || bedded || plan.clusters[cluster.id] !== cluster) return false;
    const line = plan.lines[cluster.line], last = line.clusters.at(-1) === cluster.id;
    return byTarget.has(`tail:${cluster.id}`) || last && byTarget.has(`leader:${cluster.id}`);
  };
  // A strip beside a textured canvas is the same texture two rows tall: one
  // gesture, the text sitting in its lower or upper half.
  let twin = null;
  if (plan.strip && byTarget.has('strip')) {
    const below = plan.strip.position === 'below';
    const near = plan.lines[below ? plan.lines.length - 1 : 0];
    const host = plan.clusters[near.clusters.at(-1)];
    if (textured(host) && near.clusters.length === 1) {
      const span = host.width + (byTarget.has(`tail:${host.id}`) ? plan.tails[host.line].length : 0);
      const grid = texture(tall, fork('pair'), { width: span, rows: 2, colors, ascii });
      twin = { host: host.id, x: host.x, strip: grid[below ? 1 : 0], canvas: grid[below ? 0 : 1] };
    }
  }
  const paint = [], roles = [];
  for (const cluster of plan.clusters) {
    const chosen = byTarget.get(`cluster:${cluster.id}`);
    const frame = chosen?.op === 'bare' ? null : chosen ?? null;
    const leader = byTarget.get(`leader:${cluster.id}`), tail = byTarget.get(`tail:${cluster.id}`);
    const line = plan.lines[cluster.line], row = rowOf(plan, cluster.line);
    const next = plan.clusters[line.clusters[line.clusters.indexOf(cluster.id) + 1]];
    // The canvas: the reservation plus any gap or tail it continues into. A
    // bed is a plate hugging the text: it glows into command entry, or ends a
    // few cells past the text it expects in a dithered edge, then goes quiet.
    const isBed = frame?.op === 'bed';
    const extra = tail && !isBed ? plan.tails[cluster.line].length : leader && next ? Math.max(0, next.x - 1 - cluster.x - cluster.width) : 0;
    let bed = null;
    if (isBed) {
      const into = leader && !next, span = cluster.width + extra;
      const plate = into ? span : Math.min(span, frame.cap + 1 + cluster.items.reduce((n, id) => n + Math.min(plan.items[id].width, plan.items[id].role === 'directory' ? 16 : 6), 0) + 6);
      bed = texture('gradient', fork(`bed:${cluster.id}`), { width: plate, rows: 1, colors, ascii, anchor: plate - 1 })[0];
      const edge = bed.at(-1)?.bg ?? colors.ground;
      bed = [...bed, ...(ascii ? [':', '.'] : ['▓', '▒', '░']).map((ch) => ({ ch, fg: edge }))].slice(0, span);
      while (bed.length < span) bed.push(null);
    }
    const base = bed ? { bg: bed[frame.cap + 1]?.bg ?? colors.ground, dark: true } : null;
    const fill = base ?? (frame && ['pill', 'segmented'].includes(frame.op) ? surface() : null);
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
    else if (bed) {
      // The bed's left edge dissolves into the terminal through dither.
      parts.push({ text: ['░', '▒', '▓'].slice(-frame.cap).join(''), ink: base.bg });
      parts.push({ text: ' ', ink: { fg: base.bg, bg: base.bg } });
    } else if (fill) {
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
    } else if (fill && !bed) {
      const end = second ?? fill;
      if (frame.padded) parts.push({ text: ' ', ink: ink(plan.items[cluster.items.at(-1)], end) });
      parts.push({ text: cap('right'), ink: capInk(end) });
    }
    if (cluster.lead) parts.push({ text: ' ', ink: bed ? { fg: base.bg, bg: base.bg } : 0 });
    // A step or elbow continues from this cluster's end, so its pad is line.
    const elbow = paintLinks && (plan.attach === 'hook' && cluster.id === plan.lines.at(-1).clusters.at(-1)
      || line.clusters[0] === cluster.id && plan.lines[line.row + 1]?.relation === 'step');
    // The reservation reveals one strip from its first cell, so a texture
    // continues behind the text and appears wherever the text ends.
    const span = cluster.width + extra;
    let cells = null, pad = { text: ' ', ink: 0 }, canvas = null;
    if (bed) { cells = bed; canvas = 'bed'; }
    else if (twin?.host === cluster.id) { cells = twin.canvas; canvas = tall; }
    else if (textured(cluster)) { cells = strip(`pad:${cluster.id}`, span, { anchor: tail ? 0 : span - 1 }); canvas = idea; }
    else if (leader || tail) {
      canvas = 'rhythm';
      // A quiet rhythm, phased from the cluster's first cell.
      cells = rhythmCells(span);
      // A tail thins out through an ordered threshold, never adding cells.
      if (tail) cells = cells.map((cell, x) => x < cluster.width || (x * 7 % 11) / 11 < 1 - (x - cluster.width) / extra ? cell : null);
    } else if (elbow) canvas = 'elbow', cells = Array.from({ length: span }, (_, x) => ({ ch: lines[10], fg: glow[Math.min(glow.length - 1, Math.floor(x / span * glow.length))] }));
    if (cells) pad = { text: cells.slice(0, cluster.width).map((cell) => cell?.ch ?? ' ').join(''), ink: cells.slice(0, cluster.width).map(inkOf) };
    const x = place(cluster.x, cluster.at);
    if (cluster.items.every((id) => plan.items[id].role === 'label')) {
      // Static text has a known end; the canvas after it is painted directly.
      const text = parts.map((part) => part.text).join(''), length = [...text].length;
      parts.forEach((part, i) => scene.text(row, place(cluster.x + [...parts.slice(0, i).map((p) => p.text).join('')].length, cluster.at), part.text, part.ink));
      if (cells) emit(scene, [cells.slice(length, cluster.width)], fixed(cluster.at, cluster.x + length - Math.floor(cluster.at * 78 / 1000)), row);
    } else scene.live(row, x, cluster.width, parts, pad);
    if (cells && extra) emit(scene, [cells.slice(cluster.width, cluster.width + extra)], fixed(0, cluster.x + cluster.width), row);
    roles.push({ id: cluster.id, row, x: cluster.x, width: cluster.width, at: cluster.at });
    paint.push({ cluster: cluster.id, frame: frame?.op ?? null, fill: fill?.bg ?? null, second: second?.bg ?? null,
      canvas, extra });
  }
  // Connections between lines and to command entry, lit toward the cursor.
  const end = (cluster) => cluster.x + cluster.width;
  const run = (y, x0, text, from = 0) => [...text].forEach((glyph, i) => scene.text(y, left(x0 + i), glyph, glow[Math.min(glow.length - 1, from + i)]));
  for (const line of paintLinks ? plan.lines.slice(1) : []) if (line.relation === 'step') {
    const above = plan.clusters[plan.lines[line.row - 1].clusters[0]];
    run(rowOf(plan, above.line), end(above), lines[12], 4);
    run(rowOf(plan, line.row), end(above), lines[3] + lines[10], 4);
  }
  if (paintLinks && plan.attach === 'rail') {
    // Each stub reaches one quiet cell before its line's text.
    const first = rowOf(plan, 0);
    for (let y = first; y < plan.rows; y++) {
      const line = plan.lines.find((l) => rowOf(plan, l.row) === y), reach = line ? plan.clusters[line.clusters[0]].x - 2 : 1;
      const corner = y === first ? lines[6] : y === plan.marker.row ? lines[3] : line ? lines[7] : lines[5];
      run(y, 0, corner + (line || y === plan.marker.row ? lines[10].repeat(Math.max(1, reach)) : ''), Math.round((y - first) / Math.max(1, plan.rows - 1 - first) * 4));
    }
  }
  if (paintLinks && plan.attach === 'hook') {
    const last = plan.clusters[plan.lines.at(-1).clusters.at(-1)];
    run(rowOf(plan, last.line), end(last), lines[12], 4);
    run(plan.marker.row, end(last), lines[3] + lines[10], 4);
  }
  // A strip row hangs above or below the text, growing from its start.
  if (plan.strip && byTarget.has('strip')) {
    const { row, x, width } = plan.strip;
    if (twin) emit(scene, [twin.strip], fixed(0, twin.x), row);
    else emit(scene, [idea ? strip('strip', width, { anchor: 0 }) : rhythmCells(width)], fixed(0, x), row);
  }
  scene.text(plan.marker.row, left(plan.marker.x), marker, 4);
  scene.runs.at(-1).purpose = 'input';
  // A short accent in the native right prompt: zsh hides it as typing nears.
  let rightRuns = [];
  if (byTarget.has('accent')) {
    const width = ornament.int(6, 12);
    // Only solid kinds: a lone braille accent at the far edge read as noise.
    const cells = texture(idea && !bedded ? idea : 'gradient', fork('accent'), { width, rows: 1, colors, ascii, anchor: width - 1 })[0];
    for (const cell of cells) {
      const glyph = !cell ? ' ' : cell.ch === ' ' ? (ascii ? '#' : '█') : cell.ch, color = cell ? cell.fg ?? cell.bg : null;
      if (rightRuns.length && (color === null || rightRuns.at(-1).ink === color)) rightRuns.at(-1).text += glyph;
      else rightRuns.push({ text: glyph, ink: color ?? colors.quiet });
    }
    rightRuns = rightRuns.filter((r, i, all) => r.text.trim() || i > 0 && i < all.length - 1);
    if (rightRuns.length) { rightRuns[0].text = rightRuns[0].text.trimStart(); rightRuns.at(-1).text = rightRuns.at(-1).text.trimEnd(); }
  }
  // Height is a budget: drop rows that nothing occupies.
  const used = [...new Set(scene.runs.map((run) => run.row))].sort((a, b) => a - b);
  const rowMap = Object.fromEntries(used.map((row, index) => [row, index]));
  for (const run of scene.runs) run.row = rowMap[run.row];
  scene.rows = used.length;
  const placed = roles.map((role) => ({ ...role, row: rowMap[role.row] }));
  return {
    scene, cursor: plan.marker.x + 2, rightPrompt: rightRuns.map((r) => r.text).join(''), ...(rightRuns.length ? { rightRuns } : {}),
    program: {
      engine: 'role-relations/3', lattice: { columns: 79, rows: plan.rows },
      traits: { weight, material: config.material, alphabet: config.alphabet, density: config.density, idea: idea ?? 'rhythm', tall: tall ?? null, palette: colors.family },
      derivation: { ...plan, roles: placed, ...treatment }, annotations: { marker, rhythm: beat.text }, paint, rowMap,
      interactions: { mode: 'roles', ports: rolePorts(placed), masks: roleMasks(placed), attachments: [] },
      stats: { fragments: plan.clusters.length, groups: plan.lines.length,
        links: treatment.accepted.filter((p) => ['leader', 'tail'].includes(p.op)).length + (['rail', 'hook'].includes(plan.attach) ? 1 : 0) + plan.lines.filter((l) => l.relation === 'step').length,
        filledCells: treatment.used.fill, edgeCells: treatment.used.edge, treatments: treatment.used.treatments,
        accepted: treatment.accepted.length, rejected: treatment.proposals.length - treatment.accepted.length,
        span: Math.max(...plan.clusters.map((c) => c.at ? 79 : c.x + c.width)) },
    },
  };
}
