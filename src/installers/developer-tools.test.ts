import { afterEach, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { createProject } from "@/lib/create-project";
import { resolveOptions } from "@/lib/resolve-options";
import type { ProjectOptions } from "@/types";
import { installDeveloperTools } from "./developer-tools";

const projects: string[] = [];
afterEach(async () => {
	await Promise.all(projects.splice(0).map((project) => fs.remove(project)));
});
async function generate(options: ProjectOptions = {}) {
	const project = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-tools-test-"));
	projects.push(project);
	const result = await createProject(project, {
		...options,
		yes: true,
		install: false,
		git: false,
	});
	return { project, result };
}
async function document(project: string) {
	const source = await fs.readFile(path.join(project, "server/src/openapi.ts"), "utf8");
	return JSON.parse(
		source
			.slice(source.indexOf("= ") + 2)
			.trim()
			.replace(/;$/, ""),
	);
}

test("new developer tools have no files, dependencies, or scripts by default", async () => {
	const { project, result } = await generate();
	expect(result?.precommit).toBe(false);
	expect(result?.scalar).toBe(false);
	for (const file of [".pre-commit-config.yaml", "server/src/docs.ts", "server/src/openapi.ts"])
		expect(await fs.pathExists(path.join(project, file))).toBe(false);
	for (const workspace of ["", "client", "server", "shared"]) {
		const pkg = await fs.readJson(path.join(project, workspace, "package.json"));
		for (const name of ["@j178/prek", "@scalar/hono-api-reference"])
			expect({ ...pkg.dependencies, ...pkg.devDependencies }[name]).toBeUndefined();
		expect(pkg.scripts["hooks:install"]).toBeUndefined();
	}
});

test("prek uses Oxc and adds only a root development dependency", async () => {
	const { project, result } = await generate({ precommit: true });
	expect(result?.hooksInstalled).toBe(false);
	const pkg = await fs.readJson(path.join(project, "package.json"));
	expect(pkg.devDependencies["@j178/prek"]).toBe("0.5.5");
	expect(pkg.dependencies?.["@j178/prek"]).toBeUndefined();
	expect(pkg.scripts.postinstall).not.toContain("prek");
	const config = await fs.readFile(path.join(project, ".pre-commit-config.yaml"), "utf8");
	expect(config).toContain("oxfmt --write");
	expect(config).toContain("gitleaks git --pre-commit --redact --staged");
	expect(config).toContain("bun run type-check");
	expect(config).not.toContain("{{");
	expect(await fs.pathExists(path.join(project, "server/src/docs.ts"))).toBe(false);
});

test("Scalar alone documents health route without introducing auth or database dependencies", async () => {
	const { project } = await generate({ scalar: true });
	const pkg = await fs.readJson(path.join(project, "server/package.json"));
	expect(pkg.dependencies["@scalar/hono-api-reference"]).toBe("0.12.11");
	expect(pkg.dependencies["drizzle-orm"]).toBeUndefined();
	expect(pkg.dependencies["better-auth"]).toBeUndefined();
	const doc = await document(project);
	expect(Object.keys(doc.paths)).toEqual(["/health"]);
	expect(doc.components?.securitySchemes).toBeUndefined();
	const entry = await fs.readFile(path.join(project, "server/src/index.ts"), "utf8");
	expect(entry).toContain("const app = new Hono");
	expect(entry).toContain('.route("/", docsRoutes)');
	expect(await fs.pathExists(path.join(project, ".pre-commit-config.yaml"))).toBe(false);
});

test("all selected integrations keep the application empty", async () => {
	const { project } = await generate({
		scalar: true,
		precommit: true,
		database: "postgres",
		auth: "better-auth",
		dockerPostgres: true,
		router: "tanstackrouter",
		tanstackQuery: true,
		template: "shadcn",
	});
	expect(Object.keys((await document(project)).paths)).toEqual(["/health"]);
	const page = await fs.readFile(path.join(project, "client/src/routes/index.tsx"), "utf8");
	expect(page).toContain("<main />");
	const server = await fs.readFile(path.join(project, "server/src/index.ts"), "utf8");
	expect(server).not.toContain("/api/me");
	expect(server).not.toContain("/api/notes");
	for (const file of [
		"client/src/examples",
		"client/src/assets",
		"client/src/components/ui/button.tsx",
		"server/src/db/seed.ts",
		"server/src/middleware/require-auth.ts",
	])
		expect(await fs.pathExists(path.join(project, file))).toBe(false);
	const client = await fs.readJson(path.join(project, "client/package.json"));
	expect(client.dependencies["@tanstack/react-router-devtools"]).toBeUndefined();
	expect(client.dependencies["@radix-ui/react-slot"]).toBeUndefined();
	expect(client.dependencies["class-variance-authority"]).toBeUndefined();
});

test("custom templates do not receive invented health documentation and reject unsupported entry points", async () => {
	const { project } = await generate();
	const options = resolveOptions({
		projectName: project,
		repo: "example/custom",
		scalar: true,
	});
	await installDeveloperTools(options);
	expect((await document(project)).paths).toEqual({});
	await fs.writeFile(path.join(project, "server/src/index.ts"), "export default {};\n");
	await expect(installDeveloperTools(options)).rejects.toThrow("Scalar automatic wiring requires");
});
