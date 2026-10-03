# Architecture / continuation notes

## Pipeline

`recipe -> spatial partitions + recursive cell art -> ornament expressions -> responsive cell scene -> zsh compiler -> standalone artwork`

- `src/random.js`: stable integer RNG seeded through SHA-256. Independent streams
  isolate palette, structure, and ornament choices.
- `src/primitives.js`: theme-free points, paths, translation, reflection, repetition,
  and an undirected connection graph. Atomic proposals declare attachment ports.
- `src/marks.js`: small cell-art algebra: stroke (including diagonals), mark, pixel,
  text slot, group, translation, reflection, repetition, clipping, and subtraction.
  Geometry is rasterized during generation, then emitted into the shared cell IR.
- `src/assembly.js`: the default generator. Partitions a seeded spatial region,
  generates independent recursive pieces, optionally links eligible neighbors,
  decorates them, and removes unused vertical margins. No mandatory backbone.
- `src/gallery.js`: deterministic farthest-point selection over geometric features;
  palettes and alphabets do not substitute for different silhouettes.
- `src/compose.js`: the opt-in network generator. Starts with a seeded route and recursively
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

The top decoration occupies a multiline left prompt canvas. The input
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
`graph-rewrite/1`. Version 3 selects `spatial-assembly/1` and adds engine, spread,
fragments, and connectivity. Loading version 2 still selects the unchanged network
generator. Resolved recipe values freeze all sampled controls. A regression test
hashes the previous network scene and derivation, independently of runtime source.

## Spatial assembly mechanics

The failure mode of the previous default was structural: every prompt began with
a line crossing the canvas. More rewrites could produce intricate networks, but
could never produce a scattered field or independent sculptures. Keep the old
engine available, but do not reintroduce its global connectivity invariant here.

Plan on 79 columns (the usable cells at the 80-column full-art breakpoint). The
seed independently chooses horizontal extent, focus, region-count target, optional
mirror symmetry, and row budget. Recursive binary partitions keep region bounds
disjoint, with gutters. Pieces occupy variable portions of those regions. A target
can exceed what fits; mirror rounds an odd count upward. Spread maps to a region
12–76 columns wide. These are composition controls, not full-prompt templates.

The geometry vocabulary is sampled independently for every specimen. Zero weights
can exclude strokes, text, or textures completely. Leaves produce straight or
diagonal segments, bounded inscription slots, scattered marks, sampled contours,
waves, bar profiles, or scalar texture fields. These generators lower to a small
AST of strokes, marks, pixels, and text slots. Recursion layers, repeats, reflects,
subdivides, cuts, and insets them. For example, a repeated child can itself contain
a cut reflected contour and an inscription. Integer sampling gives these forms
their intentionally angular appearance.

The AST interpreter merges stroke directions, preserves deliberate overlays, and
applies local masks before affine placement. Text slots receive budgeted ornament
expressions after geometry. A cut through a slot splits it into independent
intervals; decoration cannot silently refill the cut. Negative space can consume
an entire piece. If every piece is empty, a recorded mark keeps the artwork nonempty.

Each piece retains its cell proportions as the terminal widens. Its center moves
with a width-relative anchor; its cells use fixed offsets. Gaps expand monotonically,
so disjoint bounds at 80 columns remain disjoint at larger widths. Connections are
optional straight strokes between facing structural cells on a common row. They
cannot pass through another piece's reserved rectangle. The input inscription is
independent; there is no compulsory vertical rail down to it. RPROMPT may be omitted.

Height is a budget rather than a promise to consume every row. After placement,
remove unused top/bottom rows and collapse multiple blank rows to one. `rowMap`
records planning-to-display coordinates; the derivation retains planning geometry.
This avoids ten-row prompts whose only art is two widely separated tiny marks.
Connectivity, spread, and fragmentation are separate from detail complexity.

`inspect --program` exposes region splits, piece ASTs, links, row mapping, ornament
expressions, vocabulary weights, and measured primitive counts. Geometry and detail
use separate RNG streams. Surface overrides or an ornament mutation retain the
same derivation. Version 3 preserves all resolved controls in its ordinary recipe.

Galleries choose diverse geometries from a pool of eight candidates per requested
specimen. Start with seed `/1`, then greedily maximize distance from the closest
selected specimen. Features include spatial occupancy, row count, span, region
count, link presence, and proportions of stroke/pixel/mark/text cells. Sampling is
deterministic; all displayed seeds can be generated directly. This is curation of
procedural results, not a bank of saved designs.

## Network engine mechanics (version 2)

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
This engine is rectilinear; assembly supplies diagonal and sampled contour geometry.
Reflection in the network engine
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

- Additional transforms: arbitrary rotations with terminal aspect correction,
  nonlinear deformation, and multiple scales of recursive spatial subdivision.
- Richer texture/raster bases and continuous palette variation. Do not couple
  these to named whole-prompt templates or universal connecting strokes.
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
height 6, with independently seeded surfaces. `examples/network.json` preserves
the first descendant's natural 12-row version. The primitives release adds
replayable growth, recursive ornaments, real junctions, trait controls, scoped
mutation, and version-2 recipes. This baseline passes 25 generator/runtime tests
and 77 Ghostty terminal assertions, including resize and ASCII rendering of the new
engine. The property tests replay 64 structurally distinct connected derivations.

## Spatial assembly baseline

`docs/assembly.png` is the actual Ghostty capture of six geometrically selected
`possibility` descendants at complexity 8, 120 columns, and their natural row
budgets. It includes sparse inscriptions, repeated diagonal figures, raster
textures, optional links, and layered independent contours. `examples/compose.*`
stores `possibility/43`; `examples/network.*` preserves the former default.

This release passes 32 automated tests and 98 Ghostty assertions. The terminal
suite sources all six gallery specimens as real prompts as well as rendering the
gallery, and checks editing, wrapping, continuation, exit status, restoration,
ASCII output, and live resize. A 256-seed complexity-8 sample includes 211 unlinked
designs, 34 programs without strokes, 98 with texture pixels, 49 short designs
(2–3 rows), and 79 tall ones (8+ rows). These overlapping counts are regression
evidence for different kinds of composition, not just unique random strings.
Reservation tests cover 128 further seeds at widths from 80 through 1000 columns.

Current constraints: geometry is static, terminal-cell based, and deliberately
angular. A high complexity budget permits recursion but does not force dense art.
Fragments keep fixed local proportions as terminal gaps expand. Tiny terminals
still use the shared compact fallback. Drastic shrink can still leave old art in
terminal scrollback; active input remains correct, as described above.
