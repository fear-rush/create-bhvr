# create-bhvr 🦫

![cover](https://cdn.stevedylan.dev/ipfs/bafybeievx27ar5qfqyqyud7kemnb5n2p4rzt2matogi6qttwkpxonqhra4)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/stevedylandev/create-bhvr/blob/main/LICENSE)
![create-bhvr version](https://img.shields.io/npm/v/create-bhvr.svg?label=%20)

A command-line interface (CLI) to quickly scaffold a new `bhvr` project. `bhvr` is a full-stack TypeScript monorepo starter with shared types, using Bun, Hono, Vite, and React.

## Getting Started

This fork bundles the base templates with TypeScript 7 and Oxc tooling. Drizzle PostgreSQL, Docker PostgreSQL, and Better Auth are optional. Use Bun 1.4.2 or newer and Node.js 22.22 or newer for the CLI and build tools. Docker with Compose is needed only when using local PostgreSQL containers.

```bash
bun install
bun run build
bun dist/index.js ../my-app
```

Create a plain project without interactive prompts:

```bash
bun dist/index.js ../my-app -y
```

Create a project with database, Docker, and authentication:

```bash
bun dist/index.js ../my-app -y \
  --database postgres --docker-postgres --auth better-auth
```

Generated projects contain an empty React page, a server health endpoint, and configuration for the selected stack. No example features, demo assets, fixtures, or seed scripts are generated.

The upstream `bun create bhvr` command continues to use the upstream npm package. To distribute this fork, publish the CLI under your own npm package name and document that package's invocation. Building or pushing these repositories alone does not change the upstream command.

> [!NOTE]
> Check out [bhvr.dev](https://bhvr.dev) for the full documentation!

## Features

- **Interactive Setup**: A simple and fast interactive CLI to guide you through project setup.
- **Multiple Templates**: Choose from several templates to get started:
  - `default`: A basic setup with Bun, Hono, Vite, and React.
  - `tailwind`: Includes Tailwind CSS for styling.
  - `shadcn`: Pre-configured with Tailwind CSS and shadcn/ui.
- **TanStack Query**: Add TanStack Query for powerful data fetching and state management.
- **TanStack Router**: Optionally add client routing.
- **Oxc**: Oxlint and Oxfmt handle linting and formatting.
- **Database**: Optionally add Drizzle with PostgreSQL and explicit SQL migrations.
- **Local PostgreSQL**: Optionally add Docker Compose with persistent storage.
- **Authentication**: Optionally add Better Auth with a React client and Hono auth handler.
- **Automated Setup**: Handles `git` initialization and dependency installation for you.

## Command-Line Options

You can also use command-line options to skip the interactive prompts:

| Option                  | Description                                                        | Default         |
| ----------------------- | ------------------------------------------------------------------ | --------------- |
| `[project-directory]`   | The name of the directory to create the project in.                | -               |
| `-y, --yes`             | Skip all confirmation prompts and use default values.              | `false`         |
| `--template <template>` | Specify a template (`default`, `tailwind`, `shadcn`).              | `default`       |
| `--tsquery`             | Use TanStack Query for data fetching and state management.         | `false`         |
| `--router <router>`     | Choose `none` or `tanstackrouter`.                                 | `none`          |
| `--database <database>` | Choose `none` or `postgres` (Drizzle).                             | `none`          |
| `--docker-postgres`     | Add local PostgreSQL through Docker Compose.                       | `false`         |
| `--auth <auth>`         | Choose `none` or `better-auth`.                                    | `none`          |
| `--tanstack-query`      | Alias for `--tsquery`.                                             | `false`         |
| `--precommit`           | Add prek commit checks and staged secret scanning.                 | `false`         |
| `--scalar`              | Add Scalar API reference and an OpenAPI document.                  | `false`         |
| `--no-install`          | Generate files without installing dependencies.                    | Install         |
| `--no-git`              | Skip git initialization.                                           | Initialize      |
| `--repo <repo>`         | Download a custom template repository instead of the bundled base. | Bundled base    |
| `--branch <branch>`     | Download a repository branch instead of the bundled base.          | Template branch |

Better Auth selects Drizzle PostgreSQL automatically when `--database` is omitted. Combining `--auth better-auth` with `--database none` fails before creating files. Docker is independent of both integrations. A plain project contains no database or auth dependencies and requires no addon environment variables. Existing nonempty directories are rejected without deleting their contents.

Generated README files contain the setup steps for selected addons. The CLI creates `.env.example` and local `.env` files for selected addons, preserving existing `.env` files. Better Auth projects receive a unique random `BETTER_AUTH_SECRET` in `server/.env`; examples contain no auth secret. Review database credentials and server/client origins before deployment. Database migrations never run during install, build, or dev. Oxc projects are formatted after dependency installation. If using `--no-install`, run `bun install` and `bun run format` yourself.

## Optional commit checks and API documentation

```sh
bun dist/index.js ../my-app -y --precommit --scalar
```

Both flags are independent and off by default. `--precommit` adds `@j178/prek` as a root development dependency, equivalent to `bun add -D @j178/prek`. It installs the Git hook after generating the project when Git and dependency installation are enabled. When using `--no-install` or `--no-git`, install dependencies, initialize Git if needed, and run `bun run hooks:install`. Install hooks again in each clone.

`.pre-commit-config.yaml` checks staged formatting with Oxfmt and Oxlint, linting, workspace types, staged credentials with pinned Gitleaks, private keys, accidentally staged dotenv files, merge conflicts, large files, case conflicts, symlinks, JSON/JSONC, YAML, TOML, whitespace, final newlines, and line endings. Gitleaks redacts its output and prek manages its Go hook environment. Restage any formatter changes before retrying a commit. `bun run hooks:run` checks all tracked files, with Gitleaks checking staged changes. `bun run hooks:update` updates remote hook revisions. Tests remain a separate `bun run test` command.

`--scalar` adds `@scalar/hono-api-reference` only to the server runtime dependencies. Open <http://localhost:3000/scalar> after starting the server. `/openapi.json` serves the OpenAPI 3.1 document. The document initially describes `/health`. Update `server/src/openapi.ts` when API routes change. Scalar uses its default browser UI CDN. The integration keeps existing Hono routes and does not add database or auth dependencies unless those addons are selected.

Custom sources require `server/src/index.ts` with a `.get(...)` route and `export default app` for automatic Scalar wiring. Their existing routes are not guessed; document them in `server/src/openapi.ts`.

## Template maintenance

`src/templates/base` contains the default, Tailwind, and shadcn variants distributed with this CLI. The default comes from the sibling `bhvr` fork. The styled variants retain the upstream branch assets and share the updated server, shared workspace, and build configuration. No GitHub template download is needed during ordinary scaffolding.

After changing `../bhvr`, run `bun run sync:base`, review the bundled changes, and rebuild. Styled client-specific dependencies and assets remain in their respective variants. Addon files live under `src/templates/addons`; TanStack Router and Query overlays live under `src/templates/extras`. `src/utils/versions.ts` records dependency versions used by installers.

Versions were checked on 2026-10-10 and selected with a three-day minimum release age. The bundled templates and CLI use TypeScript 7.0.2. ESLint is no longer supported; Oxc is the only linter and formatter. Router choices are no router or TanStack Router. Hono RPC, React Router, and React Router MPA have been removed.

Custom repository downloads retain their TypeScript and application dependencies. With `--auth better-auth`, the installer edits `server/src/index.ts`: it expects `new Hono()`, `cors()`, at least one `.get(...)` route, and `export default app`. It enables credentialed CORS, registers `/api/auth/*`. Bundled templates already have this structure. A custom app that splits these across files or uses a different structure needs manual auth wiring; the installer rejects incompatible entry points.

## Verification

```bash
bun run type-check
bun run lint:check
bun run format:check
bun test
bun run test:combinations
bun run test:generated
bun run test:auth
bun run test:tools
```

`test:combinations` generates all 288 valid built-in content combinations without installing dependencies or initializing Git. It checks manifests, optional dependencies and files, routing, and unresolved placeholders. It does not compile or exercise every combination.

`test:generated` installs and checks 20 generated projects: all 12 core combinations of three styles, two router choices, and Query on or off, plus eight addon profiles. Each project must pass build, TypeScript, lint, formatting, and public API tests. Schema generation does not require a running database.

`test:auth` requires a running Docker daemon. It creates a temporary project and a disposable PostgreSQL container on an available local port. It checks email authentication, session protection, trusted origins, migration idempotence, auth schema regeneration, and data persistence across Compose restarts. It removes only its own container and volume afterward.

`test:tools` generates plain and authenticated scaffolds with both optional tools. It verifies Git hook installation, passing checks on clean staged files, blocked synthetic credentials with redacted output, blocked dotenv files, formatter correction, blocked lint and TypeScript errors, and working Scalar HTML and OpenAPI routes. It also checks builds, types, linting, formatting, and public API tests. The first run downloads the pinned Gitleaks hook environment.

## Development

Make sure [bun](https://bun.sh) is installed and up to date

```bash
bun --version
bun upgrade
```

Clone the repo, install dependencies, and build

```bash
git clone https://github.com/fear-rush/create-bhvr
cd create-bhvr
bun install
bun run build
```

After making changes you can test the CLI locally by running `bun` against the build folder

```bash
bun dist
```

Alternatively you can use `bun link` and use it as a local executable

```bash
bun link
create-bhvr
```

## Contributing

We welcome contributions from the community! Whether it's reporting a bug, suggesting a new feature, or submitting a pull request, your help is appreciated.

Please read our [**CONTRIBUTING.md**](CONTRIBUTING.md) for detailed guidelines on how to get started.

## Links

- [License (MIT)](LICENSE)
- [Contributing](CONTRIBUTING.md)
- [Docs](https://bhvr.dev)
