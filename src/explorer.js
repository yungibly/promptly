import { emitKeypressEvents } from 'node:readline';
import { readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { compile } from './compile.js';
import { preview } from './preview.js';
import { fromRecipe } from './design.js';
import { createExplorerState, explorerAction, explorerFragments } from './exploration.js';
import { fragmentAnchor } from './assembly.js';

const enterScreen = '\x1b[?1049h\x1b[?25l';
const leaveScreen = '\x1b[0m\x1b[?25h\x1b[?1049l';
// Metadata can contain arbitrary seed/path text. Keep it printable and one-cell;
// the actual prompt renderer still handles live Unicode username/directory text.
const safe = (text) => [...String(text)].map((char) => /^[\x20-\x7e]$/.test(char) ? char : `\\u{${char.codePointAt(0).toString(16)}}`).join('');
const fit = (text, width) => safe(text).length <= width ? safe(text) : safe(text).slice(0, Math.max(0, width - 3)) + '.'.repeat(Math.min(3, width));
const focusedDesigns = new WeakMap();

// Focus is a preview-only copy. Recipes, favorite saves and exports always use
// state.current, so exploring a piece cannot alter the generated prompt.
function focusFragment(design, id) {
  let fragments = focusedDesigns.get(design);
  if (!fragments) focusedDesigns.set(design, fragments = new Map());
  if (!fragments.has(id)) {
    const dim = design.colors.length;
    fragments.set(id, { ...design, colors: [...design.colors, '#505663'], scene: { ...design.scene,
      runs: design.scene.runs.map((run) => run.fragmentId && run.fragmentId !== id ? { ...run, ink: dim } : run),
    } });
  }
  return fragments.get(id);
}

function fragmentBounds(design, fragment, width) {
  if (!fragment) return '';
  if (width < 80) return 'art hidden below 80 columns';
  const pieces = design.program?.derivation?.pieces?.filter((piece) => piece.fragmentId === fragment.id) ?? [];
  const bounds = pieces.map(({ rect }) => {
    const x = fragmentAnchor(rect);
    const column = Math.floor(x.at * (width - 2) / 1000) + x.offset + 1;
    const row = (design.program.rowMap?.[rect.y] ?? rect.y) + 1;
    return `r${row}:c${column} ${rect.width}x${rect.height}`;
  });
  const hasInk = design.scene.runs.some((run) => run.fragmentId === fragment.id && /\S/.test(run.text));
  return [hasInk ? '' : 'empty reservation', ...bounds].filter(Boolean).join(' | ');
}

function readFavorites(file) {
  if (!file) return [];
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(saved)) throw new Error('Favorites must be a JSON array of recipes.');
    return saved;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new Error(`Cannot load favorites: ${error.message}`);
  }
}

function saveFavorites(file, favorites) {
  const destination = resolve(file);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  mkdirSync(dirname(destination), { recursive: true });
  try {
    writeFileSync(temporary, JSON.stringify(favorites, null, 2) + '\n', { flag: 'wx' });
    renameSync(temporary, destination);
  } finally {
    try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

/** Compose UI around the native exported-zsh preview, without drawing the art. */
export function explorerFrame(state, view, { columns = 100, rows = 24, color = true, render = preview, favoritesFile, out } = {}) {
  columns = Math.max(1, Math.min(1000, Math.trunc(columns || 100)));
  rows = Math.max(1, Math.trunc(rows || 24));
  const line = (text, tone) => {
    const clipped = fit(text, Math.max(1, columns - 2));
    return color && tone ? `\x1b[${tone}m${clipped}\x1b[0m` : clipped;
  };
  if (columns < 50 || rows < 14) {
    const lines = [line('PROMPTLY / explore', '1'), '', line('Enlarge the terminal to at least 50 x 14.'), line('The current design and pins are retained.'), '', line('q quit | e export current')];
    return { text: lines.slice(0, Math.max(1, rows - 1)).join('\r\n'), previewRows: 0, visibleRows: 0 };
  }
  const favoriteIndex = Math.max(0, Math.min(state.favorites.length - 1, view.favoriteIndex ?? 0));
  const reference = state.favorites[favoriteIndex];
  const comparison = !!view.comparison && !!reference;
  const displayed = comparison ? fromRecipe(reference) : state.current;
  const width = columns - 4;
  const pieces = explorerFragments(state.current);
  const fragmentIndex = Math.max(0, Math.min(pieces.length - 1, view.fragmentIndex ?? 0));
  const fragment = pieces[fragmentIndex];
  const focused = !!view.focus && !!fragment && !comparison;
  const controls = columns >= 100 ? [
    'Space reroll | s shape | l layout | c colors | Up/Down focus fragment | p pin | v full/focus',
    'f save | [/] browse | Tab compare | Enter use | PgUp/Dn scroll | e export | q quit',
  ] : [
    'Space reroll | s shape | l layout | c colors',
    'Up/Down focus | p pin | v full/focus | f save',
    '[/] browse | Tab compare | Enter use',
    'PgUp/Dn scroll | e export | q quit',
  ];
  // Leave the bottom terminal row unused to prevent wrapping/scrolling the UI.
  const visibleRows = Math.max(1, rows - 10 - controls.length);
  const art = render(focused && color ? focusFragment(displayed, fragment.id) : displayed, { width, color }).replace(/\n$/, '').split('\n');
  const scroll = Math.max(0, Math.min(view.scroll ?? 0, art.length - visibleRows));
  const pins = ['shape', 'layout', 'colors'].map((name) => `${name} ${state.pins[name] ? 'PINNED' : 'open'}`).join('   ');
  const fragmentText = fragment ? `Fragment ${fragmentIndex + 1}/${pieces.length}: ${fragment.label}  ${state.pins.fragments.includes(fragment.id) ? '[PINNED]' : '[open]'}${focused ? ' FOCUS' : ''} | ${fragmentBounds(state.current, fragment, width)}` : 'Fragments: select an assembly design to pin individual pieces';
  const favoriteText = state.favorites.length ? `Favorites ${state.favorites.length} | Reference ${favoriteIndex + 1}: ${reference.seed} | Tab switches views` : `Favorites 0 | f keeps a design ${favoritesFile ? 'in your favorites file' : 'for this session'}`;
  const heading = comparison ? `REFERENCE ${favoriteIndex + 1}/${state.favorites.length} | Enter adopts it; e exports CURRENT` : 'CURRENT | Space rolls another design; pinned parts stay';
  const detail = `${displayed.engine ?? displayed.style} | seed ${displayed.seed} | complexity ${displayed.complexity} | ${displayed.scene.rows} rows`;
  const status = view.message || (art.length > visibleRows ? `Preview rows ${scroll + 1}-${Math.min(art.length, scroll + visibleRows)} of ${art.length}; PgUp/PgDn scroll` : out ? `Export destination: ${out}` : 'Export writes sourceable zsh to stdout and closes the explorer.');
  const lines = [line(`PROMPTLY / explore    ${heading}`, '1'), line(detail, '38;2;150;160;180'), ''];
  for (const row of art.slice(scroll, scroll + visibleRows)) lines.push(`  ${row}${color ? '\x1b[0m' : ''}`);
  while (lines.length < visibleRows + 3) lines.push('');
  lines.push('', line(`Pins: ${pins}`, '38;2;115;212;208'), line(fragmentText), line(favoriteText, '38;2;150;160;180'));
  lines.push(...controls.map((text) => line(text, '38;2;150;160;180')), line(status));
  return { text: lines.slice(0, rows - 1).join('\r\n'), previewRows: art.length, visibleRows };
}

/** Run the optional UI. Only the returned export belongs on stdout. */
export async function runExplorer({ design, options = {}, favoritesFile, out, force = false, color = true,
  input = process.stdin, screen = process.stderr, signals = process, render = preview } = {}) {
  if (!input.isTTY || !screen.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('Explore needs an interactive terminal on stdin and stderr. Use promptly export for scripts.');
  }
  if (out && favoritesFile && resolve(out) === resolve(favoritesFile)) throw new Error('Export and favorites must use different files.');
  let state = createExplorerState({ design, options, favorites: readFavorites(favoritesFile) });
  const view = { fragmentIndex: 0, favoriteIndex: 0, comparison: false, focus: false, scroll: 0, message: '' };
  const cached = new WeakMap();
  const renderCached = (candidate, settings) => {
    let sizes = cached.get(candidate);
    if (!sizes) cached.set(candidate, sizes = new Map());
    const key = `${settings.width}/${settings.color}`;
    if (!sizes.has(key)) sizes.set(key, render(candidate, settings));
    return sizes.get(key);
  };
  let frame;
  let done = false, entered = false;
  const wasRaw = !!input.isRaw, wasFlowing = input.readableFlowing === true;
  return new Promise((resolveRun, rejectRun) => {
    const cleanup = () => {
      input.removeListener('keypress', onKey);
      input.removeListener('end', onEnd);
      input.removeListener('error', onError);
      screen.removeListener('resize', onResize);
      screen.removeListener('error', onError);
      for (const [name, listener] of signalListeners) signals.removeListener(name, listener);
      let failure;
      try { input.setRawMode(wasRaw); } catch (error) { failure = error; }
      // A fresh process.stdin is neither flowing nor explicitly paused. Leaving
      // it resumed would keep the CLI alive after restoring the terminal.
      if (!wasFlowing) input.pause();
      try { if (entered) screen.write(leaveScreen); } catch (error) { failure ??= error; }
      if (failure) throw failure;
    };
    const finish = (result, error) => {
      if (done) return;
      done = true;
      try { cleanup(); } catch (failure) { error ??= failure; }
      if (error) rejectRun(error);
      else resolveRun(result);
    };
    const redraw = () => {
      if (done) return;
      frame = explorerFrame(state, view, { columns: screen.columns, rows: screen.rows, color, render: renderCached, favoritesFile, out });
      // Clear each old row as well as the tail: a shorter seed, fragment or art
      // line must not leave pixels from the previous frame behind.
      screen.write(`\x1b[H\x1b[2J${frame.text}\x1b[J`);
    };
    const onError = (error) => finish(null, error);
    const onEnd = () => finish({ type: 'quit' });
    const onResize = () => { try { redraw(); } catch (error) { onError(error); } };
    const signalListeners = [
      ['SIGINT', () => finish({ type: 'quit', exitCode: 130 })],
      ['SIGTERM', () => finish({ type: 'quit', exitCode: 143 })],
      ['SIGHUP', () => finish({ type: 'quit', exitCode: 129 })],
      ['exit', () => { if (!done) { done = true; try { cleanup(); } catch { /* Process is already exiting. */ } } }],
    ];
    const onKey = (text, key = {}) => {
      if (done) return;
      if (key.ctrl && key.name === 'c') return finish({ type: 'quit', exitCode: 130 });
      if (key.ctrl && key.name === 'd' || key.name === 'escape' || text === 'q') return finish({ type: 'quit' });
      if (key.ctrl || key.meta) return;
      try {
        view.message = '';
        const letter = text?.toLowerCase();
        if (key.name === 'space' || text === ' ' || letter === 'r') {
          state = explorerAction(state, { type: 'reroll' });
          Object.assign(view, { comparison: false, scroll: 0, fragmentIndex: Math.min(view.fragmentIndex, Math.max(0, explorerFragments(state.current).length - 1)) });
        } else if (['s', 'l', 'c'].includes(letter)) {
          const target = { s: 'shape', l: 'layout', c: 'colors' }[letter];
          state = explorerAction(state, { type: 'pin', target });
          view.comparison = false;
          view.message = `${target[0].toUpperCase() + target.slice(1)} ${state.pins[target] ? 'pinned' : 'released'}.`;
        } else if (key.name === 'up' || key.name === 'down') {
          const count = explorerFragments(state.current).length;
          if (count) {
            view.fragmentIndex = (view.fragmentIndex + (key.name === 'down' ? 1 : -1) + count) % count;
            view.focus = true;
          }
          view.comparison = false;
        } else if (letter === 'v') {
          view.focus = !view.focus;
          view.comparison = false;
          if (!color && view.focus) view.message = 'Fragment dimming needs color; its bounds are shown above.';
        } else if (letter === 'p') {
          const fragment = explorerFragments(state.current)[view.fragmentIndex];
          if (fragment) {
            state = explorerAction(state, { type: 'pin', target: 'fragment', id: fragment.id });
            view.message = `${fragment.label} ${state.pins.fragments.includes(fragment.id) ? 'pinned' : 'released'}.`;
          } else view.message = 'Individual fragment pins are available for assembly designs.';
          view.comparison = false;
        } else if (letter === 'f') {
          const next = explorerAction(state, { type: 'favorite' });
          if (favoritesFile) saveFavorites(favoritesFile, next.favorites);
          const added = next.favorites.length > state.favorites.length;
          state = next;
          if (added) view.favoriteIndex = state.favorites.length - 1;
          view.message = added ? `Favorite ${state.favorites.length} saved${favoritesFile ? ` to ${favoritesFile}` : ' for this session'}.` : 'This design is already saved, or the favorites library is full.';
        } else if (text === '[' || text === ']' || key.name === 'left' || key.name === 'right') {
          const count = state.favorites.length;
          if (count) {
            const direction = text === '[' || key.name === 'left' ? -1 : 1;
            view.favoriteIndex = (view.favoriteIndex + direction + count) % count;
            view.comparison = true; view.scroll = 0;
          } else view.message = 'Press f to keep a favorite first.';
        } else if (key.name === 'tab') {
          if (state.favorites.length) { view.comparison = !view.comparison; view.scroll = 0; }
          else view.message = 'Press f to keep a favorite first.';
        } else if (key.name === 'return') {
          if (view.comparison && state.favorites.length) {
            state = explorerAction(state, { type: 'load-favorite', index: view.favoriteIndex });
            Object.assign(view, { comparison: false, focus: false, scroll: 0, fragmentIndex: 0, message: 'Favorite is now current. Pins cleared.' });
          }
        } else if (key.name === 'pageup' || key.name === 'pagedown') {
          const amount = Math.max(1, (frame?.visibleRows ?? 1) - 1);
          view.scroll = Math.max(0, Math.min(Math.max(0, (frame?.previewRows ?? 1) - (frame?.visibleRows ?? 1)), view.scroll + (key.name === 'pagedown' ? amount : -amount)));
        } else if (letter === 'e') {
          const source = compile(state.current);
          if (out) {
            const destination = resolve(out);
            mkdirSync(dirname(destination), { recursive: true });
            writeFileSync(destination, source, { flag: force ? 'w' : 'wx' });
            return finish({ type: 'export', path: destination });
          }
          return finish({ type: 'export', source });
        } else return;
      } catch (error) {
        view.message = error.code === 'EEXIST' ? 'Output file already exists. Quit and use --force to replace it.' : `Could not complete that action: ${error.message}`;
      }
      try { redraw(); } catch (error) { onError(error); }
    };
    try {
      emitKeypressEvents(input);
      input.on('keypress', onKey);
      input.on('end', onEnd);
      input.on('error', onError);
      screen.on('resize', onResize);
      screen.on('error', onError);
      for (const [name, listener] of signalListeners) signals.on(name, listener);
      input.setRawMode(true);
      entered = true;
      screen.write(enterScreen);
      redraw();
      input.resume();
    } catch (error) { onError(error); }
  });
}
