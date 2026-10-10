import { execa } from "execa";
import type { ProjectOptions, ProjectResult } from "@/types";
import { initializeGit } from "./initialize-git";
import { installDependencies } from "./install-dependencies";
import { installPackages } from "./install-packages";
import { promptForOptions } from "./prompt-for-options";
import { scaffoldTemplate } from "./scaffold-template";

export async function createProject(
	projectDirectory: string,
	options: ProjectOptions,
): Promise<ProjectResult | null> {
	const projectOptions = await promptForOptions({
		...options,
		projectName: projectDirectory,
	});

	if (!projectOptions) {
		return null;
	}

	const scaffolded = await scaffoldTemplate(projectOptions);

	if (!scaffolded) {
		return null;
	}

	await installPackages(projectOptions);

	const gitInitialized =
		projectOptions.git !== false &&
		(await initializeGit(projectOptions.projectName ?? projectDirectory, projectOptions.yes));

	const dependenciesInstalled =
		projectOptions.install !== false &&
		(await installDependencies(projectOptions.projectName ?? projectDirectory, projectOptions.yes));
	if (dependenciesInstalled) {
		await execa("bun", ["run", "format"], { cwd: projectOptions.projectName });
	}

	const hooksInstalled = Boolean(
		projectOptions.precommit && gitInitialized && dependenciesInstalled,
	);
	if (hooksInstalled) {
		await execa("bun", ["run", "hooks:install"], {
			cwd: projectOptions.projectName,
		});
	}

	return {
		projectName: projectOptions.projectName ?? projectDirectory,
		gitInitialized,
		hooksInstalled,
		dependenciesInstalled,
		template: projectOptions.template ?? "default",
		database: projectOptions.database,
		auth: projectOptions.auth,
		dockerPostgres: projectOptions.dockerPostgres,
		precommit: projectOptions.precommit,
		scalar: projectOptions.scalar,
	};
}
