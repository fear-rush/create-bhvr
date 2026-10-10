import { randomBytes } from "node:crypto";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import fs from "fs-extra";

const cli = path.resolve(import.meta.dir, "../dist/index.js");
const project = await fs.mkdtemp(path.join(os.tmpdir(), "bhvr-auth-"));
const composeName = `bhvr-auth-test-${randomBytes(4).toString("hex")}`;
const listener = net.createServer();
await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
const address = listener.address();
if (!address || typeof address === "string")
	throw new Error("Unable to reserve a PostgreSQL test port.");
const port = address.port;
await new Promise<void>((resolve, reject) =>
	listener.close((error) => (error ? reject(error) : resolve())),
);

const composeArgs = [
	"compose",
	"-p",
	composeName,
	"-f",
	path.join(project, "compose.yaml"),
	"--env-file",
	path.join(project, ".env"),
];
let started = false;
try {
	await execa("bun", [
		cli,
		project,
		"-y",
		"--no-git",
		"--auth",
		"better-auth",
		"--docker-postgres",
	]);
	await fs.writeFile(path.join(project, ".env"), `POSTGRES_PORT=${port}\n`);
	await fs.writeFile(
		path.join(project, "server/.env"),
		`DATABASE_URL=postgresql://bhvr:bhvr_local_password@localhost:${port}/bhvr\nBETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}\nBETTER_AUTH_URL=http://localhost:3000\nCLIENT_URL=http://localhost:5173\n`,
	);
	started = true;
	console.log("Starting disposable PostgreSQL and applying migrations twice.");
	await execa("docker", [...composeArgs, "up", "-d", "--wait", "postgres"]);
	await execa("bun", ["run", "db:migrate"], { cwd: project });
	await execa("bun", ["run", "db:migrate"], { cwd: project });
	const generated = await execa("bun", ["run", "db:generate"], {
		cwd: project,
	});
	if (!generated.stdout.includes("No schema changes"))
		throw new Error("The bundled auth schema does not match its migration snapshot.");
	await execa("bun", ["run", "auth:generate"], { cwd: project });
	const regenerated = await execa("bun", ["run", "db:generate"], {
		cwd: project,
	});
	if (!regenerated.stdout.includes("No schema changes"))
		throw new Error("Auth schema regeneration changed the bundled schema.");
	await fs.copy(
		path.join(import.meta.dir, "auth-flow.test.ts.template"),
		path.join(project, "server/src/auth-flow.test.ts"),
	);
	// Better Auth relaxes origin checks in NODE_ENV=test. Exercise development behavior.
	await execa("bun", ["test", "src/auth-flow.test.ts"], {
		cwd: path.join(project, "server"),
		env: { NODE_ENV: "development" },
		stdio: "inherit",
	});
	console.log("Checking data survives docker compose down.");
	await execa("docker", [...composeArgs, "down"]);
	await execa("docker", [...composeArgs, "up", "-d", "--wait", "postgres"]);
	await execa(
		"bun",
		[
			"--eval",
			'import {sql} from "./src/db"; const rows = await sql`select count(*)::int as count from "user"`; await sql.end(); if (rows[0].count < 1) throw new Error("Database data did not persist");',
		],
		{ cwd: path.join(project, "server") },
	);
	console.log(
		"Auth flow, migration idempotence, schema regeneration, and volume persistence passed.",
	);
} finally {
	if (started) await execa("docker", [...composeArgs, "down", "--volumes"]);
	await fs.remove(project);
}
