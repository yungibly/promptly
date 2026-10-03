# Promptly

A seeded generative art instrument that exports standalone zsh prompts. Automatic
sampling explores compact prompts, connected networks, and freeform cell art.
Small primitives build nested glyphs, brackets, folds, strokes, branches, textures,
and independent pieces. New experiments expand the range instead of replacing
earlier ones. No Git, clocks, network calls, or runtime agent.

[Mixed possibilities rendered through Ghostty](docs/possibilities.png)
· [Compact prompts](docs/prompts.png)
· [Freeform compositions](docs/assembly.png)
· [Connected networks](docs/primitives.png)
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

`--engine auto` is the default. It samples an eligible procedural engine and a row
budget independently of complexity. Galleries balance the available families and
select different geometries within them. Focus exploration when desired:

- `--engine prompt`: 1–3 rows, decoration around the label and command introducer.
- `--engine network`: connected recursive geometry, 4–12 rows.
- `--engine assembly`: independently placed cell art, a 2–12 row budget.

All three support complexity 1–10. `--height` restricts the eligible engines in
automatic mode. `--spread`, `--fragments`, and `--connectivity` apply to prompt and
assembly: local ornaments/right accents or spatial regions/optional links.
Density 0.15–0.85 controls detail, field coverage, or network occupancy.
`styles` lists engines, composition grammars, palettes, materials, and alphabets.
Materials: rounded, square, heavy, double, dashed. Alphabets: geometric,
punctuation, technical, granular, or explicitly selected runic. Defaults come
from the seed; surface overrides are independent. Classic named styles remain opt-in
with `--style signal`, `reliquary`, `mycelium`, `orrery`, or `xenoweave` (levels 1–5).

```sh
node bin/promptly.js inspect --seed growth --complexity 8 --out design.json
node bin/promptly.js mutate --from design.json --scope ornament --variation 2 --out variant.json
node bin/promptly.js export --from variant.json --out variant.zsh
node bin/promptly.js inspect --from design.json --program
```

Mutation scopes are `all`, `structure`, and `ornament`. Ornament mutations preserve
the exact structural derivation; structure mutations retain the detail seed and
selected engine and art direction. `inspect --program` reports prompt roles or
region partitions, primitive trees, links, expression trees, and statistics.
Ordinary `inspect` emits the reloadable recipe, with the selected engine and every
sampled control resolved. Version-2 network and version-3 assembly recipes retain
their existing geometry; compact prompt recipes use version 4.
Existing output files require `--force` to replace. See `--help` for every control.

Galleries deterministically choose distinct geometries from a larger seed pool.
Selection balances engines and compares spatial occupancy and scale;
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
