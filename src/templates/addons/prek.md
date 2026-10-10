## Commit checks with prek

`@j178/prek` is a root development dependency, equivalent to `bun add -D @j178/prek`. The generator installs the Git hook when Git initialization and dependency installation are enabled. For clones or projects generated with either step skipped, run:

```sh
bun install
git init # Only when there is no Git repository yet
bun run hooks:install
```

The hook formats staged files, lints staged code, checks workspace types, scans staged changes with Gitleaks, detects private keys, blocks `.env` files except `.env.example`, and checks merge conflicts, file size, case conflicts, symlinks, JSON/JSONC, YAML, TOML, whitespace, final newlines, and line endings. Formatting uses the Oxc configuration. Restage files changed by a formatter and retry the commit. Tests remain available through `bun run test`.

```sh
bun run hooks:run    # Check all tracked files; Gitleaks checks staged changes
bun run hooks:update # Update pinned remote hook revisions
```

Gitleaks output is redacted. Its first run downloads and builds the pinned hook using prek's managed Go toolchain if needed. Hook environments live in prek's cache, not in project dependencies. `.pre-commit-config.yaml` controls the checks. Hooks require Bun and installed project dependencies; Git hooks are local and must be installed in each clone.
