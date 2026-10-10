import path from "node:path";
import fs from "fs-extra";

export async function removeLintTools(projectPath: string): Promise<void> {
	for (const workspace of ["", "client", "server", "shared"]) {
		const dir = path.join(projectPath, workspace);
		const file = path.join(dir, "package.json");
		const pkg = await fs.readJson(file);
		for (const key of ["dependencies", "devDependencies"]) {
			for (const name of Object.keys(pkg[key] ?? {})) {
				if (
					name.includes("eslint") ||
					name === "globals" ||
					name === "oxlint" ||
					name === "oxfmt" ||
					name === "@biomejs/biome"
				)
					delete pkg[key][name];
			}
		}
		if (workspace) delete pkg.scripts?.lint;
		await fs.writeJson(file, pkg, { spaces: 2 });
		for (const config of ["eslint.config.js", ".oxlintrc.json", ".oxfmtrc.json", "biome.json"]) {
			await fs.remove(path.join(dir, config));
		}
	}
}
