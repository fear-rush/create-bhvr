import path from "node:path";
import fs from "fs-extra";
import type { ResolvedProjectOptions } from "@/types";

export async function installAgentDocs(options: ResolvedProjectOptions): Promise<void> {
	const project = path.resolve(options.projectName);
	const pkg = await fs.readJson(path.join(project, "package.json"));
	const commands = ["dev", "format", "lint", "type-check", "test", "build"].filter(
		(command) => pkg.scripts?.[command],
	);
	const integrations: string[] = [];
	if (options.tailwind) integrations.push("Use Tailwind CSS for styling.");
	if (options.shadcn)
		integrations.push(
			"shadcn/ui is configured in `client/components.json`; add components as needed.",
		);
	if (options.router === "tanstackrouter")
		integrations.push(
			"Add file routes under `client/src/routes`. `bun install` generates the route tree; use `bun run routes:generate` to regenerate it. Do not edit `routeTree.gen.ts` by hand.",
		);
	if (options.tanstackQuery)
		integrations.push(
			"TanStack Query's provider is in `client/src/main.tsx`; use it for server state.",
		);
	if (options.database === "postgres")
		integrations.push(
			"Export Drizzle tables from `server/src/db/schema/index.ts`. Run `bun run db:generate`, review the SQL, then apply it with `bun run db:migrate`. Migrations are explicit.",
		);
	if (options.dockerPostgres)
		integrations.push(
			"Use `bun run db:up` and `bun run db:down` for local PostgreSQL. Keep `DATABASE_URL`, when used, consistent with `.env` and `compose.yaml`.",
		);
	if (options.auth === "better-auth")
		integrations.push(
			"Better Auth is configured in `server/src/auth.ts` and `client/src/lib/auth-client.ts`. After changing auth configuration, run `bun run auth:generate` before generating a migration.",
		);
	if (options.scalar)
		integrations.push(
			"Update `server/src/openapi.ts` when API routes change; Scalar is served at `/scalar`.",
		);
	if (options.precommit)
		integrations.push(
			"Run `bun run hooks:install` in each clone; `bun run hooks:run` checks all files with prek.",
		);
	const sections = [
		"# Agent guide",
		"## Workspaces\n\n- `client/`: React and Vite.\n- `server/`: Hono API and server-only code.\n- `shared/`: TypeScript code shared by both workspaces.",
		`## Commands\n\nRun from the repository root. Use Bun and keep \`bun.lock\` updated.\n\n${commands.map((command) => `- \`bun run ${command}\``).join("\n")}`,
		"## Working rules\n\n- Read `README.md` for environment setup.\n- Keep database access and secrets on the server. `VITE_` variables are public.\n- Use the existing Oxlint and Oxfmt configuration, including the generic anti-slop rules.\n- Keep changes focused. Run checks relevant to the change and report any failures.",
	];
	if (integrations.length)
		sections.push(
			`## Selected integrations\n\n${integrations.map((line) => `- ${line}`).join("\n")}`,
		);
	for (const [name, content] of [
		["AGENTS.md", `${sections.join("\n\n")}\n`],
		["CLAUDE.md", "@AGENTS.md\n"],
	] as const) {
		const file = path.join(project, name);
		if (!(await fs.pathExists(file))) await fs.writeFile(file, content);
	}
}
