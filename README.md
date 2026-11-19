# Zelosify

Zelosify brings job discovery, candidate applications, and hiring-team review into one workspace. Candidates can explore open roles and track their applications. Recruiting teams can manage openings, review applications, and coordinate decisions. IT vendors can submit candidates to eligible openings.

## What the product supports

- Public job search with keyword and location filters.
- Candidate signup, required TOTP authentication, job applications, application tracking, and resume replacement.
- Tenant-scoped opening management and hiring-team assignment.
- Vendor resume submissions with ownership-scoped preview and removal.
- AI-assisted resume analysis with deterministic recommendation scores. Scores support human review; they do not make hiring decisions.
- Permission-aware workspaces for candidates, recruiters, hiring managers, IT vendors, and administrators.

Candidate applications accept PDF, DOC, and DOCX resumes up to 10 MiB. Vendor submissions accept the formats documented in the [API reference](api.doc.md). Live analysis requires a configured Groq or Gemini provider; xAI Grok remains available for compatible setups.

## Repository map

| Path | Purpose |
|---|---|
| `Zelosify-Frontend/` | Next.js and React web application |
| `Zelosify-Backend/Server/` | Express API, Prisma schema, and migrations |
| `api.doc.md` | Mounted API routes, access rules, and request/response contracts |
| `setup.md` | Local services, environment configuration, and startup |
| `PRODUCT_PAGE_SPEC.md` | Product routes, visible behavior, and integration notes |
| `IMPLEMENTATION_NOTES.md` | Dated verification results and known limitations |
| `Zelosify-Frontend/Design.md` | Black-first frontend design and interaction guidance |

## Local development

Follow the [setup guide](setup.md) to configure PostgreSQL, Keycloak, private object storage, and an AI provider. The default local API is `http://localhost:5000/api/v1`; the frontend runs at `http://localhost:5173`.

```bash
cd Zelosify-Backend/Server
npm ci
cp .env.example .env
# Set unique local secrets and service credentials in .env.
npm run prisma:generate
npm run prisma:deploy
npm run seed:openings
npm run dev
```

In another terminal:

```bash
cd Zelosify-Frontend
npm ci
cp .env.example .env.local
npm run dev
```

Do not commit `.env` or `.env.local`. Never use example credentials outside an isolated local environment. The frontend API origin is configured through `NEXT_PUBLIC_BACKEND_URL`.

## Verification

Run commands from their package directory:

| Package | Command |
|---|---|
| Backend | `npm run test -- --run` |
| Backend | `npm run build` |
| Frontend | `npm run lint` |
| Frontend | `npm run build` |

Passing unit tests and builds do not prove live database, Keycloak, storage, SMTP, or AI-provider behavior. See [implementation notes](IMPLEMENTATION_NOTES.md) for dated results and outstanding live checks.

## Project guides

- [API reference](api.doc.md)
- [Local setup](setup.md)
- [Product page specification](PRODUCT_PAGE_SPEC.md)
- [Frontend design](Zelosify-Frontend/Design.md)
- [Implementation plan](IMPLEMENTATION_PLAN.md)
- [Delivery checklist](checklist.md)
# Zelosify
