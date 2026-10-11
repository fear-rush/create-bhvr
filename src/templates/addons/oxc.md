## Oxlint and Oxfmt

- `bun run lint` checks all workspaces with Oxlint.
- `bun run lint:fix` applies available lint fixes.
- `bun run format` formats files with Oxfmt.
- `bun run format:check` checks formatting without modifying files.
- `bun run type-check` checks TypeScript separately.

React Hooks and React Refresh rules are enabled. Generated build outputs, route trees, and migration artifacts are excluded. Rules live in `.oxlintrc.json`; formatting options live in `.oxfmtrc.json`.

The 15 generic anti-slop rules are enabled at error severity. Their plugin lives in `tools/oxlint/anti-slop`; `@oxlint/plugins` is pinned to the Oxlint version. Effect rules are not included. Both tools ignore agent tooling directories and the vendored plugin.
