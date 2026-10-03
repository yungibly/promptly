# Promptly

A seeded generative art instrument that exports standalone zsh prompts. Static
inscriptions, alien diagrams, branching filaments, orbital instruments, and braided
runic channels. No Git,
clocks, network calls, status widgets, or agent required at runtime.

[Five specimens rendered through Ghostty](docs/gallery.png)

```sh
node bin/promptly.js gallery --seed first-contact --label finn --complexity 5
node bin/promptly.js preview --from examples/reliquary.json
source examples/reliquary.zsh
promptly_off
```

Generate your own artifact:

```sh
node bin/promptly.js export --style mycelium --seed spore --palette abyss --out spore.zsh
source ./spore.zsh
```

Node 22+ generates; zsh 5.8+ renders. No npm dependencies or build step. Generated
files contain their own renderer and recipe. They work without this repository.
The CLI never modifies `.zshrc`. Sourcing installs the artwork for that shell;
`promptly_off` restores its previous prompt and prompt expansion options.

`styles` lists grammars and palettes. `inspect --out design.json` saves a recipe;
`mutate --from design.json --variation 2 --out variant.json` makes a repeatable
relative. `export --from variant.json --out variant.zsh` compiles it. `--help`
lists all controls. Existing output files require `--force` to replace.

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
