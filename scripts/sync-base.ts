import path from "node:path";
import fs from "fs-extra";

// Run after editing the sibling bhvr fork. Styled variants retain their client assets.
const root = path.resolve(import.meta.dir, "..");
const source = path.resolve(root, "..", "bhvr");
const templates = path.join(root, "src", "templates", "base");
const excluded = new Set([
	".git",
	".github",
	"node_modules",
	"dist",
	"build",
	".turbo",
	"bun.lock",
	"bun.lockb",
	".DS_Store",
]);
// The Oxc addon bundles the plugin once for all generated variants.
const filter = (file: string) =>
	!file.startsWith(path.join(source, "tools", "oxlint", "anti-slop")) &&
	!excluded.has(path.basename(file)) &&
	(!/^\.env(?:\.|$)/.test(path.basename(file)) || file.endsWith(".example"));
await fs.remove(path.join(templates, "default"));
await fs.copy(source, path.join(templates, "default"), { filter });
for (const template of ["tailwind", "shadcn"]) {
	const target = path.join(templates, template);
	for (const dir of ["server", "shared"]) {
		await fs.remove(path.join(target, dir));
		await fs.copy(path.join(source, dir), path.join(target, dir), { filter });
	}
	for (const file of [
		"package.json",
		"turbo.json",
		"bunfig.toml",
		"tsconfig.json",
		"tsconfig.base.json",
		".oxlintrc.json",
		".oxfmtrc.json",
		".gitignore",
		"README.md",
	]) {
		await fs.copy(path.join(source, file), path.join(target, file));
	}
	for (const file of [
		"README.md",
		"tsconfig.node.json",
		"tsconfig.json",
		"index.html",
		"src/App.tsx",
	]) {
		await fs.copy(path.join(source, "client", file), path.join(target, "client", file));
	}
	const base = await fs.readJson(path.join(source, "client", "package.json"));
	const file = path.join(target, "client", "package.json");
	const styled = await fs.readJson(file);
	delete styled.dependencies.server;
	Object.assign(styled.dependencies, base.dependencies);
	for (const name of Object.keys(styled.devDependencies)) {
		if (name.includes("eslint") || name === "globals") delete styled.devDependencies[name];
	}
	await fs.remove(path.join(target, "eslint.config.js"));
	await fs.remove(path.join(target, "client", "eslint.config.js"));
	Object.assign(styled.devDependencies, base.devDependencies);
	styled.scripts = base.scripts;
	await fs.writeJson(file, styled, { spaces: 2 });
}
for (const template of ["default", "tailwind", "shadcn"]) {
	// Package managers omit .gitignore and bunfig.toml files when packing the CLI.
	for (const workspace of ["", "client", "server", "shared"]) {
		for (const name of [".gitignore", "bunfig.toml"]) {
			const file = path.join(templates, template, workspace, name);
			if (await fs.pathExists(file)) await fs.move(file, `${file}.template`, { overwrite: true });
		}
	}
	const test = path.join(templates, template, "server", "src", "index.test.ts");
	if (await fs.pathExists(test)) await fs.move(test, `${test}.template`, { overwrite: true });
}
console.log("Bundled base templates synced from ../bhvr.");
