import { expect, test } from "bun:test";
import { resolveOptions } from "./resolve-options";

test("defaults use Oxc and leave database and auth addons disabled", () => {
	const options = resolveOptions({ projectName: "new-app" });
	expect(options).toMatchObject({
		database: "none",
		auth: "none",
		dockerPostgres: false,
		router: "none",
	});
});
test("auth implies Drizzle but does not require Docker", () => {
	expect(resolveOptions({ projectName: "new-app", auth: "better-auth" })).toMatchObject({
		database: "postgres",
		dockerPostgres: false,
	});
});
test("rejects explicit database conflicts and invalid choices before scaffolding", () => {
	expect(() =>
		resolveOptions({
			projectName: "new-app",
			auth: "better-auth",
			database: "none",
		}),
	).toThrow("Better Auth requires");
	for (const removed of ["rpc", "linter", "examples", "seed"]) {
		expect(() => resolveOptions({ projectName: "new-app", [removed]: true })).toThrow(
			"Removed option",
		);
	}
	for (const router of ["reactrouter", "reactroutermpa"]) {
		expect(() => resolveOptions({ projectName: "new-app", router } as never)).toThrow(
			"Unknown router",
		);
	}
	expect(() => resolveOptions({ projectName: "." })).toThrow("Choose a new project directory");
});
test("Docker and tooling work without an ORM or authentication", () => {
	expect(
		resolveOptions({
			projectName: "new-app",
			dockerPostgres: true,
		}),
	).toMatchObject({
		database: "none",
		auth: "none",
		dockerPostgres: true,
	});
});
