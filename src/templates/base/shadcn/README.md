# BHVR scaffold

Bun workspaces with Hono, Vite, React, and a shared TypeScript package. The client starts with an empty page. The server exposes `GET /health`.

```sh
bun install
bun run dev
```

Run `bun run build`, `bun run type-check`, `bun run lint`, `bun run format:check`, and `bun run test` to check the project.

`bunfig.toml` requires newly resolved package versions to be at least three days old. Existing versions in `bun.lock` remain unchanged.
