import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import fs from "fs-extra";

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-tools-"));
const cli = path.resolve(import.meta.dir, "../dist/index.js");
const cases: [string, string[]][] = [
	["oxc", []],
	[
		"private",
		["--auth", "better-auth", "--tsquery", "--template", "shadcn", "--router", "tanstackrouter"],
	],
];
try {
	for (const [name, flags] of cases) {
		const project = path.join(temporary, name);
		console.log(`Checking optional developer tools: ${name}`);
		await execa("bun", [cli, project, "-y", "--precommit", "--scalar", ...flags]);
		assert(
			await fs.pathExists(path.join(project, ".git/hooks/pre-commit")),
			"Git hook was not installed",
		);
		if (name === "private")
			await fs.writeFile(
				path.join(project, "server/.env"),
				`DATABASE_URL=postgresql://unused:unused@localhost:1/unused\nBETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}\n`,
			);
		const check = path.join(project, "server/src/docs.verify.ts");
		await fs.writeFile(
			check,
			`import assert from "node:assert/strict";
import app from "./index";
const ui = await app.request("/scalar");
assert.equal(ui.status, 200);
assert.match(ui.headers.get("content-type") ?? "", /text\\/html/);
const html = await ui.text();
assert(html.includes("/openapi.json"));
const response = await app.request("/openapi.json");
assert.equal(response.status, 200);
const spec = await response.json();
assert.equal(spec.openapi, "3.1.0");
assert(spec.paths["/health"].get);
assert.equal((await app.request("/health")).status, 200);
assert.deepEqual(Object.keys(spec.paths), ["/health"]);
`,
		);
		await execa("bun", [check], { cwd: path.join(project, "server") });
		await fs.remove(check);
		await execa("git", ["add", "."], { cwd: project });
		await execa("bun", ["run", "hooks:run"], { cwd: project });
		for (const command of ["build", "type-check", "lint", "format:check", "test"])
			await execa("bun", ["run", command], { cwd: project });
		const run = async (hook: string) =>
			execa("bun", ["--bun", "run", "prek", "run", hook], {
				cwd: project,
				reject: false,
			});
		const env = path.join(project, "server/.env.commit-test");
		await fs.writeFile(env, "LOCAL_SETTING=development\n");
		await execa("git", ["add", "--force", "server/.env.commit-test"], {
			cwd: project,
		});
		assert.notEqual(
			(await run("deny-filename-pattern")).exitCode,
			0,
			"Dotenv staging was not blocked",
		);
		await execa("git", ["rm", "--cached", "server/.env.commit-test"], {
			cwd: project,
		});
		await fs.remove(env);
		const secret = path.join(project, "credentials.commit-test.txt");
		const fakeKey = ["AKIA", "ABCD2345EFGH67JK"].join("");
		await fs.writeFile(secret, `aws_access_key_id = ${fakeKey}\n`);
		await execa("git", ["add", "credentials.commit-test.txt"], {
			cwd: project,
		});
		const scanned = await run("gitleaks");
		assert.notEqual(scanned.exitCode, 0, "Synthetic credential was not blocked");
		assert(
			!scanned.stdout.includes(fakeKey) && !scanned.stderr.includes(fakeKey),
			"Secret appeared in scan output",
		);
		await execa("git", ["rm", "--cached", "credentials.commit-test.txt"], {
			cwd: project,
		});
		await fs.remove(secret);
		const formatting = path.join(project, "server/src/format-check.ts");
		await fs.writeFile(formatting, "export const formatted={value:1};\n");
		await execa("git", ["add", "server/src/format-check.ts"], { cwd: project });
		assert.notEqual(
			(await run("format")).exitCode,
			0,
			"Formatter changes did not block the commit",
		);
		await execa("git", ["add", "server/src/format-check.ts"], { cwd: project });
		assert.equal((await run("format")).exitCode, 0, "Formatted file did not pass");
		await fs.writeFile(formatting, "export function unreachable() { return 1; return 2; }\n");
		await execa("git", ["add", "server/src/format-check.ts"], { cwd: project });
		assert.notEqual((await run("lint")).exitCode, 0, "Lint error was not blocked");
		await execa("git", ["rm", "--cached", "server/src/format-check.ts"], {
			cwd: project,
		});
		await fs.remove(formatting);
		const badTypes = path.join(project, "server/src/commit-check.ts");
		await fs.writeFile(badTypes, "export const value: string = 1;\n");
		await execa("git", ["add", "server/src/commit-check.ts"], { cwd: project });
		assert.notEqual((await run("type-check")).exitCode, 0, "Type error was not blocked");
		await execa("git", ["rm", "--cached", "server/src/commit-check.ts"], {
			cwd: project,
		});
		await fs.remove(badTypes);
		await execa("bun", ["run", "hooks:run"], { cwd: project });
		await execa(path.join(project, ".git/hooks/pre-commit"), [], {
			cwd: project,
		});
		console.log(
			`Passed docs routes, build, Git hook activation, credential rejection, dotenv rejection, format correction, lint rejection, and type rejection: ${name}`,
		);
	}
} catch (error) {
	console.error(`Developer-tool projects retained for debugging: ${temporary}`);
	throw error;
}
await fs.remove(temporary);
