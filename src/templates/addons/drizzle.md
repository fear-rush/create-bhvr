## Drizzle PostgreSQL

`create-bhvr` creates `server/.env` with a local PostgreSQL connection string and preserves an existing `.env`. Update `DATABASE_URL` when using a different PostgreSQL instance. Database code stays inside the server workspace. Export application tables from `server/src/db/schema/index.ts`.

1. Change the TypeScript schema.
2. Run `bun run db:generate`.
3. Review and commit the SQL and metadata in `server/drizzle/`.
4. Run `bun run db:migrate` against the target database.

`bun run db:studio` opens Drizzle Studio. Schema generation works without a running database. Migration and Studio commands require a connection. Install, build, and dev never apply migrations. In production, run migrations once as a deployment step before starting the new application version.

The initial schema is empty unless Better Auth is selected. Import `db` from `server/src/db/index.ts` when adding database queries. Use `sql.end()` when shutting down scripts that open the connection pool.
