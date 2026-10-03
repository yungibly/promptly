# Architecture / continuation notes

## Pipeline

`recipe -> seeded grammar -> responsive cell scene -> zsh compiler -> standalone artwork`

- `src/random.js`: stable integer RNG seeded through SHA-256. Independent streams
  isolate palette, structure, and ornament choices.
- `src/grammars.js`: composition grammars. Each returns a scene, input cursor column,
  and a small native right prompt. Inscriptions are entirely fictional/static.
- `src/scene.js`: ordered text/fill runs. X coordinates are `(per-mille anchor,
  column offset)`. Rows are discrete. A fill's end is exclusive; text supports
  left/center/right alignment. Later runs overpaint earlier ones, including spaces.
- `src/compile.js` and `src/runtime.zsh`: compile scene geometry into calls against
  a temporary zsh cell canvas. Paint, merge colors, then construct normal `PROMPT`
  and `RPROMPT` values using zsh's native color escapes.
- `src/preview.js`: executes the same source in `zsh -f`; no separate art renderer.
- `bin/promptly.js`: human/agent CLI, JSON recipes, preview, mutation, export.

The top decoration is a multiline left prompt spanning the usable width. The input
row has an ordinary short left prompt and a native right prompt. This lets zsh
handle input wrapping and hide the right ornament when typing reaches it. Nothing
paints into the editable buffer or moves the cursor manually.

## Runtime contract

The standalone file needs only zsh builtins and standard autoloaded hook helpers.
It never reads cwd, time, exit status, Git, or network state. Its only changing
input is `COLUMNS`. Geometry is cached until the width changes; `precmd` and the
`line-pre-redraw` ZLE hook rebuild when needed. A fixed `PROMPT_SUBST` expression
prints the cached frame from a zsh subshell (no external executable). On SIGWINCH,
zsh re-expands the prompt before calling the redraw widget; that expansion also
checks width and can rebuild in the subshell. This avoids replacing any user
signal trap. No animation loop. The small shell fork on prompt expansion is the
intentional tradeoff for correct live resize and signal-handler coexistence.

Known zsh/terminal behavior: drastic shrinking of a multiline prompt can leave
pieces of its previously printed rows above the active prompt as the terminal
reflows history. The active prompt and editable buffer reflow correctly; Ctrl+L
repaints a clean screen. We deliberately do not clear the user's visible command
output automatically on every resize. Terminal tests check buffer survival before
Ctrl+L and exact scene parity after it. A future redraw strategy should improve
the visual remnants without clearing command output or hijacking signal traps.

Reserve one terminal column to prevent autowrap. Full art starts at 80 columns;
28–79 columns use a two-line compact inscription, and smaller windows get a tiny
input marker. Bound canvas work to 1000 columns. Every drawn glyph must occupy
one terminal cell, without combining marks, emoji sequences, or control characters.
ASCII mode preserves geometry using one-character substitutions.

Sourcing stores the original `PROMPT`, `RPROMPT`, `PS2`, and three prompt expansion
options once. Re-sourcing a different artifact replaces only Promptly's own hooks
and renderer. `promptly_off` removes those hooks and restores saved values. Promptly
uses `PROMPT_PERCENT` / `PROMPT_SUBST` and disables `PROMPT_BANG` while active.
Other prompt managers actively assigning PROMPT in their own hooks may conflict;
this first version is intended to own the prompt in a shell.

All inscriptions are validated static ASCII text; user seed data is JSON-escaped
in a comment. No shell eval. The IR does not accept arbitrary code or terminal
escape sequences. Recipe version 1 describes the recipe format; seed stability is
guaranteed for a given generator revision, not yet across future grammar revisions.

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

- More generative topology: nested routing, braided channels, hanging structures,
  broken symmetries. Keep placement collision rules explicit.
- A terminal exploration interface that supports keeping and mutating specimens.
- Palette interpolation with a dark/light contrast model.
- Optional slow variation per prompt, only if exported runtime stays self-contained
  and stable during editing. Do not add background animation or shell indicators.
- If a future recipe gains custom text/glyph input, implement real terminal cell
  width and safe truncation first. Current glyphs are deliberately curated.

Primary references: [zsh prompt expansion](https://zsh.sourceforge.io/Doc/Release/Prompt-Expansion.html)
and [tui-test CLI](https://github.com/microsoft/tui-test#cli-reference).
