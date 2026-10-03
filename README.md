# Promptly

A seeded generative art instrument that exports standalone zsh prompts. The default
engine grows a network from small strokes, ports, and recursive rewrite operations,
then composes tiny ornamental expressions into it. Structure, line material, and
alphabet vary independently. No Git, clocks, network calls, or runtime agent.

[Primitive-generated specimens rendered through Ghostty](docs/primitives.png)
· [Original classic layouts](docs/gallery.png)

```sh
node bin/promptly.js gallery --seed possibility --label finn --complexity 7 --height 6
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

`styles` lists engines, palettes, materials, and alphabets. Composition supports
complexity 1–10, height 4–12, occupancy density 0.15–0.85, and optional reflection.
Materials: rounded, square, heavy, double, dashed. Alphabets: geometric,
punctuation, technical, granular, or explicitly selected runic. Defaults come
from the seed; overrides are independent. Classic named styles remain opt-in
with `--style signal`, `reliquary`, `mycelium`, `orrery`, or `xenoweave` (levels 1–5).

```sh
node bin/promptly.js inspect --seed growth --complexity 8 --out design.json
node bin/promptly.js mutate --from design.json --scope ornament --variation 2 --out variant.json
node bin/promptly.js export --from variant.json --out variant.zsh
node bin/promptly.js inspect --from design.json --program
```

Mutation scopes are `all`, `structure`, and `ornament`. Ornament mutations preserve
the exact graph derivation; structure mutations retain the detail seed and selected
art direction. `inspect --program` reports primitive operations, ancestry, expression
trees, and graph statistics. Ordinary `inspect` emits the reloadable recipe.
Existing output files require `--force` to replace. See `--help` for every control.

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
