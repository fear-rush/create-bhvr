import type { ResolvedProjectOptions } from "@/types";

export function createOpenApiDocument(options: ResolvedProjectOptions) {
	return {
		openapi: "3.1.0",
		info: { title: "API", version: "1.0.0" },
		paths:
			options.repo || options.branch
				? {}
				: {
						"/health": {
							get: {
								operationId: "health",
								responses: {
									"200": {
										description: "Server is running",
										content: {
											"application/json": {
												schema: {
													type: "object",
													required: ["status"],
													properties: { status: { type: "string", const: "ok" } },
												},
											},
										},
									},
								},
							},
						},
					},
	};
}
