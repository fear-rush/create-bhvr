import path from "node:path";
import { consola } from "consola";
import fs from "fs-extra";
import pc from "picocolors";
import yoctoSpinner from "yocto-spinner";
import type { ResolvedProjectOptions } from "@/types";
import { EXTRAS_DIR } from "@/utils";
import { addPackageDependency } from "@/utils/add-package-dependency";
import { nameGenerator } from "@/utils/name-generator";

export const tanstackRouterInstaller = async (
	options: ResolvedProjectOptions,
): Promise<boolean> => {
	const spinner = yoctoSpinner({
		text: "Setting up TanStack Router...",
	}).start();

	try {
		const { projectName, shadcn, tailwind, tanstackQuery } = options;

		const projectPath = path.resolve(process.cwd(), projectName);
		spinner.text = "Installing TanStack Router...";
		await addPackageDependency({
			dependencies: ["@tanstack/react-router"],
			target: "client",
			projectName,
		});

		await addPackageDependency({
			dependencies: ["@tanstack/router-plugin", "@tanstack/router-cli"],
			devMode: true,
			target: "client",
			projectName,
		});

		const viteConfigTemplate = nameGenerator("vite.config.ts", {
			tailwind,
			shadcn,
			tanstackRouter: true,
		});
		const viteConfigSrc = path.join(EXTRAS_DIR, "client", "vite.config.ts", viteConfigTemplate);
		const viteConfigTarget = path.join(projectPath, "client", "vite.config.ts");
		fs.copySync(viteConfigSrc, viteConfigTarget);

		const rootTsxSrc = path.join(EXTRAS_DIR, "client", "src", "routes", "__root.tsx");
		const rootTsxTarget = path.join(projectPath, "client", "src", "routes", "__root.tsx");
		fs.copySync(rootTsxSrc, rootTsxTarget);

		const indexTsxSrc = path.join(EXTRAS_DIR, "client", "src", "routes", "index.tsx", "index.tsx");
		const indexTsxTarget = path.join(projectPath, "client", "src", "routes", "index.tsx");
		fs.copySync(indexTsxSrc, indexTsxTarget);

		const mainTsxSrc = path.join(
			EXTRAS_DIR,
			"client",
			"src",
			"main.tsx",
			nameGenerator("main.tsx", { tanstackQuery, tanstackRouter: true }),
		);
		const mainTsxTarget = path.join(projectPath, "client", "src", "main.tsx");
		fs.copySync(mainTsxSrc, mainTsxTarget);

		const appTsxTarget = path.join(projectPath, "client", "src", "App.tsx");
		await fs.remove(appTsxTarget);

		await fs.writeJson(
			path.join(projectPath, "client", "tsr.config.json"),
			{
				routesDirectory: "./src/routes",
				generatedRouteTree: "./src/routeTree.gen.ts",
			},
			{ spaces: 2 },
		);
		const pkgPath = path.join(projectPath, "client", "package.json");
		const pkg = await fs.readJson(pkgPath);
		pkg.scripts["routes:generate"] = "bun run --bun tsr generate";
		pkg.scripts.build = "bun run routes:generate && tsc -b && vite build";
		pkg.scripts["type-check"] = "bun run routes:generate && tsc -b --noEmit";
		await fs.writeJson(pkgPath, pkg, { spaces: 2 });
		const rootPkgPath = path.join(projectPath, "package.json");
		const rootPkg = await fs.readJson(rootPkgPath);
		rootPkg.scripts ??= {};
		rootPkg.scripts["routes:generate"] = "bun run --cwd client routes:generate";
		const postinstall = rootPkg.scripts.postinstall;
		rootPkg.scripts.postinstall = postinstall
			? `bun run routes:generate && ${postinstall}`
			: "bun run routes:generate";
		await fs.writeJson(rootPkgPath, rootPkg, { spaces: 2 });

		spinner.success("TanStack Router setup completed");
		return true;
	} catch (err: unknown) {
		spinner.error("Failed to set up TanStack Router");
		if (err instanceof Error) {
			consola.error(pc.red("Error:"), err.message);
		} else {
			consola.error(pc.red("Error: Unknown error"));
		}
		return false;
	}
};
