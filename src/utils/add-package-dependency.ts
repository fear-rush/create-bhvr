import path from "node:path";
import fs from "fs-extra";
import { VERSIONS } from "./versions";

export interface AddPackageDependencyOptions {
	dependencies: string[];
	devMode?: boolean;
	projectName: string;
	target?: "client" | "server";
}

export const addPackageDependency = async (opts: AddPackageDependencyOptions) => {
	const { dependencies, devMode = false, projectName, target } = opts;

	// Early validation - only validate project name, allow empty dependencies
	if (!projectName.trim()) {
		throw new Error("Project name is required");
	}

	// Determine working directory
	const projectPath = path.resolve(process.cwd(), projectName);
	let workingDir = projectPath;

	if (target) {
		workingDir = path.join(projectPath, target);
	}

	try {
		if (dependencies.length === 0) return;
		const file = path.join(workingDir, "package.json");
		const pkg = await fs.readJson(file);
		const key = devMode ? "devDependencies" : "dependencies";
		pkg[key] ??= {};
		for (const dependency of dependencies) {
			const separator = dependency.lastIndexOf("@");
			const name = separator > 0 ? dependency.slice(0, separator) : dependency;
			const version = separator > 0 ? dependency.slice(separator + 1) : VERSIONS[name];
			if (!version) throw new Error(`No tested version configured for ${name}`);
			pkg[key][name] = version;
		}
		await fs.writeJson(file, pkg, { spaces: 2 });
	} catch (error) {
		const targetSuffix = target ? ` in ${target}` : "";
		throw new Error(
			`Failed to install dependencies${targetSuffix}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
};
