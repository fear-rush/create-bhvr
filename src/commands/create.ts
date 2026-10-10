import pc from "picocolors";
import { displayBanner } from "@/lib/display-banner";
import type { ProjectOptions } from "@/types";
import { createProject } from "../lib/create-project";

export const create = async (projectDirectory: string, options: ProjectOptions) => {
	try {
		displayBanner();
		const result = await createProject(projectDirectory, options);
		if (result) {
			console.log(pc.green("Project created."));
			console.log("\nNext steps:");
			if (!result.dependenciesInstalled) {
				console.log(pc.cyan(`  cd ${result.projectName}`));
				console.log(pc.cyan("  bun install"));
			} else {
				console.log(pc.cyan(`  cd ${result.projectName}`));
			}
			if (result.precommit && !result.hooksInstalled) {
				if (!result.gitInitialized) console.log(pc.cyan("  git init"));
				console.log(pc.cyan("  bun run hooks:install"));
			}
			if (result.database === "postgres") {
				console.log(pc.cyan("  cp server/.env.example server/.env"));
			}
			if (result.auth === "better-auth")
				console.log(pc.cyan("  cp client/.env.example client/.env"));
			if (result.auth === "better-auth") {
				console.log(
					"  Set BETTER_AUTH_SECRET in server/.env. See README.md for authentication setup.",
				);
			}
			if (result.dockerPostgres) {
				console.log(pc.cyan("  cp .env.example .env"));
				console.log(pc.cyan("  bun run db:up"));
			}
			if (result.auth === "better-auth") console.log(pc.cyan("  bun run db:migrate"));
			console.log(pc.cyan("  bun run dev:client   # Start the client"));
			console.log(pc.cyan("  bun run dev:server   # Start the server in another terminal"));
			console.log(pc.cyan("  bun run dev          # Start all"));
			if (result.scalar) console.log("  API reference: http://localhost:3000/scalar");
			process.exit(0);
		}
	} catch (err) {
		console.error(pc.red("Error creating project:"), err);
		process.exit(1);
	}
};
