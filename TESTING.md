# Testing

Use Bun 1.4.4 or newer and Node.js 22.22 or newer. The generator and generated projects use Oxc.

```sh
bun install
bun run type-check
bun run lint:check
bun run format:check
bun test
bun run test:combinations
bun run test:generated
```

`test:combinations` generates every valid built-in content configuration without installing dependencies or initializing Git. The 288 cases cover three styles, no router or TanStack Router, Query on or off, three valid database/auth states, and independent Docker, prek, and Scalar flags. It checks files, manifests, dependency absence, and unresolved placeholders. It does not prove compilation or runtime correctness for all cases.

`test:generated` installs and checks all 12 core style/router/Query combinations plus eight addon profiles. Every case must pass build, types, lint, formatting, and public API tests. Database profiles also check migration snapshots. Pass a case prefix to `bun scripts/verify-generated.ts`, for example `core-shadcn` or `addons`.

```sh
bun run test:tools
bun run test:auth
```

`test:tools` checks Scalar responses and installed prek hooks, including formatter changes, lint failures, type errors, staged dotenv files, and synthetic credentials with redacted output. Its first run downloads the Gitleaks hook environment.

`test:auth` requires Docker. It checks email authentication, sessions, trusted origins, migrations, schema regeneration, and persistence using disposable PostgreSQL containers. Test containers and volumes are removed afterward.

CI runs the same checks. A failed build, type check, lint, formatting check, or integration test fails the job. Add regression cases when changing an installer or optional integration.
