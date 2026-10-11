import { afterEach, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { createProject } from "@/lib/create-project";
import { resolveOptions } from "@/lib/resolve-options";
import { installAgentDocs } from "./agent-docs";

const projects: string[] = [];
afterEach(async () => {
	await Promise.all(projects.splice(0).map((project) => fs.remove(project)));
});

test("default projects include a small guide without optional stack instructions", async () => {
	const project = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-agent-docs-"));
	projects.push(project);
	await createProject(project, { yes: true, install: false, git: false });
	const guide = await fs.readFile(path.join(project, "AGENTS.md"), "utf8");
	expect(guide.split(/\s+/).length).toBeLessThan(150);
	expect(guide).toContain("`client/`");
	expect(guide).not.toMatch(/db:|auth:|hooks:|routeTree|Scalar|shadcn|Tailwind|TanStack/);
	const pkg = await fs.readJson(path.join(project, "package.json"));
	for (const match of guide.matchAll(/`bun run ([\w:-]+)`/g))
		expect(pkg.scripts[match[1]!]).toBeDefined();
	expect(await fs.readFile(path.join(project, "CLAUDE.md"), "utf8")).toBe("@AGENTS.md\n");
});

test("custom repository guides are preserved and only available commands are documented", async () => {
	const project = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-agent-docs-"));
	projects.push(project);
	await fs.writeJson(path.join(project, "package.json"), { scripts: { lint: "oxlint ." } });
	const options = resolveOptions({ projectName: project, repo: "owner/custom" });
	await fs.writeFile(path.join(project, "CLAUDE.md"), "Existing Claude instructions\n");
	await installAgentDocs(options);
	const guide = await fs.readFile(path.join(project, "AGENTS.md"), "utf8");
	expect(guide).toContain("`bun run lint`");
	expect(guide).not.toContain("`bun run build`");
	expect(await fs.readFile(path.join(project, "CLAUDE.md"), "utf8")).toBe(
		"Existing Claude instructions\n",
	);
	await fs.writeFile(path.join(project, "AGENTS.md"), "Existing agent instructions\n");
	await fs.remove(path.join(project, "CLAUDE.md"));
	await installAgentDocs(options);
	expect(await fs.readFile(path.join(project, "AGENTS.md"), "utf8")).toBe(
		"Existing agent instructions\n",
	);
	expect(await fs.readFile(path.join(project, "CLAUDE.md"), "utf8")).toBe("@AGENTS.md\n");
});
