import { installAddons } from "@/installers/addons";
import { installDeveloperTools } from "@/installers/developer-tools";
import { tanstackQueryInstaller } from "@/installers/tanstack-query";
import { tanstackRouterInstaller } from "@/installers/tanstack-router";
import type { ResolvedProjectOptions } from "@/types";

export async function installPackages(options: ResolvedProjectOptions): Promise<boolean> {
	const installers = [];
	if (options.tanstackQuery) installers.push(tanstackQueryInstaller);
	if (options.router === "tanstackrouter") installers.push(tanstackRouterInstaller);
	for (const installer of installers) {
		if (!(await installer(options)))
			throw new Error("Failed to configure a selected project option.");
	}
	await installAddons(options);
	await installDeveloperTools(options);
	return true;
}
