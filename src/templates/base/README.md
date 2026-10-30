# {{projectName}}

A TypeScript workspace with an empty React page, a Hono health endpoint, and a shared package.

## Requirements

- Bun 1.4.4 or newer
- Node.js 22.22 or newer for the CLI and build tools
- Docker with Compose when using local PostgreSQL containers

Complete the configuration for any selected addons below before starting development.

## Development

```bash
bun install
bun run dev
```

`bun run dev:client` starts the frontend. `bun run dev:server` starts the API. The default development URLs are `http://localhost:5173` and `http://localhost:3000`.

## Checks

```bash
bun run build
bun run type-check
bun run lint
bun run format:check
bun run test
```

## Workspaces

- `client/`: frontend code and assets
- `server/`: API routes and server dependencies
- `shared/`: shared TypeScript types

Database credentials and auth secrets belong in the server environment. Variables prefixed with `VITE_` are available to frontend code.

`bunfig.toml` requires newly resolved package versions to be at least three days old. Existing versions in `bun.lock` remain unchanged.
