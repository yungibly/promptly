import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDesign, mutateDesign, recipe } from '../src/design.js';
import { flatten } from '../src/flatten.js';
import { preview } from '../src/preview.js';

const compact = (seed, extra = {}) => createDesign({ seed, engine: seed.length % 2 ? 'surface' : 'prompt', ...extra });
// Planning geometry. Accepted detail may still occupy an otherwise empty row.
const geometry = (design) => {
  const { clusters, lines, items, marker, attach } = design.program.derivation;
  return JSON.stringify({ clusters: clusters.map(({ x, at, width, line, items }) => ({ x, at, width, line, items })), lines, items, marker, attach, cursor: design.cursor });
};

test('version-8 compact prompts vary the relations of their parts, not just their glyphs', () => {
  const count = {}, arrangements = new Set(), seen = (key) => { count[key] = (count[key] ?? 0) + 1; };
  const n = 240;
  for (let i = 0; i < n; i++) {
    const design = compact(`v8-variety/${i}`);
    const { lines, clusters, attach, accepted, joins } = design.program.derivation;
    seen(`attach:${attach}`);
    for (const line of lines.slice(1)) seen(`line:${line.relation}`);
    if (clusters.some((cluster) => cluster.at)) seen('split');
    for (const op of new Set(accepted.filter((p) => p.level !== 'link').map((p) => `${p.level}:${p.op}`))) seen(op);
    if (accepted.some((p) => p.op === 'leader')) seen('leader');
    for (const join of joins) seen(`join:${join.kind}`);
    // Arrangement: which roles share a line or a cluster, how lines relate,
    // and how command entry attaches. Inks and glyph choices are excluded.
    arrangements.add(JSON.stringify([attach, lines.map((line) => [line.relation, line.clusters.map((id) => clusters[id].items.map((item) => design.program.derivation.items[item].role[0]).join('') + (clusters[id].at ? '>' : ''))])]));
  }
  const share = (key) => (count[key] ?? 0) / n;
  for (const key of ['attach:follow', 'attach:bare', 'attach:align', 'attach:rail', 'attach:hook', 'line:align', 'line:indent', 'line:step', 'split',
    'cluster:bare', 'cluster:pill', 'cluster:segmented', 'cluster:bracket', 'cluster:tag', 'cluster:edge', 'item:pill', 'item:bracket', 'item:tag', 'join:tight', 'join:spaced', 'join:word']) {
    assert.ok(share(key) > 0, `${key} never occurs`);
  }
  // No relation or treatment becomes the new universal habit.
  assert.ok(share('attach:follow') < 0.65 && share('leader') < 0.75 && share('cluster:bare') > 0.25 && share('cluster:bracket') < 0.35, JSON.stringify(count));
  assert.ok(arrangements.size >= 36, `${arrangements.size} arrangements`);
});

test('every version-8 compact prompt keeps rows, reservations, and command entry inside the medium', () => {
  for (let i = 0; i < 160; i++) {
    for (const glyphs of i % 7 ? ['unicode'] : ['ascii', 'powerline']) {
      const design = compact(`v8-bounds/${i}`, { glyphs, ...(i % 5 ? {} : { label: i % 10 ? 'deep work' : 'a twenty-cell label.' }), ...(i % 11 ? {} : { info: false }) });
      assert.ok(design.scene.rows >= 1 && design.scene.rows <= design.height && design.scene.rows <= 3, design.seed);
      assert.ok(design.cursor <= 47 && design.cursor >= 2, `${design.seed}: cursor ${design.cursor}`);
      const input = design.scene.runs.find((run) => run.purpose === 'input');
      assert.equal(input.row, design.scene.rows - 1);
      assert.equal(input.x.offset + 2, design.cursor);
      for (const width of [79, 119, 999]) {
        const rows = flatten(design, width);
        const last = rows.at(-1);
        assert.ok(last.every((span) => !(typeof span.ink === 'object' && span.ink.bg != null && span.to.offset > design.cursor)), `${design.seed}: fill reached command entry`);
        for (const span of rows.flat().filter((span) => span.role)) assert.ok(span.to.at || span.to.offset <= width, `${design.seed}: reservation beyond ${width}`);
      }
      if (glyphs === 'ascii') assert.ok(design.scene.runs.every((run) => /^[\x20-\x7e]*$/.test(run.text) && (!run.parts || run.parts.every((part) => !part.text || /^[\x20-\x7e]+$/.test(part.text)))
        && (!run.pad || /^[\x20-\x7e]+$/.test(run.pad.text))) && /^[\x20-\x7e]*$/.test(design.rightPrompt), design.seed);
    }
  }
});

test('repairs stay within the height budget and band leaders move with their band', () => {
  const tall = createDesign({ seed: 'height/115', engine: 'surface', height: 3, label: 'a twenty-cell label.', complexity: 10 });
  assert.ok(tall.scene.rows <= 3 && tall.cursor <= 47);
  // A last line inherits the x of a stepped line above it.
  for (let i = 0; i < 600; i++) {
    const design = createDesign({ seed: `extreme/${i}`, engine: i % 2 ? 'surface' : 'prompt', height: 3, label: '12345678901234567890' });
    assert.ok(design.cursor <= 47 && design.scene.rows <= 3, `${design.seed}: cursor ${design.cursor}`);
  }
  // A fill whose end stayed behind when its band moved would end before it starts.
  const column = (a, width) => Math.trunc(a.at * (width - 1) / 1000) + a.offset;
  for (let i = 0; i < 40; i++) {
    const design = createDesign({ seed: `gap/${i}`, engine: i % 2 ? 'network' : 'assembly', height: 4, weight: 1, complexity: 6 });
    for (const run of design.scene.runs.filter((run) => run.end)) {
      for (const width of [79, 160]) assert.ok(column(run.end, width) > column(run.x, width), `${design.seed}: fill ends before it starts`);
    }
  }
});

test('compact prompts carry one textured idea, outside related text, rather than bare text', () => {
  let empty = 0, textured = 0, accents = 0;
  const n = 240;
  for (let i = 0; i < n; i++) {
    const design = compact(`v8-texture/${i}`);
    const { paint, traits, derivation } = design.program;
    const ops = new Set(derivation.accepted.map((p) => p.op));
    const canvases = paint.map((p) => p.canvas).filter(Boolean);
    // One idea: a one-row kind, its two-row partner where a strip joins a
    // tail, a bed, elbows, and quiet rhythms. Braille grit stays out, and
    // truchet meanders only appear two rows tall.
    assert.ok(canvases.every((kind) => ['bed', 'elbow', 'rhythm', traits.idea, traits.tall].includes(kind)), `${design.seed}: ${canvases}`);
    assert.ok(!canvases.some((kind) => ['wave', 'sprig'].includes(kind)) && !['wave', 'sprig', 'truchet'].includes(traits.idea), design.seed);
    for (const p of paint) if (p.canvas === 'truchet') assert.ok(ops.has('strip') && derivation.strip, `${design.seed}: truchet in one row`);
    // Texture never sits between clusters of one line.
    for (const line of derivation.lines) for (const id of line.clusters.slice(0, -1)) {
      assert.ok([null, 'rhythm', 'bed'].includes(paint[id].canvas), `${design.seed}: texture between related text`);
    }
    if (ops.has('bed')) assert.ok(!ops.has('strip') && canvases.every((kind) => ['bed', 'rhythm', 'elbow'].includes(kind)), `${design.seed}: more than one large gesture`);
    if (design.rightPrompt) {
      accents++;
      assert.ok(!ops.has('strip') && [...design.rightPrompt].length <= 12 && !/[\u2800-\u28ff]/u.test(design.rightPrompt), `${design.seed}: accent`);
      assert.equal(design.rightRuns.map((r) => r.text).join(''), design.rightPrompt);
    }
    if (!canvases.length && !ops.has('strip') && !design.rightPrompt) empty++;
    if (traits.idea !== 'rhythm') textured++;
  }
  assert.ok(empty < n * 0.05, `${empty} prompts without any deliberate idea`);
  assert.ok(textured > n * 0.6, `${textured} textured prompts`);
  assert.ok(accents > 0 && accents < n * 0.15, `${accents} accents`);
});

test('weight, ornament, and color never move a version-8 field or the input anchor', () => {
  for (let i = 0; i < 48; i++) {
    const design = compact(`v8-independent/${i}`);
    for (const weight of [0, 0.5, 1]) {
      const reweighted = createDesign({ ...recipe(design), weight });
      assert.equal(geometry(reweighted), geometry(design), `${design.seed}@${weight}`);
      if (weight === 0) assert.ok(reweighted.program.derivation.accepted.every((p) => p.op === 'bare'), `${design.seed}: weight 0 should leave text bare`);
    }
    const ornament = mutateDesign(design, 'v8', 'ornament');
    assert.equal(geometry(ornament), geometry(design));
    assert.deepEqual(ornament.program.derivation.accepted, design.program.derivation.accepted);
    const recolored = createDesign({ ...recipe(design), colors: undefined, colorProgram: undefined, colorSeed: 'other' });
    assert.equal(geometry(recolored), geometry(design));
  }
});

test('hugging compact prompts keep their cursor while the directory changes', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'promptly-v8-')));
  try {
    const short = join(root, 'a'), long = join(root, 'a-considerably-longer-directory', 'with', 'more', 'levels');
    mkdirSync(long, { recursive: true }); mkdirSync(short, { recursive: true });
    for (let i = 0; i < 6; i++) {
      const design = compact(`v8-live/${i}`);
      const lines = [short, long].map((cwd) => preview(design, { width: 100, color: false, cwd }).replace(/\n$/, '').split('\n'));
      // The marker stays put; a right-prompt accent may follow on its row.
      for (const rendered of lines) {
        assert.equal(rendered.length, design.scene.rows, design.seed);
        assert.equal([...rendered.at(-1)][design.cursor - 2], design.program.annotations.marker, `${design.seed}: input marker moved`);
        assert.equal([...rendered.at(-1)].slice(design.cursor).join('').trim(), design.rightPrompt, `${design.seed}: only the right accent follows command entry`);
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('version-8 art bands drop the universal rail and right ornament but keep both possible', () => {
  let rails = 0, rights = 0, partial = 0, attached = 0, embedded = 0;
  const n = 120;
  for (let i = 0; i < n; i++) {
    const network = createDesign({ seed: `v8-band/${i}`, engine: 'network' });
    const assembly = createDesign({ seed: `v8-band/${i}`, engine: 'assembly' });
    rails += network.program.inputLink.kind === 'rail';
    partial += network.program.extent.first > 0 || network.program.extent.last < network.program.lattice.planningColumns - 1;
    rights += Boolean(network.rightPrompt) + Boolean(assembly.rightPrompt);
    for (const design of [network, assembly]) {
      const { interactions, identity } = design.program;
      attached += interactions.attachments.length > 0;
      embedded += interactions.mode !== 'detached';
      assert.equal(identity.engine, 'role-relations/3');
      assert.ok(design.scene.runs.some((run) => run.kind === 'slot' && run.parts), `${design.seed}: band should hug its text`);
      assert.ok(design.cursor <= 49, `${design.seed}: cursor ${design.cursor}`);
    }
  }
  assert.ok(rails > n * 0.08 && rails < n * 0.4, `rails ${rails}`);
  assert.ok(partial > n * 0.2 && partial < n * 0.8, `partial spines ${partial}`);
  assert.ok(rights > 0 && rights < n * 2 * 0.2, `right ornaments ${rights}`);
  assert.ok(attached > 0 && embedded > n * 0.5, `attached ${attached}, embedded ${embedded}`);
});
