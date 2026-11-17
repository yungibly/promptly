# Promptly

A seeded generative art instrument whose medium is your zsh prompt. Each roll
commits to one idea at prompt scale: a gradient bed under your username and
directory, a ridge or dissolve trailing the path, a cellular-automaton strip, a
quarter-arc meander, a small connected circuit. Most rolls are one to three rows
and stay out of the way of what you type; taller horizons, contour maps, and
networks are there when you ask for them. Live text is part of the composition:
decoration hugs the current directory as it changes length, art grows from the
text, and the input row stays clean. Exports are standalone native zsh with no
Git, clocks, network calls, subprocesses, or runtime agent.

[Default rolls rendered through Ghostty](docs/defaults.png)
· [Compact engines](docs/compact.png)
· [Generative systems at prompt scale](docs/systems.png)
· [Taller art with `--height`](docs/tall.png)
· [Interactive explorer](docs/explorer.png)

## Install

```sh
brew install yungibly/tap/promptly
```

Or download the standalone binary for macOS or Linux (ARM64 or x86-64) from
[Releases](https://github.com/yungibly/promptly/releases), extract it, and put
`promptly` on your `PATH`. macOS 13+ or Linux with glibc 2.17+ is required.
No Node, Bun, npm packages, or repository required.
Previews and generated prompts use zsh 5.8+.

## Generate

```sh
promptly                    # Print a fresh prompt as sourceable zsh code
promptly | pbcopy           # Copy it to the macOS clipboard
promptly > prompt.zsh       # Save it to a file
source ./prompt.zsh         # Activate it in zsh
```

Or try one immediately in zsh:

```zsh
source <(promptly)
promptly_off                # Restore the previous prompt
```

Bare `promptly` writes only shell code to stdout, so it works with pipes and
redirection. The output contains precompiled colored text, native zsh padding
expressions for resizing, live username/directory fields, and its recipe. It works
independently of the generator, without drawing functions, redraw hooks, or
prompt-time subprocesses. Each run picks a fresh seed; specify `--seed` to repeat
a design; without one, Promptly rolls a few seeds of the same engine and keeps
the most coherent. With no extra controls, fresh composed prompts sample the full
complexity range as well as engine, row budget, visual weight, and color. Nothing
is held at a fixed complexity level unless you set it or load a saved recipe.
The CLI never modifies `.zshrc`. To keep a particular design across shell sessions,
save it somewhere permanent and source that file from `.zshrc` yourself.

```sh
promptly --preview --seed spore --complexity 8
promptly --seed spore --complexity 8 | pbcopy
promptly gallery --seed possibility --complexity 8 --count 8
promptly --preview --engine surface --seed paper-cut --weight 0.25
promptly --preview --seed spore --color-seed warm-study
```

Use the same options to preview and export the same design. `promptly_off` restores
the previous prompt and prompt expansion options in the current shell.

Username and directory update through zsh's native prompt expansion. Brackets,
pills, and leaders hug the current value as it changes length, while artwork and
the input column stay fixed. Long values truncate inside their reserved cells, so
they cannot displace the artwork or input.
`--label TEXT` adds a static inscription. `--no-info` omits live fields;
`--info` enables them on a recipe saved without them.

## Explore

```sh
promptly explore
promptly explore --favorites favorites.json --out winner.zsh
promptly explore --from design.json
```

Space rerolls. `s` pins the whole shape, `l` pins the text layout, and `c` pins
colors. On assembly designs, use Up/Down to focus a fragment and `p` to pin it;
`v` switches between focused and complete previews. Mirrored partners form one
fragment. Local pins hold the composition's frame and controls while unpinned
pieces change. With no structural pins, rerolls explore the full automatic range.

Press `f` to keep a favorite, `[`/`]` to browse favorites, Tab to compare the
reference with your current roll, and Enter to adopt the reference. `e` exports
the current design and closes the explorer; `q` quits. Favorites stay in memory
unless you supply `--favorites`. An explicit favorites file is updated when you
save. Exports refuse to replace existing files unless `--force` is supplied.
The explorer uses stdin and stderr for its terminal interface, so
`promptly explore > winner.zsh` keeps exported shell code separate from the UI.

`--engine auto` is the default. It samples an engine, a row budget, visual
weight, color, and complexity independently; each integer complexity from 1
through 10 is equally likely. Automatic rolls are mostly one to three rows (two
most often), about one in nine is four or five rows, and taller art appears when
`--height` asks for it. Choosing an engine keeps the same prompt-scale budget.
Galleries balance every family and give tall specimens only their share.

Compact engines arrange the username and directory as flowing or stacked text
clusters, then give the slack around them one material:

- `--engine surface`: filled pills, gradient beds that dither in from the
  terminal, ridges, dissolves, and automaton slices.
- `--engine prompt`: line work: dotted and beaded leaders, maze runs, quarter-arc
  chains, single-strand waves, two-row meanders, elbows and rails into the input.

Five generative systems place one bounded piece of art (about forty cells at 80
columns) beside, above, or through the text, or set the text on a bed. At four
rows and up they keep their larger forms:

- `--engine field`: ridges and dithered dissolves, or the text on a truecolor
  bed; tall: layered horizons with a valley under the text, or braille ripples.
- `--engine tiles`: quarter-arc chains, meanders, and maze runs; tall:
  topographic contours ringing the text on a plateau.
- `--engine automaton`: cellular automaton strips seeded from the label; tall:
  runs falling from the text or rising from the input marker.
- `--engine growth`: braille vines and coral rooted at the text.
- `--engine plot`: a single gradient wave trace or Lissajous loop; tall:
  hidden-line ridgelines, harmonographs, and oscilloscope traces.

The larger families remain in the automatic mix:

- `--engine network`: a connected recursive circuit that grows from the text and
  stays within about half the width; 4–12 rows.
- `--engine assembly`: independently placed cell-art fragments; 2–12 rows.

All engines support complexity 1–10. `--weight 0..1` sets the live-role band's visual
weight independently of complexity; zero leaves bare typography. `--height`
restricts the eligible engines in automatic mode and sets a row budget. Compact
compositions remove unused rows; input can follow the last text baseline or begin
on its own line. Complexity expands the proposal search and small repeated rules
or joins within the same visual-weight budget, without moving the text roles.
`--complexity N` fixes the detail level without changing the seed's engine, row
budget, visual weight, or colors. Saved recipes keep their resolved complexity.

For compact compositions, `--spread` controls the chance of distant information,
`--fragments` bounds how many role groups can receive separate treatments and
how many small strokes repeat, and `--connectivity` permits joins and rails.
`--density 0.15..0.85` controls thin-rule detail extent within the weight budget.
In assembly these controls retain spatial extent, fragment count, optional links,
and field coverage; network density remains an occupancy target.
`styles` lists engines, palettes, materials, and alphabets.
Materials: rounded, square, heavy, double, dashed. Alphabets: geometric or
granular by default; punctuation, technical, and runic when selected explicitly.
Defaults come from the seed; material, alphabet, and palette overrides are
independent.

`--palette generated` is the default. Hue relationships, lightness, and chroma
range continuously from restrained near-monochrome colors to separated accents.
`--color-seed TEXT` changes only color. Seventeen named collections, such as
`paper`, `primary`, and `velvet`, remain optional color bookmarks. Filled text
keeps colored ink when legible, with black or white as a contrast fallback.
The network and assembly engines retain their artwork and use the same role-band
composer for live information. Some rolls place that information within the art,
masking protected text or attaching a short stroke to its edge. Other rolls keep
the fields separate. Compact surfaces can have independent round, flat, or angled
ends and gaps between fields; no curved top/bottom block contours are added.
Shared motifs can shorten, shift, thin, or fragment inside fixed bounds. Saved
older recipes retain their original shapes.

```sh
promptly inspect --seed growth --complexity 8 --out design.json
promptly mutate --from design.json --scope ornament --variation 2 --out variant.json
promptly --from variant.json --out variant.zsh
promptly inspect --from design.json --program
```

Mutation scopes are `all`, `structure`, and `ornament`. Ornament mutations preserve
the exact structural derivation; structure mutations retain the detail seed and
selected engine and art direction. `inspect --program` reports prompt roles or
region partitions, primitive trees, links, expression trees, and statistics.
For role compositions it also reports grouping, input relationships, accepted and
rejected proposals, weight budgets, and the planning-to-display row map.
All mutation scopes preserve resolved colors; use `--color-seed` to resample them.
Ordinary `inspect` emits the reloadable recipe, with the selected engine and every
sampled control resolved. Fresh designs use version 8, including separate
component and fragment seeds so pinned discoveries replay exactly. Generated
colors persist as `colors`, `colorSeed`, and `colorProgram`. Saved version-6 and
version-7 recipes keep their generators and appearance. Recipes from Promptly 0.5
and earlier (versions 1–5) and the classic named styles can no longer be loaded;
their exported `.zsh` files are standalone and keep working.
Existing output files require `--force` to replace. See `--help` for every control.

Galleries deterministically choose distinct geometries from a larger seed pool.
Each engine's weakest candidates are dropped first (stray text, thin scatter,
tall sparse art), then selection balances engines and compares spatial occupancy
and scale;
changing only color or glyph mode does not change the selected seeds.
The displayed seed reproduces each specimen with `preview` or `export`.

Default Unicode mode uses single-cell glyphs and no private-use/Nerd Font
characters, and expects a UTF-8 shell locale. `--glyphs powerline` replaces the
round and angled end caps with full-height Powerline glyphs; it needs a font or terminal
renderer covering those glyphs. `--glyphs ascii` uses the same geometry with ASCII
substitutions. All modes retain the same structural derivation. Unfilled artwork
targets dark backgrounds; filled surfaces paint only their own cells and select readable text
independently of the terminal theme. The terminal's default background is left
alone. Previews respect `NO_COLOR`.

## Development

The source CLI runs with Node 22+ and has no npm dependencies:

```sh
node bin/promptly.js --preview --seed spore
npm test
npm run examples
TUI_TEST_BIN=.tools/tui-test npm run test:terminal
```

Build a standalone binary using [Bun](https://bun.sh/docs/bundler/executables)
1.4.2 (the version pinned in CI):

```sh
npm run build
npm run test:binary
./dist/promptly --version
```

The export wrapper is embedded at build time. Binary tests run outside the repository,
without Node or Bun on `PATH`, and compare procedural engines against the source
implementation. Compilation and the resulting executable do not autoload `.env`
files. Release binaries also disable Bun's local config autoloading.

The terminal suite uses the Ghostty backend of
[microsoft/tui-test](https://github.com/microsoft/tui-test), version
`0.1.0-beta.5`. Put the official binary in `.tools/` or set `TUI_TEST_BIN`.
It runs isolated shell sessions, verifies actual cell/cursor state, and writes
captures under ignored `artifacts/`. On Linux, install zsh from the distribution
(e.g. `apt install zsh`); the suite uses its own startup files. Generated examples
are tracked; rerun `npm run examples` after changing engines or the runtime.

Architecture and continuation notes live in [docs/architecture.md](docs/architecture.md).
Release and tap maintenance are documented in [docs/releases.md](docs/releases.md).
