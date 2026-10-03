# Promptly

A seeded generative art instrument that exports standalone zsh prompts. Independent
pieces grow from points, strokes, text slots, and shaded cells, composed through
repetition, reflection, layering, subdivision, and cuts. Their scale, placement,
number, and optional connections vary separately. No Git, clocks, network calls,
or runtime agent.

[Spatial compositions rendered through Ghostty](docs/assembly.png)
· [Earlier connected networks](docs/primitives.png)
· [Original classic layouts](docs/gallery.png)

```sh
node bin/promptly.js gallery --seed possibility --label finn --complexity 8 --count 6
node bin/promptly.js preview --from examples/compose.json
source examples/compose.zsh
promptly_off
```

Generate your own artifact:

```sh
node bin/promptly.js export --seed spore --complexity 8 --material rounded --out spore.zsh
source ./spore.zsh
```

Node 22+ generates; zsh 5.8+ renders. No npm dependencies or build step. Generated
files contain their own renderer and recipe. They work without this repository.
The CLI never modifies `.zshrc`. Sourcing installs the artwork for that shell;
`promptly_off` restores its previous prompt and prompt expansion options.

`styles` lists composition grammars, palettes, materials, and alphabets. The default
assembly engine supports complexity 1–10, a row budget of 2–12, and optional
reflection. Empty outer rows are trimmed; internal gaps stay at most one row tall.
`--spread 0..1` controls horizontal extent, `--fragments 1..12` sets a region-count
target, and `--connectivity 0..1` controls optional links between neighbors. Many
seeds have no links. Density 0.15–0.85 controls particle and texture coverage.
Materials: rounded, square, heavy, double, dashed. Alphabets: geometric,
punctuation, technical, granular, or explicitly selected runic. Defaults come
from the seed; overrides are independent. `--engine network` retains the earlier
connected graph generator and its 4–12 rows. Classic named styles remain opt-in
with `--style signal`, `reliquary`, `mycelium`, `orrery`, or `xenoweave` (levels 1–5).

```sh
node bin/promptly.js inspect --seed growth --complexity 8 --out design.json
node bin/promptly.js mutate --from design.json --scope ornament --variation 2 --out variant.json
node bin/promptly.js export --from variant.json --out variant.zsh
node bin/promptly.js inspect --from design.json --program
```

Mutation scopes are `all`, `structure`, and `ornament`. Ornament mutations preserve
the exact structural derivation; structure mutations retain the detail seed and
selected art direction. `inspect --program` reports region partitions, cell-art
trees, optional links, expression trees, and statistics. Ordinary `inspect` emits
the reloadable recipe. Version-2 network recipes retain their existing geometry;
new assembly recipes use version 3.
Existing output files require `--force` to replace. See `--help` for every control.

Assembly galleries deterministically choose distinct geometries from a larger
seed pool. Selection compares spatial occupancy, scale, and drawing primitives;
changing only the palette or ASCII fallback does not change the selected seeds.
The displayed seed reproduces each specimen with `preview` or `export`.

Unicode mode uses single-cell glyphs and no private-use/Nerd Font characters.
The terminal's fonts still need to cover the chosen symbols. `--glyphs ascii`
uses the same geometry with ASCII substitutions. Colors target dark backgrounds;
the prompt leaves the terminal background alone. Previews respect `NO_COLOR`.

## Development

```sh
npm test
npm run examples
TUI_TEST_BIN=.tools/tui-test npm run test:terminal
```

The terminal suite uses the Ghostty backend of
[microsoft/tui-test](https://github.com/microsoft/tui-test), version
`0.1.0-beta.5`. Put the official binary in `.tools/` or set `TUI_TEST_BIN`.
It runs isolated shell sessions, verifies actual cell/cursor state, and writes
captures under ignored `artifacts/`. Generated examples are tracked; rerun
`npm run examples` after changing grammars or the runtime.

Architecture and continuation notes live in [docs/architecture.md](docs/architecture.md).
