# Zelosify Backend

Express/TypeScript API, Prisma schema, PostgreSQL migrations, Keycloak integration, private object-storage adapters, and resume-analysis services live in `Server/`.

## Start locally

Follow the repository [setup guide](../setup.md) for complete Keycloak, PostgreSQL, GCS/S3, tenant seeding, and AI configuration.

```bash
cd Server
npm ci
cp .env.example .env
# Edit .env with local secrets and service settings.
npm run prisma:generate
npm run prisma:deploy
npm run seed:openings
npm run dev
```

Run `npm run prisma:deploy` before seeding a fresh database. `npm run dev` and `npm start` also apply committed Prisma migrations before launching the API. If you launch `dist/index.js` directly, first run `npm run prisma:deploy`. The server checks that its configured database contains the migrated schema and exits with an actionable error instead of continuing with failed bootstrap or recommendation recovery.

Start Keycloak in a separate terminal with `npm run keycloak:start`, configure `KEYCLOAK_CLIENT_SECRET` in `.env`, and wait for the `Zelosify` realm discovery endpoint to respond before starting the API. Registration requires Keycloak.

The API defaults to `http://localhost:5000`; versioned routes use `/api/v1`. Health check: `GET http://localhost:5000/` returns `Server Connected!`.

## Important configuration

- Configure a PostgreSQL `DATABASE_URL` for your local PostgreSQL service (default port 5432), `SESSION_SECRET`, `JWT_SECRET`, and Keycloak realm/client settings. Docker Compose is optional and uses port 5445 with database `zelosify_recruit_test`.
- Use a private storage bucket and configure backend credentials plus browser CORS (`PUT`, `Content-Type`, exact frontend origin).
- Select `AI_AGENT_PROVIDER=groq` or `AI_AGENT_PROVIDER=gemini` and configure the matching API key and model. Both providers use the LangChain resume-analysis workflow.
- Set `DEFAULT_TENANT_ID` to the tenant configured for this environment; startup provisions or verifies that tenant before candidate signup.
- Apply migrations, including the `IT_VENDOR` role migration, before enabling vendor accounts.

Do not use `.env.example` placeholder values as production credentials. Do not run `prisma:reset` against data you need.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Apply migrations, then start the development server on configured `PORT` (default 5000) |
| `npm run build` | Generate Prisma client and compile TypeScript |
| `npm start` | Apply migrations, then run compiled server from `dist/` |
| `npm run test -- --run` | Run Vitest once |
| `npm run prisma:generate` | Generate Prisma client without migrating |
| `npm run prisma:deploy` | Apply committed migrations without resetting existing data |
| `npm run seed:openings` | Seed the documented demo tenant/openings |

## API contract

See the root [API reference](../api.doc.md) for all routes, auth scopes, request and response examples, errors, and operational caveats. Recommendations currently run asynchronously in the web process; there is no durable queue worker.
