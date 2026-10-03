# Bundled runtime

Promptly's release executables embed Bun 1.4.2 and its linked libraries. The
upstream license and dependency notice is included in `bun-LICENSE.md`, copied
from https://github.com/oven-sh/bun/blob/bun-v1.4.2/LICENSE.md.

Bun's source is available at https://github.com/oven-sh/bun/tree/bun-v1.4.2.
That notice also identifies Bun's JavaScriptCore/WebKit source and rebuilding
instructions. Promptly's complete application source and build instructions are
available at https://github.com/yungibly/promptly. The executable can be rebuilt
with a modified Bun runtime using `bun --no-env-file scripts/build.js`.

Generated `.zsh` prompts contain Promptly's renderer and recipe, with no Bun
runtime or other embedded third-party dependencies.
