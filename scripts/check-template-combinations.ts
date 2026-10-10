import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { createProject } from "../src/lib/create-project";
import type { ProjectOptions } from "../src/types";

// Exhaustive file/manifest checks, without network installs or Git initialization.
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-combinations-"));
let checked = 0;
const states: ProjectOptions[] = [{ database: "none", auth: "none" }];
for (const auth of ["none", "better-auth"] as const) states.push({ database: "postgres", auth });
// Keep progress readable while installers run for every configuration.
const originalLog = console.log;
const originalWrite = process.stderr.write;
console.log = () => {};
process.stderr.write = (() => true) as typeof process.stderr.write;
try {
	for (const template of ["default", "tailwind", "shadcn"]) {
		for (const router of ["none", "tanstackrouter"] as const) {
			for (const tanstackQuery of [false, true]) {
				for (const state of states) {
					for (const dockerPostgres of [false, true]) {
						for (const precommit of [false, true]) {
							for (const scalar of [false, true]) {
								const project = path.join(temporary, "project");
								const options = {
									...state,
									template,
									router,
									tanstackQuery,
									dockerPostgres,
									precommit,
									scalar,
									yes: true,
									install: false,
									git: false,
								};
								await createProject(project, options);
								const root = await fs.readJson(path.join(project, "package.json"));
								const client = await fs.readJson(path.join(project, "client/package.json"));
								const server = await fs.readJson(path.join(project, "server/package.json"));
								assert.equal(root.scripts.lint, "oxlint .");
								assert.equal(root.scripts.format, "oxfmt --write .");
								assert.equal(Boolean(root.devDependencies["@j178/prek"]), precommit);
								assert.equal(Boolean(server.dependencies["@scalar/hono-api-reference"]), scalar);
								assert.equal(
									Boolean(client.dependencies["@tanstack/react-router"]),
									router === "tanstackrouter",
								);
								assert.equal(Boolean(client.dependencies["@tanstack/react-query"]), tanstackQuery);
								assert.equal(client.dependencies.server, undefined);
								assert.equal(root.scripts["db:seed"], undefined);
								const page = await fs.readFile(
									path.join(
										project,
										router === "none" ? "client/src/App.tsx" : "client/src/routes/index.tsx",
									),
									"utf8",
								);
								assert(page.includes("<main />"));
								assert(!/useQuery|fetch\(|useState|Call API/.test(page));
								assert.equal(server.exports?.["./client"], undefined);
								for (const pkg of [root, client, server]) {
									for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
										assert(
											!name.includes("biome") &&
												!name.includes("eslint") &&
												name !== "react-router" &&
												!name.startsWith("@react-router/"),
										);
									}
								}
								for (const [file, enabled] of [
									["client/src/App.tsx", router === "none"],
									["client/src/routes/index.tsx", router === "tanstackrouter"],
									["client/src/examples/Examples.tsx", false],
									["server/src/db/seed.ts", false],
									["server/src/middleware/require-auth.ts", false],
									["client/src/assets", false],
									["client/src/components/ui/button.tsx", false],
									["server/src/auth.ts", state.auth === "better-auth"],
									["compose.yaml", dockerPostgres],
									[".pre-commit-config.yaml", precommit],
									["server/src/docs.ts", scalar],
								] as const)
									assert.equal(
										await fs.pathExists(path.join(project, file)),
										enabled,
										`${JSON.stringify(options)}: ${file}`,
									);
								assert.equal(
									await fs.pathExists(path.join(project, "server/src/client.ts")),
									false,
								);
								assert.equal(await fs.pathExists(path.join(project, "biome.json")), false);
								for await (const file of new Bun.Glob("**/*.{ts,tsx}").scan({
									cwd: project,
									absolute: true,
								})) {
									assert(
										!/\{\{\w+\}\}/.test(await fs.readFile(file, "utf8")),
										`Unresolved placeholder: ${file}`,
									);
								}
								await fs.remove(project);
								checked++;
							}
						}
					}
				}
			}
		}
		originalLog(`Checked combinations for ${template}: ${checked}`);
	}
} finally {
	console.log = originalLog;
	process.stderr.write = originalWrite;
	await fs.remove(temporary);
}
assert.equal(checked, 288);
console.log(`Passed all ${checked} valid built-in file/manifest combinations.`);
