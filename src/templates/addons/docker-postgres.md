## Local PostgreSQL with Docker

Install Docker with Compose. Copy `.env.example` to `.env`, then run `bun run db:up`. PostgreSQL listens on localhost and stores data in a named volume. `bun run db:down` preserves that volume. `bun run db:logs` streams database logs.

Change `POSTGRES_PORT` if another database uses port 5432. If using Drizzle, match the database name, username, password, and port in `server/.env` to the Compose settings. The example credentials are for local development. Use your deployment environment's connection string in production.

Docker is independent of Drizzle and Better Auth. You can connect using any PostgreSQL client. PostgreSQL 18 stores the named volume at `/var/lib/postgresql`; changing major versions requires a database upgrade procedure.
