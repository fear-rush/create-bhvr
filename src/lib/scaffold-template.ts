import path from "node:path";
import degit from "degit";
import fs from "fs-extra";
import pc from "picocolors";
import yoctoSpinner from "yocto-spinner";
import type { ResolvedProjectOptions } from "@/types";
import { BASE_DIR, DEFAULT_REPO } from "@/utils/constants";
import { TEMPLATES } from "@/utils/templates";

export async function scaffoldTemplate(options: ResolvedProjectOptions): Promise<boolean> {
	const { projectName, template, repo, branch } = options;

	const projectPath = path.resolve(process.cwd(), projectName);

	if (fs.existsSync(projectPath)) {
		const files = fs.readdirSync(projectPath);
		if (files.length > 0) {
			throw new Error(`Project directory is not empty: ${projectPath}`);
		}
	}

	fs.ensureDirSync(projectPath);

	const repoPath = repo || DEFAULT_REPO;
	const templateConfig = TEMPLATES[template as keyof typeof TEMPLATES] || TEMPLATES.default;
	const repoBranch = branch || (templateConfig?.branch ?? "main");
	const repoUrl = `${repoPath}#${repoBranch}`;
	const spinner = yoctoSpinner({ text: "Preparing template..." }).start();

	try {
		if (!repo && !branch) {
			await fs.copy(path.join(BASE_DIR, template), projectPath);
			for (const workspace of ["", "client", "server", "shared"]) {
				for (const name of [".gitignore", "bunfig.toml"]) {
					const file = path.join(projectPath, workspace, `${name}.template`);
					if (await fs.pathExists(file)) await fs.move(file, file.replace(/\.template$/, ""));
				}
			}
			const testTemplate = path.join(projectPath, "server", "src", "index.test.ts.template");
			if (await fs.pathExists(testTemplate))
				await fs.move(testTemplate, testTemplate.replace(/\.template$/, ""));
		} else {
			const emitter = degit(repoUrl, {
				cache: false,
				force: true,
				verbose: false,
			});

			await emitter.clone(projectPath);
		}
		spinner.success(`Template prepared (${template})`);

		const pkgJsonPath = path.join(projectPath, "package.json");
		if (fs.existsSync(pkgJsonPath)) {
			const pkgJson = await fs.readJson(pkgJsonPath);
			pkgJson.name = path.basename(projectPath);
			await fs.writeJson(pkgJsonPath, pkgJson, { spaces: 2 });
			if (!repo && !branch) {
				const readme = await fs.readFile(path.join(BASE_DIR, "README.md"), "utf8");
				await fs.writeFile(
					path.join(projectPath, "README.md"),
					readme.replaceAll("{{projectName}}", pkgJson.name),
				);
			}
		}

		const gitDir = path.join(projectPath, ".git");
		if (fs.existsSync(gitDir)) {
			await fs.remove(gitDir);
			console.log(pc.blue("Removed .git directory"));
		}

		return true;
	} catch (err) {
		spinner.error("Failed to prepare template");
		throw err;
	}
}
