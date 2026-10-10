import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import fs from "fs-extra";

const cli = path.resolve(import.meta.dir, "../dist/index.js");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-generated-"));
const cases: [string, string[]][] = [];
for (const template of ["default", "tailwind", "shadcn"]) {
	for (const router of ["none", "tanstackrouter"]) {
		for (const query of [false, true]) {
			cases.push([
				`core-${template}-${router}-${query ? "query" : "fetch"}`,
				["--template", template, "--router", router, ...(query ? ["--tsquery"] : [])],
			]);
		}
	}
}
cases.push(
	["addons-drizzle", ["--database", "postgres"]],
	["addons-docker", ["--docker-postgres"]],
	["addons-auth", ["--auth", "better-auth"]],
	["addons-scalar", ["--scalar"]],
	["addons-prek", ["--precommit"]],
	["addons-postgres-router", ["--database", "postgres", "--tsquery", "--router", "tanstackrouter"]],
	["addons-auth-shadcn", ["--auth", "better-auth", "--template", "shadcn"]],
	[
		"addons-full",
		[
			"--auth",
			"better-auth",
			"--docker-postgres",
			"--tsquery",
			"--router",
			"tanstackrouter",
			"--template",
			"shadcn",
			"--precommit",
			"--scalar",
		],
	],
);

const prefix = process.argv[2];
const selected = prefix ? cases.filter(([name]) => name.startsWith(prefix)) : cases;
if (selected.length === 0) throw new Error(`No generated-project cases match ${prefix}`);
try {
	for (const [name, flags] of selected) {
		const project = path.join(temporary, name);
		console.log(`Checking generated project: ${name}`);
		await execa("bun", [cli, project, "-y", "--no-git", ...flags]);
		if (flags.includes("better-auth") || flags.includes("postgres")) {
			await fs.writeFile(
				path.join(project, "server", ".env"),
				`DATABASE_URL=postgresql://unused:unused@localhost:1/unused\nBETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}\n`,
			);
		}
		for (const command of ["build", "type-check", "lint", "test"]) {
			await execa("bun", ["run", command], { cwd: project });
		}
		await execa("bun", ["run", "format:check"], { cwd: project });
		if (flags.includes("postgres") || flags.includes("better-auth")) {
			const result = await execa("bun", ["run", "db:generate"], {
				cwd: project,
			});
			if (flags.includes("better-auth") && !result.stdout.includes("No schema changes"))
				throw new Error(`Bundled migration mismatch: ${name}`);
		}
		console.log(`Passed: ${name}`);
	}
	console.log(`Passed all ${selected.length} generated-project checks.`);
} catch (error) {
	console.error(`Generated projects retained for debugging: ${temporary}`);
	throw error;
}
await fs.remove(temporary);
