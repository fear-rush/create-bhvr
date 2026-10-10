import { expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

test("removed CLI options fail before creating a project", async () => {
	const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-removed-options-"));
	try {
		for (const flags of [
			["--rpc"],
			["--examples"],
			["--seed"],
			["--linter", "oxc"],
			["--linter", "biome"],
			["--router", "reactrouter"],
			["--router", "reactroutermpa"],
		]) {
			const project = path.join(temporary, "project");
			const child = Bun.spawn(
				[
					"bun",
					path.resolve(import.meta.dir, "../index.ts"),
					project,
					"-y",
					"--no-install",
					"--no-git",
					...flags,
				],
				{ stdout: "pipe", stderr: "pipe" },
			);
			const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
			expect(code).toBe(1);
			expect(stderr).toContain("error:");
			expect(await fs.pathExists(project)).toBe(false);
		}
	} finally {
		await fs.remove(temporary);
	}
});
