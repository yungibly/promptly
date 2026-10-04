# Architecture / continuation notes

## Pipeline

`seed/options -> engine + footprint sampling -> primitive program -> ornament expressions -> responsive cell scene -> zsh compiler -> standalone prompt`

- `src/random.js`: stable integer RNG seeded through SHA-256. Independent streams
  isolate palette, structure, and ornament choices.
- `src/primitives.js`: theme-free points, paths, translation, reflection, repetition,
  and an undirected connection graph. Atomic proposals declare attachment ports.
- `src/marks.js`: small cell-art algebra: stroke (including diagonals), mark, pixel,
  text slot, group, translation, reflection, repetition, clipping, and subtraction.
  Geometry is rasterized during generation, then emitted into the shared cell IR.
- `src/design.js`: automatic engine sampling, compatible controls, resolved traits,
  versioned recipes, and scoped mutation. Automatic mode is a selection policy.
- `src/relations.js`: the version-6 role composer. Protected text intervals form
  relation trees; atomic treatments can attach to individual roles or groups.
  One visual-weight budget controls paint and edges independently of complexity.
- `src/relations-v7.js`: compatible body/accent layers, independent side ends,
  protected surface cutouts, and motifs around role intervals.
- `src/interactions.js`: structural artwork ports, protected text masks, and
  optional attachments/occlusion. Overlays never delete the underlying graph.
- `src/motifs.js`: shared stroke rhythms with graded shortening, shifting,
  thinning, and fragmentation inside fixed bounds.
- `src/exploration.js`: deterministic rerolls, local pins, and favorite recipes.
- `src/explorer.js`: optional terminal UI, native zsh previews, explicit favorites
  persistence, and source export. Cursor controls are confined to this CLI UI.
- `src/prompt.js` and `src/surface.js`: frozen version-4 compact and version-5
  surface generators, retained for saved recipes. Their shape catalogues no longer
  determine fresh compact compositions.
- `src/role-band.js`: attaches the shared role composer to larger artwork.
- `src/identity.js`: retains the older identity behavior for compatibility and
  supplies the narrow fallback.
- `src/chromatic.js`: continuous OKLCH color relationships, gamut mapping, and
  contrast checks. Named color streams are independent of geometry and detail.
- `src/palettes.js`: seventeen optional named color bookmarks and contrast ink for
  filled text. Existing collections are unchanged for recipe compatibility.
- `src/assembly.js`: freeform composition. Partitions a seeded spatial region,
  generates independent recursive pieces, optionally links eligible neighbors,
  and decorates them. Version 7 compacts reserved regions rather than painted
  occupancy so local rerolls retain placement and intentional empty cells.
- `src/gallery.js`: balances engine representation, then deterministically selects
  distant specimens using geometric features;
  palettes and alphabets do not substitute for different silhouettes.
- `src/compose.js`: the network generator. Starts with a seeded route and recursively
  rewrites its segments using detour, loop, branch, fork, stitch, and repeat. The
  derivation records each operation's parent, depth, paths, and optional removal.
- `src/ornaments.js`: tiny expression trees: atom, sequence, enclosure, repetition,
  reflection. Independent alphabets give them character, without prescribing geometry.
- `src/grammars.js`: registry and the five classic layouts retained for compatibility.
- `src/scene.js`: ordered text/fill runs. X coordinates are `(per-mille anchor,
  column offset)`. Rows are discrete. A fill's end is exclusive; text supports
  left/center/right alignment. A wire run connects two affine vertices and carries a
  material's 16-glyph connection table. Fixed-width slots reserve live text roles.
  Ink can be a palette index or a foreground/background pair. Later text overpaints
  wires, including spaces; spaces with a background are occupied artwork.
- `src/flatten.js`: resolve ordered overlays and wire junctions into colored spans
  in JavaScript. Span boundaries retain affine anchors; wire masks are resolved
  before export, including width-dependent intersections and clipping.
- `src/compile.js`: lower spans to literal prompt text and zsh padding expressions.
  Resolve widths 1–1000 during generation, coalesce adjacent widths with identical
  string plans, and share repeated rows when that reduces output size. This moves
  work into the CLI; exported prompts contain no drawing interpreter.
  Version 7 uses a balanced arithmetic width selector to avoid zsh stack limits
  when overlapping anchors produce many width transitions; older source stays exact.
- `src/runtime.zsh`: small installation/undo wrapper for those strings. Native
  parameter expansion selects the width case and pads its gaps without a fork.
- `src/preview.js`: executes the same source in `zsh -f`; no separate art renderer.
- `bin/promptly.js`: human/agent CLI, JSON recipes, preview, mutation, export.

## Version 7 component composition and exploration

Fresh composed recipes resolve `artSeed`, `layoutSeed`, `roleSeed`, `motifSeed`,
`interactionSeed`, and `fragmentSeeds`. Main seeds remain bounded at 256
characters; component seeds allow 512 characters for derived fragment names.
Saved versions 1–6 use their frozen paths. Twelve version-6 source/scene hashes
cover all four engines and glyph modes in `test/fixtures/v6-baseline.json`.

`layoutSeed` controls assembly partitions and fragment rectangles. Each logical
piece has a `piece:N` ID and its own seed; reflected partners share that ID.
Piece geometry and detail streams cannot consume a neighbor's RNG state. Row
compaction follows reservations rather than occupied cells, preserving pinned
positions and the negative space of partially erased fragments. Optional bridges
require facing occupied rectangle-boundary ports and paint only the gap. Artwork
runs carry `fragmentId` metadata for temporary explorer focus; compilation ignores
this metadata.

The role and interaction seeds choose field placement before artwork occupancy
is consulted. Connections can be rejected without moving a field. Explicit
padding masks protect live text while the original network graph stays intact.
Compact body and accent proposals can coexist when their cells and global weight
budget permit it. Left and right surface ends vary independently; surface masks
only subtract gaps between fields, never any live character reservation.

The explorer is a generator-side process. It uses the same native-zsh preview
as every other path and restores terminal raw mode, screen state, and handlers
on export, quit, interrupts, and errors. UI goes to stderr; stdout contains only
an explicitly exported prompt. Favorite files are opt-in JSON recipe arrays,
written atomically; prompt exports use exclusive creation unless forced.

Without local pins, rerolls resample the full automatic space subject to explicit
CLI controls. Shape pins retain all component geometry. Layout pins hold field
positions while artwork changes. Fragment pins hold the composition frame,
role masks, motif, and detail seed, then resample only unpinned fragment seeds.
Color pins preserve resolved color values. Favorites save the complete resulting
recipe, including independently rerolled pieces; loading a favorite clears pins.
Reference comparison never silently changes the current export target.

The top decoration occupies a multiline left prompt canvas. The input
row has an ordinary short left prompt and a native right prompt. This lets zsh
handle input wrapping and hide the right ornament when typing reaches it. Nothing
paints into the editable buffer or moves the cursor manually.

## Runtime contract

The standalone file needs only zsh builtins. Geometry responds to `COLUMNS`;
username and current directory use native `%n` and `%~` prompt escapes. It never
reads time, exit status, Git, or network state. `PROMPT_SUBST` selects precompiled
strings and evaluates only parameter padding and integer arithmetic. Native prompt
truncation and `%(l..)` conditions keep live fields inside fixed cell reservations.
There are no drawing loops, prompt callbacks, redraw widgets, signal traps, or
command substitutions. zsh's own SIGWINCH prompt expansion immediately recalculates
the gaps, so resizing does not need a cached canvas or a shell subprocess.

The `(e)` flag expands compiler-authored padding expressions stored in strings.
Escape literal dollar signs, backticks, and backslashes for exactly that expansion;
escape percent signs for zsh's subsequent prompt expansion. Shared row expressions
are explicitly expanded once at the leaf. Never insert recipe fields as shell code.
Regression tests compare visible cells and colors against the frozen v0.5.1 zsh
renderer in `test/fixtures`, including overlapping patterns and shell metacharacters.

Known zsh/terminal behavior: drastic shrinking of a multiline prompt can leave
pieces of its previously printed rows above the active prompt as the terminal
reflows history. The active prompt and editable buffer reflow correctly; Ctrl+L
repaints a clean screen. We deliberately do not clear the user's visible command
output automatically on every resize. Terminal tests check buffer survival before
Ctrl+L and exact scene parity after it. A future redraw strategy should improve
the visual remnants without clearing command output or hijacking signal traps.

Reserve one terminal column to prevent autowrap. Full art starts at 80 columns;
28–79 columns use a two-line compact prompt, and smaller windows get a tiny
input marker. Bound the usable width to 1000 columns. Every drawn glyph must occupy
one terminal cell, without combining marks, emoji sequences, or control characters.
ASCII mode preserves geometry using one-character substitutions.
Unicode mode uses no private-use characters. Optional `--glyphs powerline` maps
the existing `◖`/`◗` end caps to U+E0B6/U+E0B4 during scene lowering, preserving
the same derivation and cell reservations. These full-height half-circles require
font or terminal renderer coverage and are checked in Ghostty separately from
the default Unicode mode.

Local measurement for the user's `a4c43e0e` compact specimen at 120 columns:
v0.5.1 takes about 1.93 ms to source and 0.775 ms per prompt expansion; v0.6 takes
about 0.095 ms and 0.030 ms respectively. These are warm, in-process measurements
over 300 source operations and 1000 `print -rnP` expansions, not total shell startup
times or portable guarantees. The specimen shrank from 8.8 KB / 211 lines to about
2.3 KB / 42 lines. Dense layouts can need several width cases; repeated rows are
shared instead of duplicating an entire frame for every junction change.

Sourcing stores the original `PROMPT`, `RPROMPT`, `PS2`, three prompt expansion
options, and `MULTIBYTE` once. Re-sourcing a different artifact replaces Promptly's
own strings. `promptly_off` restores saved values. Sourcing over a pre-0.6 export
first calls its undo function to retire its old hooks and renderer. Promptly uses
`PROMPT_PERCENT` / `PROMPT_SUBST` / `MULTIBYTE` and disables `PROMPT_BANG` while active.
Other prompt managers actively assigning PROMPT in their own hooks may conflict;
this first version is intended to own the prompt in a shell.

Static inscriptions are validated ASCII text; live roles accept only the compiler's
username/directory tokens, never arbitrary prompt code. Their values come directly
from zsh at prompt expansion, rather than being interpolated into shell expressions.
User seed data is JSON-escaped in a comment. No shell eval. The IR does not accept
arbitrary code or terminal escape sequences. Version 1 recipes retain the classic
grammar fields. Version 2 adds resolved material, alphabet, symmetry, height,
density, and ornament seed for
`graph-rewrite/1`. Version 3 selects `spatial-assembly/1` and adds engine, spread,
fragments, and connectivity. Version 4 uses the same control fields for
`prompt-composition/1`. Version 5 uses `surface-composition/1`. In version 6,
compact engines use `role-relations/1`, and larger engines
retain their art with the shared role band. Version 6 records `weight`; generated
colors store `colors`, `colorSeed`, and `colorProgram`. The optional `info`
field records live-field behavior; new designs enable it, while version-1–4 recipes
without the field load with their original static inscriptions. Loading versions
1–6 still selects their unchanged generators. Fresh designs use version 7, as
described above. Resolved recipes freeze the engine
and all sampled controls;
`auto` is never stored as an unresolved renderer. Regression tests hash the previous
network and assembly scenes and derivations independently of runtime source.

## Sampling and shared role composition

The user's correction after the freeform experiment: all of these directions are
desirable possibilities, but each iteration must not make one look universal.
Freeform art also does not replace a composition that feels integrated into a
shell prompt. Keep surface, compact, connected, and freeform engines in automatic
sampling.

`auto` filters engines by explicit controls, then selects with a dedicated seeded
RNG stream. Surface and prompt support 1–3 rows, assembly 2–12, and network 4–12.
Explicit spread/fragments/connectivity exclude network because it has different semantics.
Version-6 and version-7 compositions sample omitted complexity uniformly over integers
1–10 using `trait:complexity`. Fresh automatic and explicitly selected engines
both sample their row budget through the independent `trait:auto-height` stream:
surface/prompt use `[1, 2, 2, 3]`, assembly `[2, 3, 4, 6, 8, 12]`, and network
`[4, 4, 5, 6, 8, 12]`. Low complexity therefore does not exclude a large footprint,
and high complexity does not force one. Engine, weight, geometry traits, and color
streams remain independent of this sampling; an explicit complexity override
does not consume or change their random choices.

Explicit controls and saved recipe values always take precedence. Recipes record
the resolved integer complexity, including exports from bare `promptly` and
seed-only invocations. Reloading or mutating a recipe preserves that choice.
Classic styles and explicitly selected version-1–5 generators retain the previous
omitted-complexity default of 3 and their existing footprint rules. A change to
fresh sampling must not reinterpret a saved engine or older generator.

Version-6 compact construction starts with username, directory, optional label,
and input reservations. Ordering, baselines, gaps, alignment, indentation, and
width-relative separation form a relation tree. A role is a protected interval,
not an implicit rectangle. Adjacent roles may share one treatment, remain bare,
or receive independent treatments; large empty corridors remain empty.

Command entry is also a relation: it can follow the final text baseline or start
on a separate line. A following command constrains that baseline to a compact
left-hand footprint; distant width-relative roles are available when command
entry has its own row. `height` is a cap. Rebase the first occupied text row, then
remove every unused display row after painting. `program.rowMap` records this
compaction while `program.derivation` retains the planning coordinates. Neither
weight nor complexity changes role placement, its input relation, or its height
budget. Accepted detail may use a previously empty row within that budget.

Select a partition of the relation tree before proposing treatments, so shared
groups compete at their own level rather than losing to the first decorated
leaf. Atomic proposals add a single-row surface, horizontal rounded caps, an
edge, brackets, a short rule, a bounded join, or a rail. Generate a bounded batch,
reject geometrically invalid candidates, rank eligible candidates by seeded
operator and weight preferences, and then commit within the global budgets.
Each proposal records its priority, acceptance or rejection, and reason. Reject
collisions with text, excursions outside reserved artwork, repeated treatment of
an already-treated role, and excess fill, edge, or treatment cost. A surface may
cover a complete selected role or group; it cannot split a live field. Fresh
compositions do not build filled top/bottom contours around each label. Those
shapes remain in frozen version-5 recipes.

`weight` controls visible paint and edge budgets; zero leaves bare text. Complexity
controls proposal attempts and the extent of nested/repeated thin rules and joins
within those budgets. It does not silently increase the budgets themselves.
`fragments` limits the treatment-group partition and repeat count; `density`
controls thin-rule extent; `connectivity` gates joins and rails. `spread` changes
the chance of width-relative separation, and mirror symmetry pairs local side
edges. These controls retain their established artwork meanings in assembly and
network. Surface and prompt use the same composer, with prompt preferring line
treatments and allocating less of the same weight to fill.
Assembly and network keep their procedural art and use this composer for their
live information band. Line materials are applied after planning; rounded and
square can share a straight stroke, while heavy, double, and dashed differ.
Alphabet and ornament choices decorate existing one-cell join reservations.
They never introduce new intervals or shift command entry. Named streams isolate
placement, proposal generation, ranking preferences, material, ornament, and
color. Material chooses dark or accent-colored surfaces after acceptance;
generated dark surfaces use palette slot 6 and named collections fall back to 0.
Light surfaces use contrasting text. These choices retain the exact derivation.

Mixed galleries draw a candidate pool, select from the least-represented eligible
engine first, then maximize geometric distance within that set. Eight specimens
therefore include two from each available engine when the pool contains all four.
Fixed-engine galleries still explore variations within that engine. Changing color
or ASCII fallback does not change selection. This policy exposes multiple families
without introducing a catalogue of fixed finished prompts.

Distance is measured on the flattened scene, including filled whitespace and
protected text. Multi-scale occupancy, row/column mass, disconnected components,
gaps, span, input position, and fill/stroke/text proportions distinguish actual
composition. Selection starts near the pool's geometric center rather than giving
the first seed special priority. Normalize glyph fallback before measuring;
resolved colors never enter the vector. Proposal validity belongs to the composer,
so gallery curation cannot hide text collisions or compensate for an invalid scene.

## Generated color and live text

Fresh designs use `palette: generated`, including fresh classic designs. Existing
named collections are optional bookmarks rather than the default sampling space.
`generateColors(colorSeed)` returns seven resolved sRGB colors and a color program.
Continuous base hue, hue spread, relative hue balance, chroma, lightness, and
lightness spread define the relationships. Named `color:relationships`,
`color:lightness`, and `color:chroma` streams keep color independent of composition.
Low spread and chroma allow near-monochrome results; broader sampled relationships
produce separated accents without a finite list of harmony names.

Conversion uses [OKLab's published sRGB matrices](https://bottosson.github.io/posts/oklab/).
Out-of-gamut colors reduce chroma at fixed hue and lightness. Contrast checks use
the final eight-bit sRGB values and [relative luminance](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance).
Slots 0 and 1 remain visible structural inks; slots 2–4 are accents and 5 is text.
Slot 6 is a separate dark surface, so subdued lines no longer double as panel
backgrounds. Contrast minima against both slot 6 and the dark reference `#242733`
are 2.4:1 for quiet structure, 3:1 for stronger lines, 4.5:1 for accents, and 7:1
for text. The reference is a generation constraint, not a claim about every user
terminal theme. Light accent fills use the compiler's contrasting foreground.

Generated recipes persist actual `colors`, `colorSeed`, and `colorProgram`, whose
role entries include resolved OKLCH coordinates and hex values. All mutation scopes
preserve these colors. `--color-seed` resamples color independently; an explicit
named palette override also leaves geometry and gallery selection unchanged.

Foreground/background pairs preserve filled spaces through flattening and span
coalescing; the compiler resets background at gaps and before command entry.
The compiler keeps colored text at a contrast ratio of at least 4.5:1; otherwise
`contrastInk` selects black or white from the surface's sRGB luminance, yielding
at least 4.58:1 for that fallback without relying on the terminal's theme.

At 28–79 terminal columns the shared fallback keeps username and directory on a
compact first row with input on the second; smaller widths use only the input marker. `--no-info`
opts out, and `--info` can add live fields when loading an older recipe. This
changes displayed information without adding shell hooks or a runtime renderer.

`docs/surfaces.png` and `docs/possibilities.png` show focused and mixed Ghostty
galleries. `docs/shapes.png` records the earlier version-5 contour experiment.
`docs/relations.png` and `docs/relations-normalized.png` compare the same twelve
consecutive seeds with natural and fixed colors. `docs/capsules-v6.png` separately
checks fresh horizontal half-circle caps; it is not part of that uncurated batch.
The release audit also records `slot-machine/1` through `/24` in
`docs/defaults-1.png` through `docs/defaults-4.png`, with matching `-normalized`
captures. These invoke the CLI with only a seed: no engine, complexity, height,
weight, color, or glyph override. Keep the whole consecutive batch, including
random streaks. A short batch need not contain every engine; check reachability
over the wider fixed pool. `docs/default-extremes-1.png` and `-2.png` supplement
that batch with objective extrema from 256 seeds, labeled by selection criterion.
Visual review must compare fixed-color specimens as well as natural colors:
changing hue must not disguise repeated compositions. Check filled-space preservation,
contrasting text, readable paths, balanced empty space, and clear command entry as
well as glyph coverage and silhouette diversity.

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

Galleries use the shared final-scene distance described above, including for
assemblies. Measure after masks and overlays; raw derivation size is not a proxy
for the amount or shape of visible art. All displayed seeds remain reproducible.

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
- Richer texture/raster bases and interactions between existing operators. Do not couple
  these to named whole-prompt templates or universal connecting strokes.
- A terminal exploration interface that supports keeping and mutating specimens.
- Color-area balancing and dark/light adaptation for unfilled artwork; preserve
  the generated role relationships and existing text contrast guarantees.
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
textures, optional links, and layered independent contours. `examples/assembly.*`
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

## Mixed exploration and compact prompt baseline

The current `docs/possibilities.png` refreshes the mixed gallery with eight
`possibility` specimens, complexity 8, at 120 columns. `docs/prompts.png` focuses
on the compact engine with seed `closely`. Both are actual Ghostty-backend
captures, regenerated with the current composer; the baseline below describes
the original compact-engine release.
`examples/compose.*` now stores a compact specimen (`closely/6`); the version-2
network and version-3 assembly examples remain separate and unchanged.

This release passes 38 automated tests and 111 Ghostty assertions. Added checks
cover all three families in automatic sampling, balanced galleries, independent
footprint/detail budgets, compact role proximity across 192 seeds, readable
20-character inscriptions, native right prompts, surface/detail independence,
and exact old recipe geometry. Terminal checks include single-row command entry,
long-line wrapping, normal command execution, and six live mixed specimens.

Continue expanding the space rather than treating any one engine as the answer.
Potential next work: compose compact role geometry with bounded sections of the
network rewrite engine; add more role-local transforms and useful cross-engine
operators. Preserve meaningful attachment to the command line when generating
compact prompts, while keeping detached artwork possible elsewhere in the space.
