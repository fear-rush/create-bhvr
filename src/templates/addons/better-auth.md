## Better Auth

`create-bhvr` creates `server/.env` and `client/.env` for local development, with a random `BETTER_AUTH_SECRET` unique to the project. Existing `.env` files are preserved. Before deployment, configure a separate production secret and update `BETTER_AUTH_URL`, `CLIENT_URL`, and `VITE_SERVER_URL` to your deployed origins. `.env.example` files contain reference defaults without secrets; keep `.env` files out of Git.

Apply the included auth migration with `bun run db:migrate`. The auth handler serves `/api/auth/*`; session lookup uses `/api/auth/get-session`. The client is configured in `client/src/lib/auth-client.ts`. No account UI or demo users are generated.

After changing auth configuration, run `bun run auth:generate`, then `bun run db:generate` and `bun run db:migrate`.
