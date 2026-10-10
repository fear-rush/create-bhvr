import path from "node:path";
import fs from "fs-extra";
import { removeLintTools } from "@/lib/remove-lint-tools";
import type { ResolvedProjectOptions } from "@/types";
import { ADDONS_DIR } from "@/utils/constants";
import { getVersion, VERSIONS } from "@/utils/versions";

type PackageJson = {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	scripts: Record<string, string>;
};

async function updatePackage(
	projectPath: string,
	workspace: string,
	update: (pkg: PackageJson) => void,
) {
	const file = path.join(projectPath, workspace, "package.json");
	const pkg = await fs.readJson(file);
	pkg.dependencies ??= {};
	pkg.devDependencies ??= {};
	pkg.scripts ??= {};
	update(pkg);
	await fs.writeJson(file, pkg, { spaces: 2 });
}

export async function installAddons(options: ResolvedProjectOptions): Promise<void> {
	const projectPath = path.resolve(options.projectName);
	const copy = (addon: string) => fs.copy(path.join(ADDONS_DIR, addon), projectPath);
	const rootScripts: Record<string, string> = {};
	const serverEnv: string[] = [];

	if (options.database === "postgres") {
		await copy("drizzle");
		await updatePackage(projectPath, "server", (pkg) => {
			Object.assign(pkg.dependencies, {
				"drizzle-orm": VERSIONS["drizzle-orm"],
				postgres: VERSIONS.postgres,
			});
			Object.assign(pkg.devDependencies, {
				"drizzle-kit": VERSIONS["drizzle-kit"],
			});
			for (const task of ["generate", "migrate", "studio"]) {
				pkg.scripts[`db:${task}`] = `bun --bun run drizzle-kit ${task}`;
				rootScripts[`db:${task}`] = `bun run --cwd server db:${task}`;
			}
		});
		serverEnv.push("DATABASE_URL=postgresql://bhvr:bhvr_local_password@localhost:5432/bhvr");
	}
	if (options.dockerPostgres) {
		await copy("docker-postgres");
		Object.assign(rootScripts, {
			"db:up": "docker compose up -d --wait postgres",
			"db:down": "docker compose down",
			"db:logs": "docker compose logs -f postgres",
		});
	}
	if (options.auth === "better-auth") {
		await copy("better-auth");
		await updatePackage(projectPath, "server", (pkg) => {
			pkg.dependencies["better-auth"] = getVersion("better-auth");
			pkg.devDependencies.auth = getVersion("auth");
			pkg.scripts["auth:generate"] =
				"auth generate --config ./src/auth.ts --output ./src/db/schema/auth.ts --yes";
		});
		await updatePackage(projectPath, "client", (pkg) => {
			pkg.dependencies["better-auth"] = getVersion("better-auth");
		});
		rootScripts["auth:generate"] = "bun run --cwd server auth:generate";
		serverEnv.push(
			"BETTER_AUTH_SECRET=",
			"BETTER_AUTH_URL=http://localhost:3000",
			"CLIENT_URL=http://localhost:5173",
		);
		const entry = path.join(projectPath, "server", "src", "index.ts");
		let source = await fs.readFile(entry, "utf8");
		if (
			!/export default app\s*;?/.test(source) ||
			!/cors\(\)/.test(source) ||
			!/new Hono\(\)/.test(source) ||
			!/\.get\(/.test(source)
		) {
			throw new Error(
				"Better Auth automatic wiring requires server/src/index.ts with new Hono(), cors(), a .get(...) route, and export default app. Custom templates with a different structure need manual auth wiring.",
			);
		}
		source = `import { auth } from "./auth";\n${source}`;
		source = source.replace(
			/cors\(\)/g,
			'cors({ origin: process.env.CLIENT_URL ?? "http://localhost:5173", credentials: true })',
		);
		// Register auth routes before the existing application routes.

		source = source.replace(
			/\.get\(/,
			'.all("/api/auth/*", (c) => auth.handler(c.req.raw))\n\n.get(',
		);
		await fs.writeFile(entry, source);
	}
	await removeLintTools(projectPath);
	await copy("oxc");
	await updatePackage(projectPath, "", (pkg) => {
		Object.assign(pkg.devDependencies, {
			oxlint: VERSIONS.oxlint,
			oxfmt: VERSIONS.oxfmt,
		});
	});
	Object.assign(rootScripts, {
		lint: "oxlint .",
		"lint:fix": "oxlint --fix .",
		format: "oxfmt --write .",
		"format:check": "oxfmt --check .",
	});
	if (serverEnv.length)
		await fs.writeFile(
			path.join(projectPath, "server", ".env.example"),
			`${serverEnv.join("\n")}\n`,
		);
	if (Object.keys(rootScripts).length)
		await updatePackage(projectPath, "", (pkg) => {
			Object.assign(pkg.scripts, rootScripts);
		});
	const selected = [
		options.database === "postgres" && "drizzle",
		options.dockerPostgres && "docker-postgres",
		options.auth === "better-auth" && "better-auth",
		"oxc",
	].filter((value): value is string => typeof value === "string");
	for (const addon of selected) {
		const instructions = await fs.readFile(path.join(ADDONS_DIR, `${addon}.md`), "utf8");
		await fs.appendFile(path.join(projectPath, "README.md"), `\n\n${instructions}`);
	}
	if (serverEnv.length) {
		const file = path.join(projectPath, "turbo.json");
		const turbo = await fs.readJson(file);
		const env = serverEnv.map((line) => line.split("=")[0]);
		for (const task of ["dev", "test"]) {
			turbo.tasks[task].passThroughEnv = [
				...new Set([...(turbo.tasks[task].passThroughEnv ?? []), ...env]),
			];
		}
		await fs.writeJson(file, turbo, { spaces: 2 });
	}
}
