#!/usr/bin/env node

import { Option } from "commander";
import { create } from "@/commands/create";
import { program } from "@/program";

program
	.name("create-bhvr")
	.description("Create a bhvr monorepo starter project")
	.argument("[project-directory]", "directory to create the project in")
	.option("-y, --yes", "skip confirmation prompts")
	.option("--repo <repo>", "specify a custom GitHub repository as source")
	.option("--template <template>", "specify a template (default, tailwind, shadcn)")
	.option("--branch <branch>", "specify a branch to use from the repository")
	.option("--tsquery", "use TanStack Query for data fetching and state management")
	.addOption(
		new Option("--router <router>", "select a client router").choices(["none", "tanstackrouter"]),
	)
	.addOption(
		new Option("--database <database>", "select a database integration").choices([
			"none",
			"postgres",
		]),
	)
	.option("--docker-postgres", "include local PostgreSQL through Docker Compose")
	.addOption(
		new Option(
			"--auth <auth>",
			"select authentication (Better Auth includes Drizzle PostgreSQL)",
		).choices(["none", "better-auth"]),
	)
	.option("--tanstack-query", "use TanStack Query (alias for --tsquery)")
	.option("--precommit", "include prek commit checks and secret scanning")
	.option("--scalar", "include Scalar API reference and an OpenAPI document")
	.option("--no-install", "skip dependency installation")
	.option("--no-git", "skip git initialization")
	.action((directory, options) =>
		create(directory, {
			...options,
			tanstackQuery: options.tanstackQuery ?? options.tsquery,
		}),
	);

await program.parseAsync();
