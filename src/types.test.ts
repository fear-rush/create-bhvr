import { describe, expect, it } from "bun:test";
import type { ProjectOptions, ProjectResult, TemplateInfo } from "./types";

describe("TypeScript types", () => {
	it("should define correct type structures", () => {
		// Test that types can be instantiated correctly
		const templateInfo: TemplateInfo = {
			branch: "main",
			description: "Test template",
		};

		const options: ProjectOptions = {
			projectName: "test-project",
			router: "tanstackrouter",
		};

		const result: ProjectResult = {
			projectName: "test-project",
			gitInitialized: true,
			dependenciesInstalled: false,
			template: "default",
		};

		expect(templateInfo.branch).toBe("main");
		expect(options.router).toBe("tanstackrouter");
		expect(result.projectName).toBe("test-project");
	});
});
