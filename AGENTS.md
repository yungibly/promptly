# Working on Promptly

This is a generative art project whose medium is a usable zsh prompt. Pursue
interesting structures, controlled color, and negative space. The user's visual
reference has delicate neon ornament and asymmetrical left/right elements; the
ambition includes alien structures connecting both sides. Git/status/time widgets
are outside the current scope. Repository docs are primarily for maintainers.

- No runtime agent, Node process, network, or external command in exported prompts.
- Previews must exercise the exported zsh renderer. Keep one source of rendering truth.
- Use width-relative anchors, curated one-cell glyphs, and a reserved input anchor.
- Do not implement decoration with cursor movement escape sequences. ZLE owns editing.
- Preserve other hooks; source twice and disable should be safe. Do not edit user rc files.
- Keep recipe generation deterministic. Use named RNG streams for independent concerns.
- Test true terminal behavior with `microsoft/tui-test --backend ghostty`, then inspect PNGs.
  A text snapshot alone cannot detect missing glyphs or poor color. See docs for setup.
- `npm test`, regenerate examples, and run the terminal suite after runtime changes.
- New grammars should have genuinely different topology. Increasing complexity should
  add structure and detail while preserving legibility, not just random character noise.

See `docs/architecture.md` for decisions, constraints, and possible next steps.
