import { consola } from "consola";
import pc from "picocolors";
import type { ProjectOptions, ResolvedProjectOptions } from "@/types";
import { TEMPLATES } from "@/utils/templates";
import { tryCatch } from "@/utils/try-catch";
import { resolveOptions } from "./resolve-options";

export async function promptForOptions(options: ProjectOptions): Promise<ResolvedProjectOptions> {
	let projectName = options.projectName;

	if (!projectName && !options.yes) {
		const { data, error } = await tryCatch(
			consola.prompt(pc.yellow("What is the name of your project?"), {
				type: "text",
				default: "my-bhvr-app",
				placeholder: "my-bhvr-app",
				cancel: "reject",
			}),
		);

		if (!data || error) {
			consola.error(pc.red("Project creation cancelled."));
			process.exit(1);
		}

		projectName = data;
	}

	let templateChoice = options.template || "default";

	if (!options.yes && !options.branch && !options.template) {
		const templateChoices = Object.keys(TEMPLATES).map((key) => ({
			label: `${key} (${TEMPLATES[key]?.description})`,
			value: key,
		}));

		const { data, error } = await tryCatch(
			consola.prompt(pc.yellow("Select a template:"), {
				type: "select",
				options: templateChoices,
				initial: "default",
				cancel: "reject",
			}),
		);

		if (!data || error) {
			consola.error("Project creation cancelled.");
			process.exit(1);
		}

		templateChoice = data;
	}

	let router = options.router;

	if (!options.yes && !options.router) {
		const { data: routerResponse, error } = await tryCatch(
			consola.prompt("Select a client router:", {
				type: "select",
				options: [
					{ label: "None (default)", value: "none" },
					{ label: "TanStack Router", value: "tanstackrouter" },
				],
				initial: "none",
				cancel: "reject",
			}),
		);

		if (error) {
			console.log(pc.yellow("Project creation cancelled."));
			process.exit(1);
		}

		router = routerResponse as ProjectOptions["router"];
	}

	let useTanstackQuery = options.tanstackQuery;

	if (!options.yes && !options.tanstackQuery) {
		const { data: tanstackQueryResponse, error } = await tryCatch(
			consola.prompt(
				"Would you like to enable TanStack Query for data fetching and state management?",
				{
					type: "confirm",
					initial: false,
				},
			),
		);

		if (error) {
			consola.error("Project creation cancelled.");
			process.exit(1);
		}

		useTanstackQuery = tanstackQueryResponse;
	}

	let auth = options.auth;
	if (!options.yes && auth === undefined) {
		auth = (await consola.prompt("Select authentication:", {
			type: "select",
			cancel: "reject",
			initial: "none",
			options: [
				{ label: "None (default)", value: "none" },
				{
					label: "Better Auth (includes Drizzle PostgreSQL)",
					value: "better-auth",
				},
			],
		})) as ProjectOptions["auth"];
	}
	let database = options.database;
	if (!options.yes && database === undefined && auth !== "better-auth") {
		database = (await consola.prompt("Select a database integration:", {
			type: "select",
			cancel: "reject",
			initial: "none",
			options: [
				{ label: "None (default)", value: "none" },
				{ label: "Drizzle + PostgreSQL", value: "postgres" },
			],
		})) as ProjectOptions["database"];
	}
	let dockerPostgres = options.dockerPostgres;
	if (!options.yes && dockerPostgres === undefined) {
		dockerPostgres = await consola.prompt("Include local PostgreSQL through Docker Compose?", {
			type: "confirm",
			cancel: "reject",
			initial: false,
		});
	}

	let precommit = options.precommit;
	if (!options.yes && precommit === undefined) {
		precommit = await consola.prompt("Include prek commit checks and secret scanning?", {
			type: "confirm",
			cancel: "reject",
			initial: false,
		});
	}
	let scalar = options.scalar;
	if (!options.yes && scalar === undefined) {
		scalar = await consola.prompt("Include Scalar API documentation?", {
			type: "confirm",
			cancel: "reject",
			initial: false,
		});
	}
	return resolveOptions({
		...options,
		projectName,
		template: templateChoice,
		tailwind: templateChoice === "tailwind" || templateChoice === "shadcn",
		shadcn: templateChoice === "shadcn",
		router,
		tanstackQuery: useTanstackQuery,
		auth,
		database,
		dockerPostgres,
		precommit,
		scalar,
	});
}
