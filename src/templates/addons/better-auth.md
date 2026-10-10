## Better Auth

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`. Set a random `BETTER_AUTH_SECRET` of at least 32 characters. Set `BETTER_AUTH_URL` and `CLIENT_URL` to your server and client origins.

Apply the included auth migration with `bun run db:migrate`. The auth handler serves `/api/auth/*`; session lookup uses `/api/auth/get-session`. The client is configured in `client/src/lib/auth-client.ts`. No account UI or demo users are generated.

After changing auth configuration, run `bun run auth:generate`, then `bun run db:generate` and `bun run db:migrate`.
