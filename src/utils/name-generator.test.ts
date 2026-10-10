import { describe, expect, it } from "bun:test";
import { nameGenerator } from "./name-generator";

describe("nameGenerator", () => {
	describe("nameGenerator function", () => {
		it("should return original basename for empty options", async () => {
			const result = nameGenerator("template.txt", {});
			expect(result).toBe("template.txt");
		});

		it("should return original basename when all options are false", async () => {
			const options = {
				feature: false,
				shadcn: false,
				tailwind: false,
				tanstackQuery: false,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template.txt");
		});

		it("should return filename with '-with-' prefix when only one option is true", async () => {
			const options = {
				feature: true,
				shadcn: false,
				tailwind: false,
				tanstackQuery: false,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template-with-feature.txt");
		});

		it("should return multiple options with '-with-' prefix joined with dashes", async () => {
			const options = {
				feature: true,
				shadcn: true,
				tailwind: false,
				tanstackQuery: false,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template-with-feature-shadcn.txt");
		});

		it("should sort options alphabetically after '-with-' prefix", async () => {
			const options = {
				tailwind: true,
				feature: true,
				shadcn: true,
				tanstackQuery: false,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template-with-feature-shadcn-tailwind.txt");
		});

		it("should handle all options selected", async () => {
			const options = {
				tailwind: true,
				feature: true,
				shadcn: true,
				tanstackQuery: true,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template-with-feature-shadcn-tailwind-tanstackquery.txt");
		});

		it("should convert camelCase options to lowercase", async () => {
			const options = {
				tanstackQuery: true,
				feature: false,
				shadcn: false,
				tailwind: false,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template-with-tanstackquery.txt");
		});

		it("should handle mixed selections with alphabetical sorting", async () => {
			const options = {
				tanstackQuery: true,
				tailwind: true,
				feature: false,
				shadcn: false,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template-with-tailwind-tanstackquery.txt");
		});

		it("should handle different combinations maintaining alphabetical order", async () => {
			const options = {
				shadcn: true,
				tanstackQuery: true,
				feature: false,
				tailwind: false,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template-with-shadcn-tanstackquery.txt");
		});

		it("should handle single tailwind option", async () => {
			const options = {
				feature: false,
				shadcn: false,
				tailwind: true,
				tanstackQuery: false,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template-with-tailwind.txt");
		});

		it("should handle feature and tanstackQuery combination", async () => {
			const options = {
				feature: true,
				shadcn: false,
				tailwind: false,
				tanstackQuery: true,
			};
			const result = nameGenerator("template.txt", options);
			expect(result).toBe("template-with-feature-tanstackquery.txt");
		});

		it("should handle different file extensions", async () => {
			const options = {
				feature: true,
				shadcn: false,
				tailwind: false,
				tanstackQuery: false,
			};
			const result = nameGenerator("component.tsx", options);
			expect(result).toBe("component-with-feature.tsx");
		});

		it("should handle files without extensions", async () => {
			const options = {
				tailwind: true,
				shadcn: false,
				feature: false,
				tanstackQuery: false,
			};
			const result = nameGenerator("README", options);
			expect(result).toBe("README-with-tailwind");
		});

		it("should handle complex filenames", async () => {
			const options = {
				feature: true,
				shadcn: true,
				tailwind: false,
				tanstackQuery: false,
			};
			const result = nameGenerator("my-app-config.json", options);
			expect(result).toBe("my-app-config-with-feature-shadcn.json");
		});
	});
});
