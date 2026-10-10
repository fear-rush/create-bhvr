import type { TemplateInfo } from "@/types";

export const TEMPLATES: Record<string, TemplateInfo> = {
	default: {
		branch: "main",
		description: "Basic setup with Bun, Hono, Vite and React",
	},
	tailwind: { branch: "tailwindcss", description: "Basic setup + TailwindCSS" },
	shadcn: {
		branch: "shadcn-ui",
		description: "Basic setup + TailwindCSS + shadcn/ui",
	},
};
