import { afterEach, beforeEach, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { addPackageDependency } from "./add-package-dependency";
import { VERSIONS } from "./versions";

let projectName: string;
beforeEach(async () => {
	projectName = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-dependencies-"));
	for (const workspace of ["", "client", "server"]) {
		await fs.outputJson(path.join(projectName, workspace, "package.json"), {
			name: workspace || "test-project",
			dependencies: { shared: "workspace:*" },
		});
	}
});
afterEach(async () => {
	await fs.remove(projectName);
});

test("stages pinned dependencies without installing or changing other workspaces", async () => {
	await addPackageDependency({
		projectName,
		target: "client",
		dependencies: ["react", "@tanstack/react-query"],
	});
	const client = await fs.readJson(path.join(projectName, "client/package.json"));
	expect(client.dependencies).toEqual({
		shared: "workspace:*",
		react: VERSIONS.react,
		"@tanstack/react-query": VERSIONS["@tanstack/react-query"],
	});
	expect((await fs.readJson(path.join(projectName, "server/package.json"))).dependencies).toEqual({
		shared: "workspace:*",
	});
	expect(await fs.pathExists(path.join(projectName, "node_modules"))).toBe(false);
});

test("preserves an explicit version and separates development dependencies", async () => {
	await addPackageDependency({
		projectName,
		dependencies: ["@example/package@1.2.3"],
		devMode: true,
	});
	const pkg = await fs.readJson(path.join(projectName, "package.json"));
	expect(pkg.devDependencies).toEqual({ "@example/package": "1.2.3" });
	expect(pkg.dependencies).toEqual({ shared: "workspace:*" });
});

test("rejects unknown packages and missing names", async () => {
	await expect(
		addPackageDependency({
			projectName,
			dependencies: ["unconfigured-package"],
		}),
	).rejects.toThrow("No tested version configured");
	await expect(addPackageDependency({ projectName: " ", dependencies: [] })).rejects.toThrow(
		"Project name is required",
	);
});
