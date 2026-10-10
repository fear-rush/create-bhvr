import path from "node:path";
import fs from "fs-extra";
import type { ResolvedProjectOptions } from "@/types";
import { ADDONS_DIR } from "@/utils/constants";
import { getVersion } from "@/utils/versions";
import { createOpenApiDocument } from "./openapi-document";

export async function installDeveloperTools(options: ResolvedProjectOptions): Promise<void> {
	const project = path.resolve(options.projectName);
	if (options.precommit) {
		const file = path.join(project, "package.json");
		const pkg = await fs.readJson(file);
		pkg.devDependencies ??= {};
		pkg.devDependencies["@j178/prek"] = getVersion("@j178/prek");
		Object.assign(pkg.scripts, {
			"hooks:install": "prek install",
			"hooks:run": "prek run --all-files",
			"hooks:update": "prek update",
		});
		await fs.writeJson(file, pkg, { spaces: 2 });
		const config = await fs.readFile(
			path.join(ADDONS_DIR, "prek/.pre-commit-config.yaml.template"),
			"utf8",
		);
		await fs.writeFile(
			path.join(project, ".pre-commit-config.yaml"),
			config
				.replace("{{format}}", "bun --bun run oxfmt --write")
				.replace("{{lint}}", "bun --bun run oxlint")
				.replace("{{formatFiles}}", "\\.[cm]?[jt]sx?$|\\.(jsonc?|css|scss|html|mdx?|ya?ml)$"),
		);
	}
	if (options.scalar) {
		const entry = path.join(project, "server/src/index.ts");
		let source = await fs.readFile(entry, "utf8");
		if (!/export default app\s*;?/.test(source) || !/\.get\(/.test(source)) {
			throw new Error(
				"Scalar automatic wiring requires server/src/index.ts with a .get(...) route and export default app. Custom templates with a different structure need manual docs wiring.",
			);
		}
		await fs.copy(path.join(ADDONS_DIR, "scalar"), project);
		await fs.writeFile(
			path.join(project, "server/src/openapi.ts"),
			`// Update this document when API routes change.\nexport const openApiDocument = ${JSON.stringify(createOpenApiDocument(options), null, 2)};\n`,
		);
		// Register documentation before the existing application routes.
		source = `import { docsRoutes } from "./docs";\n${source}`;
		source = source.replace(/\.get\(/, '.route("/", docsRoutes)\n.get(');
		await fs.writeFile(entry, source);
		const file = path.join(project, "server/package.json");
		const pkg = await fs.readJson(file);
		pkg.dependencies ??= {};
		pkg.dependencies["@scalar/hono-api-reference"] = getVersion("@scalar/hono-api-reference");
		await fs.writeJson(file, pkg, { spaces: 2 });
	}
	for (const addon of [options.precommit && "prek", options.scalar && "scalar"]) {
		if (!addon) continue;
		await fs.appendFile(
			path.join(project, "README.md"),
			`\n\n${await fs.readFile(path.join(ADDONS_DIR, `${addon}.md`), "utf8")}`,
		);
	}
}
