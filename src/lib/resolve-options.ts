import path from "node:path";
import type { ProjectOptions, ResolvedProjectOptions } from "@/types";
import { TEMPLATES } from "@/utils/templates";

export function resolveOptions(options: ProjectOptions): ResolvedProjectOptions {
	const template = options.template ?? "default";
	const router = options.router ?? "none";
	const auth = options.auth ?? "none";
	const database = options.database ?? (auth === "better-auth" ? "postgres" : "none");
	if (!Object.hasOwn(TEMPLATES, template)) throw new Error(`Unknown template: ${template}`);
	for (const key of ["rpc", "linter", "examples", "seed"]) {
		if (Object.hasOwn(options, key))
			throw new Error(`Removed option: ${key}. Choose only stack integrations.`);
	}
	if (!["none", "tanstackrouter"].includes(router)) throw new Error(`Unknown router: ${router}`);
	if (!["none", "postgres"].includes(database)) throw new Error(`Unknown database: ${database}`);
	if (!["none", "better-auth"].includes(auth)) throw new Error(`Unknown auth: ${auth}`);
	if (auth === "better-auth" && database === "none")
		throw new Error(
			"Better Auth requires --database postgres. Omit --database to select it automatically.",
		);
	const projectName = options.projectName?.trim();
	if (!projectName || path.resolve(projectName) === process.cwd())
		throw new Error("Choose a new project directory.");
	return {
		...options,
		projectName,
		template,
		router,
		database,
		auth,
		tailwind: template === "tailwind" || template === "shadcn",
		shadcn: template === "shadcn",
		tanstackQuery: options.tanstackQuery ?? false,
		dockerPostgres: options.dockerPostgres ?? false,
		precommit: options.precommit ?? false,
		scalar: options.scalar ?? false,
	};
}
