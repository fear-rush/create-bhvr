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
		if (flags.includes("tanstackrouter")) {
			const tree = path.join(project, "client", "src", "routeTree.gen.ts");
			if (!(await fs.pathExists(tree)))
				throw new Error(`Install did not generate the route tree: ${name}`);
			// Verify editor types before build or type-check can regenerate the file.
			await execa("bun", ["run", "tsc", "-b", "--noEmit"], { cwd: path.join(project, "client") });
			// A cached workspace build must not prevent regeneration after a clean checkout.
			await fs.remove(tree);
			await execa("bun", ["install", "--frozen-lockfile"], { cwd: project });
			if (!(await fs.pathExists(tree)))
				throw new Error(`Reinstall did not restore the route tree: ${name}`);
		}
		if (flags.includes("better-auth") || flags.includes("postgres")) {
			await fs.writeFile(
				path.join(project, "server", ".env"),
				`DATABASE_URL=postgresql://unused:unused@localhost:1/unused\nBETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}\n`,
			);
		}
		for (const command of ["build", "type-check", "lint", "test"]) {
			const result = await execa("bun", ["run", command], { cwd: project });
			const output = `${result.stdout}\n${result.stderr}`;
			if (/replaceRouteChunk|Fast refresh only works|react\(only-export-components\)/.test(output))
				throw new Error(`Router warning in ${name}: ${command}\n${output}`);
		}
		if (flags.includes("tanstackrouter")) {
			const assets = await fs.readdir(path.join(project, "client", "dist", "assets"));
			if (!assets.some((file) => /^routes-.*\.js$/.test(file)))
				throw new Error(`Missing code-split route chunk: ${name}`);
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
