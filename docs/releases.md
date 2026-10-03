# Release maintenance

The executable is the existing generator bundled with Bun 1.4.2. Keep the source
CLI usable with Node 22+; the distributed CLI has no external JavaScript runtime
dependency. The small `src/runtime.zsh` export wrapper is embedded by `scripts/build.js`, with a filesystem
fallback only when running the source CLI. Do not change the procedural engine
mix while working on distribution.

## Making a release

1. Bump `package.json` to the intended `major.minor.patch`. Run `npm test`,
   `npm run build`, and `npm run test:binary`. Runtime or geometry changes also
   require regenerated examples and Ghostty terminal tests (see AGENTS.md).
2. Commit and push to `main`. Wait for all four native CI jobs to pass.
3. Create and push a matching tag, e.g. `git tag v0.5.0` and
   `git push origin v0.5.0`. The release workflow checks the tag against the source
   version before building anything.
4. Watch the Release workflow through the final tap update, not just publication.

CI uses macOS ARM64, macOS Intel, Linux ARM64, and Linux x86-64 runners to compile,
test, and package each executable natively. Linux builds use Bun's glibc targets,
matching the Homebrew runners and ordinary Debian/Ubuntu/Fedora installations.
Bun's musl variants need a musl loader and are not suitable for those systems.
`scripts/binary-test.js` copies the executable to an isolated temporary directory,
removes external runtimes from `PATH` for generation, checks exact output against
Node for all engines, sources the generated zsh, and verifies config isolation.

The release workflow reuses that CI, checks every archive against its checksum,
generates `SHA256SUMS` and the Homebrew formula, and uploads all assets to a draft
release before publishing it. It then installs the published downloads through
Homebrew on both macOS architectures and Linux x86-64. Only after those tests pass
does it commit `Formula/promptly.rb` to `yungibly/homebrew-tap`.

The Linux ARM64 executable is tested natively before publication; Homebrew
installation on Linux ARM64 is not exercised in this workflow.

## Credentials and recovery

`GITHUB_TOKEN` publishes releases in this repository. The repository Actions
secret `BREW_TAP_TOKEN` needs Contents read/write permission on
`yungibly/homebrew-tap`. It is used only for the final tap checkout and push.
No secret is supplied to the binary build jobs. `.env`, `.env.*`, and `dist/` are
ignored, and compilation explicitly disables environment inlining and dotenv
autoloading. Never commit local tokens or interpolate them into workflow files.

If publication succeeds but installation or tap update fails, repair the external
cause and rerun the failed jobs. Do not move a published tag. Published assets
are immutable in the workflow: retrying publication verifies byte equality and
refuses to replace them. A full rebuild may produce different archive bytes;
use a new version when changing release code, or rerun failed jobs with the
original successful build artifacts. Artifacts remain available for seven days.

Actions are pinned to commit hashes, and Bun is pinned to a version. Update Bun
in both CI and this documentation, refresh `third_party/bun-LICENSE.md`, and rerun
all native binary checks when changing the embedded runtime. Release archives
include the upstream runtime notice and a link to its source/rebuild instructions.
