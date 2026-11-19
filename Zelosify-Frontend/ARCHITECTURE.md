# Zelosify Application Architecture

This document describes the repository as it exists, not a proposed directory tree. Read it alongside the root `AGENTS.md`, [Design.md](Design.md), the [API reference](../api.doc.md), and [implementation notes](../IMPLEMENTATION_NOTES.md). The original assignment documents remain authoritative when available.

## System map

```text
Next.js frontend (5173)
  ├── App Router: jobs, candidate, recruiter, vendor, manager, admin pages
  ├── Pages Router: legacy auth and user dashboard pages
  ├── Redux Toolkit: authentication and manager opening state
  └── Axios: http://localhost:5000/api/v1
          │ HttpOnly Keycloak cookies / bearer token
          ▼
Express TypeScript API (5000)
  ├── Auth + user lookup: /api/v1/auth
  ├── Open jobs and recruiting: /api/v1/jobs
  ├── Candidate applications: /api/v1/candidate
  ├── Hiring decisions: /api/v1/candidates
  ├── Vendor workflow: /api/v1/vendor
  ├── Manager aliases: /api/v1/hiring-manager
  └── Admin + legacy storage: /api/v1/admin, /api/v1/aws
          │
          ├── Prisma → PostgreSQL
          ├── Keycloak → identity, password auth, realm roles, TOTP
          ├── GCS or S3 → private resume objects and signed URLs
          └── PDF/DOC/DOCX candidate extraction and PDF/PPTX vendor extraction → deterministic match tools → validated Groq or Gemini workflow
```

## Repository map

### Frontend (`Zelosify-Frontend/`)

- `src/app/`: current App Router pages and layouts.
- `src/pages/`: legacy Pages Router screens, including authentication.
- `src/features/`: feature API calls and feature components for candidate, vendor, hiring manager, and related workflows.
- `src/redux/`: Redux store and slices.
- `src/components/`: shared layout, UI, authentication, and page components.
- `src/hooks/`: reusable auth and dashboard hooks.
- `src/utils/Axios/`: shared Axios configuration.
- `src/middleware.js`: protected-route navigation guard based on auth cookie presence. It is not the authorization boundary; APIs perform role and ownership checks.
- `frontend-rules/FRONTEND_REDUX_STANDARDS_GUIDE.md`: Redux conventions.

The main product uses App Router while older login/auth pages remain under Pages Router. Do not migrate routers for isolated feature work.

### Backend (`Zelosify-Backend/Server/`)

- `src/index.ts`: starts Keycloak, Prisma connectivity, middleware, and mounts all routers under `/api/v1`.
- `src/routers/`: endpoint methods and auth/role/validation middleware.
- `src/controllers/`: request/response handling and Prisma workflows.
- `src/services/ai/`: orchestration, tool registry, schemas, deterministic matching, and resume parsing.
- `src/services/storage/`: GCS/S3 abstractions and signed URL support.
- `src/middlewares/auth/`: token verification and role checks.
- `src/validations/`: Zod request schemas.
- `prisma/schema.prisma`: PostgreSQL model/enums.
- `prisma/migrations/`: committed additive database changes.
- `tests/`: Vitest unit/security/storage tests and helpers.

Controllers currently use Prisma directly in several features. Do not assume repository/service layers exist for every endpoint; follow the local implementation unless extracting a boundary is part of the requested change.

## Request flow and trust boundaries

1. Browser uses `NEXT_PUBLIC_BACKEND_URL` and includes cookies for authenticated API requests. Candidate applications use a single multipart request; vendor uploads use signed storage URLs and send file bytes without app cookies.
2. Backend authentication verifies the access token and loads the application user from Prisma.
3. Role middleware gates endpoint groups. Feature handlers derive tenant/user/manager IDs from the authenticated request.
4. Backend verifies uploaded object key scope, metadata, size, content type, and initial signature before persisting applications/profiles.
5. Recommendation state is claimed and persisted in PostgreSQL; manager/recruiter APIs return authorized screening results, while vendor endpoints omit AI fields.

Never trust client-supplied tenant, uploader, owner, role, decision score, or recommendation. Presigned URLs are temporary bearer tokens and must not be logged or returned to unauthorized users.

## AI workflow

```text
Persist profile → claim PENDING/FAILED row as PROCESSING
  → fetch authorized object → load and parse the supported resume document
  → extract/normalize candidate features
  → deterministic skill/experience/location score
  → bounded, registered LangChain tools with Groq or Gemini
  → validate output → persist COMPLETED or safe FAILED state
```

Candidate applications accept PDF, DOC, or DOCX; vendor profile submissions retain PDF/PPTX support. Scoring remains deterministic and server-side. The LLM must not replace score calculations. Resume text is untrusted input. Groq and Gemini are supported through the configured LangChain workflow. The confidence field is heuristic, not calibrated probability.

## Design and API contracts

- `Design.md`: black-first colors, component reuse, responsive behavior, accessibility and interaction states.
- Root `PRODUCT_PAGE_SPEC.md`: routes, page behavior and UI sketches.
- Root `api.doc.md`: mounted method/path/access/request/response/error documentation.
- Root `setup.md`: local services, env configuration, migrations and startup.

Update API and product documentation when route contracts or visible behavior change.

## Current limitations

- Recommendation work is asynchronous inside the web process; it is not backed by a durable queue/worker.
- Candidate profile is read-only; there is no profile-edit API.
- Candidate and vendor upload workflows require configured private storage credentials and CORS.
- Live Keycloak, database migration, object storage, SMTP, and AI workflows require local service configuration and are not proven by unit tests/builds.
- The repository's legacy pages remain alongside newer App Router pages.

See `IMPLEMENTATION_NOTES.md` for checked commands and exact remaining work.
