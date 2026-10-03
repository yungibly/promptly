# Promptly

A seeded generative art instrument that exports standalone zsh prompts with your
live username and current directory. Automatic sampling explores painted text
surfaces, compact line art, connected networks, and freeform cell art. Text roles
define protected intervals; shared or individual treatments grow around them.
Color relationships are generated continuously. Arrangement, visual weight,
color, and detail vary independently. No Git, clocks, network calls, or runtime agent.

[Default rolls rendered through Ghostty](docs/defaults-1.png)
· [More default rolls](docs/defaults-2.png)
· [Range extremes](docs/default-extremes-1.png)
· [Defaults with fixed colors](docs/defaults-1-normalized.png)
· [Compact compositions](docs/relations.png)
· [Horizontal capsules](docs/capsules-v6.png)
· [Mixed possibilities](docs/possibilities.png)
· [Role compositions](docs/surfaces.png)
· [Line-focused prompts](docs/prompts.png)
· [Freeform compositions](docs/assembly.png)
· [Connected networks](docs/primitives.png)
· [Original classic layouts](docs/gallery.png)

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
a design. With no extra controls, fresh composed prompts sample the full
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

Username and directory update through zsh's native prompt expansion. Long values
truncate inside reserved cells, so they cannot displace the artwork or input.
`--label TEXT` adds a static inscription. `--no-info` omits live fields;
`--info` enables them when loading an older recipe.

## Explore

`--engine auto` is the default. It samples an eligible procedural engine, a row
budget, and complexity independently. Fresh composed prompts sample each integer
complexity from 1 through 10 with equal probability; choosing an explicit engine
still samples complexity and its compatible row budget. Small intricate prompts
and large sparse artwork both remain possible. Galleries balance the available
families and select different geometries within them. Focus exploration when desired:

- `--engine surface`: 1–3 rows, shared role composition with optional single-row
  surfaces, horizontal caps, edges, brackets, rules, and rails.
- `--engine prompt`: the same 1–3 row composer with a preference for line treatments.
- `--engine network`: connected recursive geometry, 4–12 rows.
- `--engine assembly`: independently placed cell art, a 2–12 row budget.

All four support complexity 1–10. `--weight 0..1` sets the live-role band's visual
weight independently of complexity; zero leaves bare typography. `--height`
restricts the eligible engines in automatic mode and sets a row budget. Compact
compositions remove unused rows; input can follow the last text baseline or begin
on its own line. Complexity expands the proposal search and small repeated rules
or joins within the same visual-weight budget, without moving the text roles.
`--complexity N` fixes the detail level without changing the seed's engine, row
budget, visual weight, or colors. Saved recipes keep their resolved complexity;
classic styles and explicitly selected legacy generators retain their level-3
default when complexity is omitted.

For compact compositions, `--spread` controls the chance of distant information,
`--fragments` bounds how many role groups can receive separate treatments and
how many small strokes repeat, and `--connectivity` permits joins and rails.
`--density 0.15..0.85` controls thin-rule detail extent within the weight budget.
In assembly these controls retain spatial extent, fragment count, optional links,
and field coverage; network density remains an occupancy target.
`styles` lists engines, composition grammars, palettes, materials, and alphabets.
Materials: rounded, square, heavy, double, dashed. Alphabets: geometric,
punctuation, technical, granular, or explicitly selected runic. Defaults come
from the seed; material, alphabet, and palette overrides are independent. Classic
named styles remain opt-in
with `--style signal`, `reliquary`, `mycelium`, `orrery`, or `xenoweave` (levels 1–5).

`--palette generated` is the default. Hue relationships, lightness, and chroma
range continuously from restrained near-monochrome colors to separated accents.
`--color-seed TEXT` changes only color. Seventeen named collections, such as
`paper`, `primary`, and `velvet`, remain optional color bookmarks. Filled text
keeps colored ink when legible, with black or white as a contrast fallback.
The network and assembly engines retain their artwork and use the same role-band
composer for live information. Saved older recipes retain their original shapes.

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
sampled control resolved. Fresh composed designs use version 6, including visual
weight. Generated colors persist as `colors`, `colorSeed`, and `colorProgram`. Saved version-1–5
recipes preserve their generators and appearance; version-1–4 recipes without an
`info` field retain their original static labels.
Existing output files require `--force` to replace. See `--help` for every control.

Galleries deterministically choose distinct geometries from a larger seed pool.
Selection balances engines and compares spatial occupancy and scale;
changing only color or glyph mode does not change the selected seeds.
The displayed seed reproduces each specimen with `preview` or `export`.

Default Unicode mode uses single-cell glyphs and no private-use/Nerd Font
characters, and expects a UTF-8 shell locale. `--glyphs powerline` replaces the
round end caps with full-height Powerline half-circles; it needs a font or terminal
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
captures under ignored `artifacts/`. Generated examples are tracked; rerun
`npm run examples` after changing grammars or the runtime.

Architecture and continuation notes live in [docs/architecture.md](docs/architecture.md).
Release and tap maintenance are documented in [docs/releases.md](docs/releases.md).
