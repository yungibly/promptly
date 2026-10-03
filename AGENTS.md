# Working on Promptly

This is a generative art project whose medium is a usable zsh prompt. The current
direction is smaller composable primitives, recursive structure, and broad visual
possibility. The first version used named alien-themed layouts; those are now
classic compatibility options. Prefer interoperable geometry and ornament
operations over more full-prompt templates. Preserve controlled color and negative
space. Git/status/time widgets are outside scope. Docs are for maintainers.

User clarification: connected networks, large freeform art, and compact integrated
prompts should all remain possibilities. Do not replace the entire sampling space
with the latest experiment. Automatic sampling and galleries must retain all
procedural families. Complexity should add detail without always increasing size.

- No runtime agent, Node process, network, or external command in exported prompts.
- Previews must exercise the exported zsh renderer. Keep one source of rendering truth.
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
- Compact prompt geometry must attach to the label or input roles, stay in 1–3
  rows, and preserve readable text and command-entry space. Keep the larger
  assembly and network engines available and covered by recipe regression tests.

See `docs/architecture.md` for decisions, constraints, and possible next steps.
