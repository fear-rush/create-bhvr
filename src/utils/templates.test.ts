import { describe, expect, it } from "bun:test";
import { parseSync, Visitor } from "oxc-parser";
import { EXTRAS_DIR } from "./constants";
import { TEMPLATES } from "./templates";

describe("Templates", () => {
	it("all client overlays have valid JSX and unique attributes", async () => {
		for await (const file of new Bun.Glob("**/*.tsx").scan({
			cwd: EXTRAS_DIR,
			absolute: true,
			onlyFiles: true,
		})) {
			const text = await Bun.file(file).text();
			const result = parseSync(file, text);
			expect(result.errors).toEqual([]);
			new Visitor({
				JSXOpeningElement(node) {
					const names = node.attributes
						.filter((attribute) => attribute.type === "JSXAttribute")
						.map((attribute) => text.slice(attribute.name.start, attribute.name.end));
					expect(names).toEqual([...new Set(names)]);
				},
			}).visit(result.program);
		}
	});
	it("should have all required templates with correct structure", () => {
		const expectedTemplates = ["default", "tailwind", "shadcn"];

		expectedTemplates.forEach((templateName) => {
			expect(TEMPLATES).toHaveProperty(templateName);
			const template = TEMPLATES[templateName];
			expect(template).toHaveProperty("branch");
			expect(template).toHaveProperty("description");
			expect(typeof template?.branch).toBe("string");
			expect(typeof template?.description).toBe("string");
		});
	});
});
