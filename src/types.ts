export interface TemplateInfo {
	branch: string;
	description: string;
}

export type ProjectOptions = {
	projectName?: string;
	yes?: boolean;
	typescript?: boolean;
	repo?: string;
	template?: string;
	branch?: string;
	tailwind?: boolean;
	shadcn?: boolean;
	router?: "none" | "tanstackrouter";
	tanstackQuery?: boolean;
	database?: "none" | "postgres";
	dockerPostgres?: boolean;
	auth?: "none" | "better-auth";
	precommit?: boolean;
	scalar?: boolean;
	install?: boolean;
	git?: boolean;
};

export type ResolvedProjectOptions = ProjectOptions & {
	projectName: string;
	template: string;
	tailwind: boolean;
	shadcn: boolean;
	router: NonNullable<ProjectOptions["router"]>;
	tanstackQuery: boolean;
	database: NonNullable<ProjectOptions["database"]>;
	dockerPostgres: boolean;
	auth: NonNullable<ProjectOptions["auth"]>;
	precommit: boolean;
	scalar: boolean;
};

export interface ProjectResult {
	projectName: string;
	gitInitialized: boolean;
	hooksInstalled?: boolean;
	dependenciesInstalled: boolean;
	template: string;
	database?: ProjectOptions["database"];
	auth?: ProjectOptions["auth"];
	dockerPostgres?: boolean;
	precommit?: boolean;
	scalar?: boolean;
}
