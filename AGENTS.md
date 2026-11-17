# Working on Promptly

This is a generative art project whose medium is a usable zsh prompt. Version 8
is prompt-scale first: an automatic roll should be something you would keep on
every command, so most are one to three rows with a bounded piece of art attached
to the live text, and interest comes from material (gradients, half-block and
braille detail, automata, tiles) rather than size. Tall art stays available
through `--height` and appears occasionally. The direction is smaller composable
primitives, generative systems with one idea per prompt, and broad visual
possibility. The classic named layouts and the version 1–5 generators were retired
in 0.9; saved version 6 and 7 recipes must keep their exact output. Prefer
interoperable geometry and ornament operations over more full-prompt templates. Preserve controlled color and negative
space. Git/status/time widgets are outside scope. Docs are for maintainers.

User clarification: connected networks, large freeform art, and compact integrated
prompts should all remain possibilities. Do not replace the entire sampling space
with the latest experiment. Automatic sampling and galleries must retain all
procedural families. Complexity should add detail without always increasing size.

- No runtime agent, Node process, network, or external command in exported prompts.
- Previews must exercise the exported zsh renderer. Keep one source of rendering truth.
- Compile geometry into text in the CLI. Exports use native parameter expansion
  for responsive padding; do not reintroduce shell drawing loops or prompt-time
  subprocesses. Keep the legacy renderer in test/fixtures only as a parity oracle.
- Use width-relative anchors, curated one-cell glyphs, and a reserved input anchor.
- Do not implement decoration with cursor movement escape sequences. ZLE owns editing.
- Preserve other hooks; source twice and disable should be safe. Do not edit user rc files.
- Keep recipe generation deterministic. Use named RNG streams for independent concerns.
- Test true terminal behavior with `microsoft/tui-test --backend ghostty`, then inspect PNGs.
  A text snapshot alone cannot detect missing glyphs or poor color. See docs for setup.
- `npm test`, regenerate examples, and run the terminal suite after runtime changes.
- Default composition must not require a connected graph or a full-width spine.
  Keep scale, placement, independent fragments, and connections separate choices.
  Add reusable cell-art operators rather than whole-prompt templates. Preserve
  fragment reservations; empty space is part of the composition.
- In the opt-in network engine, add growth rules as atomic proposals with explicit
  attachment ports. Preserve connectivity within that graph; descendants can grow.
- Keep topology, material, alphabet, and detail RNG streams independent. An ornament
  mutation must preserve the exact structural derivation.
- Increase complexity through nested structure and detail while preserving legibility.
- Judge variety through actual shape and occupied medium, not seeds or colors alone.
  Check sparse, dense, short, tall, unlinked, and linked specimens in Ghostty.
- Keep the version-8 footprint (about 88% of automatic rolls at 1–3 rows, none
  over five rows without `--height`) when adding engines or forms; check it with a
  500-seed histogram and uncurated Ghostty batches, not curated favorites.
- Compact prompt geometry must attach to the label or input roles, stay in 1–3
  rows, and preserve readable text and command-entry space. Keep the larger
  assembly and network engines available and covered by recipe regression tests.

See `docs/architecture.md` for decisions, constraints, and possible next steps.
