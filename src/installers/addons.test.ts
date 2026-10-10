import { afterEach, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { createProject } from "@/lib/create-project";
import { resolveOptions } from "@/lib/resolve-options";
import { installAddons } from "./addons";
import type { ProjectOptions } from "@/types";

const projects: string[] = [];
afterEach(async () => {
	await Promise.all(projects.splice(0).map((project) => fs.remove(project)));
});

async function generate(options: ProjectOptions = {}) {
	const project = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-addon-test-"));
	projects.push(project);
	await createProject(project, {
		...options,
		yes: true,
		install: false,
		git: false,
	});
	return project;
}

test("plain projects use Oxc and TypeScript 7 without database or auth requirements", async () => {
	const project = await generate();
	const root = await fs.readJson(path.join(project, "package.json"));
	const server = await fs.readJson(path.join(project, "server/package.json"));
	expect(Object.keys(server.dependencies).sort()).toEqual(["hono", "shared"]);
	expect(root.scripts["db:migrate"]).toBeUndefined();
	expect(root.scripts.lint).toBe("oxlint .");
	expect(root.devDependencies.typescript).toBe("7.0.2");
	for (const workspace of ["", "client", "server", "shared"]) {
		const pkg = await fs.readJson(path.join(project, workspace, "package.json"));
		expect(Object.keys(pkg.devDependencies ?? {}).some((name) => name.includes("eslint"))).toBe(
			false,
		);
		expect(await fs.pathExists(path.join(project, workspace, "eslint.config.js"))).toBe(false);
	}
	expect(await fs.pathExists(path.join(project, "compose.yaml"))).toBe(false);
	expect(await fs.pathExists(path.join(project, "server/src/auth.ts"))).toBe(false);
	expect(await fs.pathExists(path.join(project, "node_modules"))).toBe(false);
	expect(await fs.pathExists(path.join(project, "server/src/index.test.ts"))).toBe(true);
});

test("Docker can be generated independently and its down command preserves data", async () => {
	const project = await generate({ dockerPostgres: true });
	const root = await fs.readJson(path.join(project, "package.json"));
	expect(root.scripts["db:down"]).toBe("docker compose down");
	expect(await fs.pathExists(path.join(project, "compose.yaml"))).toBe(true);
	expect(await fs.pathExists(path.join(project, "server/src/db"))).toBe(false);
	expect(await fs.readFile(path.join(project, ".env"), "utf8")).toBe(
		await fs.readFile(path.join(project, ".env.example"), "utf8"),
	);
});

test("auth, Query, routing, and Oxc compose without installing packages", async () => {
	const project = await generate({
		auth: "better-auth",
		tanstackQuery: true,
		router: "tanstackrouter",
	});
	const root = await fs.readJson(path.join(project, "package.json"));
	const client = await fs.readJson(path.join(project, "client/package.json"));
	const server = await fs.readJson(path.join(project, "server/package.json"));
	const entry = await fs.readFile(path.join(project, "server/src/index.ts"), "utf8");
	expect(root.scripts.lint).toBe("oxlint .");
	expect(root.scripts["db:migrate"]).toBeDefined();
	expect(root.scripts["db:up"]).toBeUndefined();
	expect(server.dependencies["drizzle-orm"]).toBeDefined();
	expect(server.dependencies["better-auth"]).toBeDefined();
	expect(client.dependencies["better-auth"]).toBeDefined();
	expect(client.dependencies["@tanstack/react-query"]).toBeDefined();
	expect(client.scripts.build).toContain("tsr generate");
	expect(server.exports["./client"]).toBeUndefined();
	expect(client.dependencies.server).toBeUndefined();
	expect(entry).toContain("const app = new Hono");
	expect(entry).toContain("/api/auth/*");
	expect(entry).toContain("credentials: true");
	expect(entry).toContain('"/health"');
	expect(await fs.pathExists(path.join(project, "server/drizzle/0000_auth.sql"))).toBe(true);
	const serverEnv = await fs.readFile(path.join(project, "server/.env"), "utf8");
	const example = await fs.readFile(path.join(project, "server/.env.example"), "utf8");
	expect(serverEnv).toMatch(/^BETTER_AUTH_SECRET=[a-f0-9]{64}$/m);
	expect(example).toContain("BETTER_AUTH_SECRET=\n");
	expect(serverEnv).toContain(
		"DATABASE_URL=postgresql://bhvr:bhvr_local_password@localhost:5432/bhvr",
	);
	expect(await fs.readFile(path.join(project, "client/.env"), "utf8")).toBe(
		await fs.readFile(path.join(project, "client/.env.example"), "utf8"),
	);
	expect(await fs.pathExists(path.join(project, "eslint.config.js"))).toBe(false);
	expect(await fs.pathExists(path.join(project, "client/eslint.config.js"))).toBe(false);
	expect(Object.keys(root.devDependencies).some((name) => name.includes("eslint"))).toBe(false);
	expect(await fs.pathExists(path.join(project, "node_modules"))).toBe(false);
});

test("invalid options and nonempty destinations preserve existing files", async () => {
	const project = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-existing-"));
	projects.push(project);
	const file = path.join(project, "keep.txt");
	await fs.writeFile(file, "keep this file");
	await expect(
		createProject(project, {
			yes: true,
			auth: "better-auth",
			database: "none",
		}),
	).rejects.toThrow("Better Auth requires");
	await expect(createProject(project, { yes: true })).rejects.toThrow("not empty");
	expect(await fs.readFile(file, "utf8")).toBe("keep this file");
});

test("auth rejects custom entry points that cannot be wired automatically", async () => {
	const project = await generate();
	const entry = path.join(project, "server/src/index.ts");
	const options = resolveOptions({ projectName: project, auth: "better-auth" });
	for (const source of [
		'const app = createApp(); app.use(cors()); app.get("/", handler); export default app;',
		"const app = new Hono(); app.use(cors()); export default app;",
		'const app = new Hono(); app.use(cors({ origin: "*" })); app.get("/", handler); export default app;',
	]) {
		await fs.writeFile(entry, source);
		await expect(installAddons(options)).rejects.toThrow("need manual auth wiring");
		expect(await fs.readFile(entry, "utf8")).toBe(source);
	}
});

test("Drizzle creates a local database env without auth files", async () => {
	const project = await generate({ database: "postgres" });
	expect(await fs.readFile(path.join(project, "server/.env"), "utf8")).toBe(
		await fs.readFile(path.join(project, "server/.env.example"), "utf8"),
	);
	expect(await fs.pathExists(path.join(project, "client/.env"))).toBe(false);
	expect(await fs.pathExists(path.join(project, ".env"))).toBe(false);
});

test("auth secrets are unique to each generated project and absent from examples", async () => {
	const first = await generate({ auth: "better-auth", dockerPostgres: true });
	const second = await generate({ auth: "better-auth", dockerPostgres: true });
	const readSecret = async (project: string) => {
		const content = await fs.readFile(path.join(project, "server/.env"), "utf8");
		return content.match(/^BETTER_AUTH_SECRET=(.+)$/m)?.[1];
	};
	const secret = await readSecret(first);
	expect(secret).toMatch(/^[a-f0-9]{64}$/);
	expect(await readSecret(second)).not.toBe(secret);
	expect(await fs.readFile(path.join(first, "server/.env.example"), "utf8")).not.toContain(secret!);
	expect(await fs.readFile(path.join(first, ".env"), "utf8")).toBe(
		await fs.readFile(path.join(first, ".env.example"), "utf8"),
	);
});

test("installing addons preserves existing local environment files", async () => {
	const project = await generate();
	const contents = {
		".env": "POSTGRES_PORT=5433\n",
		"server/.env": "DATABASE_URL=postgresql://custom\nBETTER_AUTH_SECRET=keep-this-secret\n",
		"client/.env": "VITE_SERVER_URL=https://custom.example\n",
	};
	for (const [file, content] of Object.entries(contents)) {
		await fs.writeFile(path.join(project, file), content);
	}
	await installAddons(
		resolveOptions({ projectName: project, auth: "better-auth", dockerPostgres: true }),
	);
	for (const [file, content] of Object.entries(contents)) {
		expect(await fs.readFile(path.join(project, file), "utf8")).toBe(content);
	}
});
