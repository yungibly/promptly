# Architecture / continuation notes

## Pipeline

`recipe -> primitive graph rewrites -> ornament expressions -> responsive cell scene -> zsh compiler -> standalone artwork`

- `src/random.js`: stable integer RNG seeded through SHA-256. Independent streams
  isolate palette, structure, and ornament choices.
- `src/primitives.js`: theme-free points, paths, translation, reflection, repetition,
  and an undirected connection graph. Atomic proposals declare attachment ports.
- `src/compose.js`: the default generator. Starts with a seeded route and recursively
  rewrites its segments using detour, loop, branch, fork, stitch, and repeat. The
  derivation records each operation's parent, depth, paths, and optional removal.
- `src/ornaments.js`: tiny expression trees: atom, sequence, enclosure, repetition,
  reflection. Independent alphabets give them character, without prescribing geometry.
- `src/grammars.js`: registry and the five classic layouts retained for compatibility.
- `src/scene.js`: ordered text/fill runs. X coordinates are `(per-mille anchor,
  column offset)`. Rows are discrete. A fill's end is exclusive; text supports
  left/center/right alignment. A wire run connects two affine vertices and carries a
  material's 16-glyph connection table. Later text overpaints wires, including spaces.
- `src/compile.js` and `src/runtime.zsh`: compile scene geometry into calls against
  a temporary zsh cell canvas. Paint, merge colors, then construct normal `PROMPT`
  and `RPROMPT` values using zsh's native color escapes. Wire strokes union four
  direction bits per cell; the final mask selects a cap, corner, tee, or crossing.
  Junctions therefore agree with the actual viewport, including after resize.
- `src/preview.js`: executes the same source in `zsh -f`; no separate art renderer.
- `bin/promptly.js`: human/agent CLI, JSON recipes, preview, mutation, export.

The top decoration is a multiline left prompt spanning the usable width. The input
row has an ordinary short left prompt and a native right prompt. This lets zsh
handle input wrapping and hide the right ornament when typing reaches it. Nothing
paints into the editable buffer or moves the cursor manually.

## Runtime contract

The standalone file needs only zsh builtins and standard autoloaded hook helpers.
It never reads cwd, time, exit status, Git, or network state. Its only changing
input is `COLUMNS`. Geometry is cached until the width changes; `precmd` and the
`line-pre-redraw` ZLE hook rebuild when needed. A fixed `PROMPT_SUBST` expression
prints the cached frame from a zsh subshell (no external executable). On SIGWINCH,
zsh re-expands the prompt before calling the redraw widget; that expansion also
checks width and can rebuild in the subshell. This avoids replacing any user
signal trap. No animation loop. The small shell fork on prompt expansion is the
intentional tradeoff for correct live resize and signal-handler coexistence.

Known zsh/terminal behavior: drastic shrinking of a multiline prompt can leave
pieces of its previously printed rows above the active prompt as the terminal
reflows history. The active prompt and editable buffer reflow correctly; Ctrl+L
repaints a clean screen. We deliberately do not clear the user's visible command
output automatically on every resize. Terminal tests check buffer survival before
Ctrl+L and exact scene parity after it. A future redraw strategy should improve
the visual remnants without clearing command output or hijacking signal traps.

Reserve one terminal column to prevent autowrap. Full art starts at 80 columns;
28–79 columns use a two-line compact inscription, and smaller windows get a tiny
input marker. Bound canvas work to 1000 columns. Every drawn glyph must occupy
one terminal cell, without combining marks, emoji sequences, or control characters.
ASCII mode preserves geometry using one-character substitutions.

Local measurement on the development Mac (120 columns, complexity-5 xenoweave,
100 iterations): about 4.7 ms to rebuild and 0.7 ms for a cached prompt expansion.
The exported specimen is about 13 KB. These are observations, not performance
guarantees; keep future growth proportional to width and bounded ornament count.

Sourcing stores the original `PROMPT`, `RPROMPT`, `PS2`, and three prompt expansion
options once. Re-sourcing a different artifact replaces only Promptly's own hooks
and renderer. `promptly_off` removes those hooks and restores saved values. Promptly
uses `PROMPT_PERCENT` / `PROMPT_SUBST` and disables `PROMPT_BANG` while active.
Other prompt managers actively assigning PROMPT in their own hooks may conflict;
this first version is intended to own the prompt in a shell.

All inscriptions are validated static ASCII text; user seed data is JSON-escaped
in a comment. No shell eval. The IR does not accept arbitrary code or terminal
escape sequences. Version 1 recipes retain the classic grammar fields. Version 2
adds resolved material, alphabet, symmetry, height, density, and ornament seed for
the compose engine. The engine implementation is `graph-rewrite/1`. Seed stability
is guaranteed for a generator revision, not across future algorithm revisions.

## Composition mechanics

Plan on a 41-column logical lattice with 3–11 artwork rows and a separate safe
input row. Labels reserve a conservative area at the 80-column full-art breakpoint.
The initial route meanders across the lattice. Every rewrite selects an existing
horizontal segment, declares contact ports, and proposes paths. Commit only if
new cells fit the bounds and avoid reservations and unrelated graph cells. A detour
can remove an old segment only when it would not detach any existing branch.
Loops/reconnections intentionally add cycles; other proposals add branches or
replace routes. Repetition translates small paths; mirror reflects the entire
derived half-graph. Subdivision, enclosure, and nested branching emerge through
successive small operations, including operations on earlier operations' output.

Each specimen samples rule weights, vertical size, occupancy target, and symmetry.
Complexity controls the rewrite budget, attempts, and detail budget. Density is a
stopping target, not a promise of an exact filled percentage: one atomic rewrite
may cross it, or growth may exhaust available space. A hard attempt budget bounds
generation. Connectivity, accepted-proposal validity, ancestry, recursion, and
diversity are covered by replaying 64 seeded derivations in the tests.

Line material is a connection-mask lookup, not geometry. An alphabet is an atom/
delimiter/separator vocabulary, not a layout. Ornament trees recurse under a cell
budget and are placed at terminals, inside simple runs, or in unoccupied regions.
The current implementation is rectilinear: diagonal geometry and truly curved
routes are future primitives, not merely new glyph alphabets. Reflection currently
applies to topology; inscriptions deliberately need not be symmetric.

RNG streams are separate for structure, detail, palette, and each trait. Explicitly
overriding one trait never consumes another trait's random choices. Recipe values
freeze resolved art direction. `mutate --scope ornament` changes only the detail
seed; the full structural derivation stays identical. `--scope structure` changes
the graph seed while retaining the detail seed (placement still follows available
space in the changed graph). The default `all` varies both seeds.

`inspect --program` emits the recipe plus traits, derivation, ornament ASTs, and
statistics: vertices, edges, cycles, components, junctions, depth, and operation
counts. That diagnostic envelope is separate from the reloadable ordinary recipe.

## Verification

Unit/integration tests cover deterministic recipes, mutation, independent palette
selection, narrow/wide geometry, ASCII parity, literal shell data, runtime with
an empty PATH, source/disable lifecycle, width caching, and CLI file replacement.
Use `npm run examples` to keep `.json` and compiled `.zsh` specimens in sync.

Terminal verification uses the official `tui-test` `0.1.0-beta.5` macOS ARM64
release with `--backend ghostty`. All commands for a session run in a single
long-lived test process; in sandboxed tool environments the daemon may be cleaned
up when its owning tool process exits. The daemon needs permission to create local
IPC sockets. A clean `ZDOTDIR` prevents loading the user's zshrc.

Previews honor `NO_COLOR`; the agent execution environment may set it. Clear that
variable in the test terminal when capturing color galleries. Screenshot font
coverage is narrower than some real Ghostty font configurations: the initial
capture could not draw U+27D0/U+27E1, so replace those with supported diamonds.

## Next experiments

- Additional primitives: diagonal strokes, masks, rotations, sparse disconnected
  particle fields, non-rectangular enclosures. Preserve explicit contact semantics.
- A terminal exploration interface that supports keeping and mutating specimens.
- Palette interpolation with a dark/light contrast model.
- Optional slow variation per prompt, only if exported runtime stays self-contained
  and stable during editing. Do not add background animation or shell indicators.
- If a future recipe gains custom text/glyph input, implement real terminal cell
  width and safe truncation first. Current glyphs are deliberately curated.

Primary references: [zsh prompt expansion](https://zsh.sourceforge.io/Doc/Release/Prompt-Expansion.html)
and [tui-test CLI](https://github.com/microsoft/tui-test#cli-reference).

## First visual baseline

`docs/gallery.png` is the real Ghostty-backend capture of `first-contact/1` through
`first-contact/5`, at 120 columns and complexity 5. The tracked signal example
uses complexity 3 for a shorter everyday version; the gallery deliberately shows
the maximum ornament budget. The first release passes 14 generator/runtime tests
and 68 terminal assertions. Captures and the machine-readable terminal report are
regenerated under `artifacts/terminal/` by `npm run test:terminal`.

## Primitive engine baseline

`docs/primitives.png` captures five `possibility` descendants, complexity 7 and
height 6, with independently seeded surfaces. `examples/compose.json` preserves
the first descendant's natural 12-row version. The primitives release adds
replayable growth, recursive ornaments, real junctions, trait controls, scoped
mutation, and version-2 recipes. This baseline passes 25 generator/runtime tests
and 77 Ghostty terminal assertions, including resize and ASCII rendering of the new
engine. The property tests replay 64 structurally distinct connected derivations.
