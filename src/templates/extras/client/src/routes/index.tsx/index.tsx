import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: function Index() {
		return <main />;
	},
});
