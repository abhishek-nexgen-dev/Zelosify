# Zelosify Implementation Plan and Current State

This plan is aligned to the actual repository layout. It distinguishes shipped code from work that still needs local services, verification, or new product scope. The complete endpoint contract is in [`api.doc.md`](api.doc.md); UI requirements and sketches are in [`PRODUCT_PAGE_SPEC.md`](PRODUCT_PAGE_SPEC.md) and [`Zelosify-Frontend/Design.md`](Zelosify-Frontend/Design.md).

## Repository map

- Frontend: `Zelosify-Frontend/` (Next.js 15; App Router plus legacy Pages Router).
- Backend: `Zelosify-Backend/Server/` (Express, TypeScript, ESM).
- API entry point: `Zelosify-Backend/Server/src/index.ts`, mounts routers under `/api/v1`.
- Prisma schema and migrations: `Zelosify-Backend/Server/prisma/`.
- Frontend feature API/hooks/state: `Zelosify-Frontend/src/features/`, `src/hooks/`, `src/redux/`.

## Implemented vertical slices

### 1. Candidate/public jobs

Public job list/detail; candidate-owned PDF, DOC, and DOCX resume upload; application submission and status; authorized resume replacement; asynchronous recommendation state. Candidate application history is paginated, and the API returns aggregate counts for the dashboard.

### 2. Vendor submissions

Tenant opening browse/detail; multi-file signed upload; backend verification of key ownership, storage metadata, file type/size/signature; transactional profile creation; own-profile preview and soft deletion. UI omits all AI output. Storage and database writes are not a distributed transaction.

### 3. Manager/recruiter review

Tenant and owner-scoped openings; paginated candidate review; backend-derived score, band, confidence, reason and latency; shortlist/reject decisions; manager-page virtualization when a loaded page has more than 50 items. A legacy manager profiles endpoint is unpaginated; frontend uses the paginated jobs candidate API.

### 4. Resume analysis

LangChain document loading with bounded PDF/DOC/DOCX candidate parsing and PDF/PPTX vendor parsing; persisted required skills and extracted profile facts; deterministic score and recommendation bands; bounded Groq or Gemini model workflow with registered tools and validated output; explicit PENDING/PROCESSING/COMPLETED/FAILED persistence. Confidence remains heuristic. Work is in-process and can be interrupted by restart.

### 5. Authentication and tenant setup

Keycloak password login/TOTP and authenticated-user route; candidate-only public registration; server-controlled candidate role and configured default tenant; permission-aware team management. `ADMIN` and `IT_VENDOR` can create recruiters and hiring managers; `HIRING_MANAGER` can create recruiters; recruiter accounts cannot create team members. The Prisma role enum includes `IT_VENDOR` after applying the additive migration.

## Remaining validation and product work

### Phase A — Apply schema and verify integration

1. Configure PostgreSQL and apply committed migrations against the intended database; do not reset shared data.
2. Start Keycloak and verify the configured realm, client, account bootstrap, and TOTP flow.
3. Configure private GCS or S3 credentials and the exact frontend CORS origin.
4. Configure Groq or Gemini and exercise candidate and vendor upload-to-review journeys with test data.

### Phase B — Production hardening

1. Move recommendation jobs to a durable queue/worker with idempotency, retry/backoff, failure recovery, and monitoring.
2. Add orphan-object cleanup after failed submissions and malware scanning/content inspection.
3. Add secure account invitation and credential setup flows for internal team accounts.
4. Add candidate profile editing only if product scope requires it and a tenant-safe update API is available.
5. Define operational rate limits, retention/deletion policy, and audit-log review.

### Phase C — Experience and performance validation

1. Browser-check the public, candidate, vendor, manager, recruiter and admin journeys.
2. Verify responsive layouts, focus order, keyboard-only interactions, dialog focus management and screen-reader status announcements.
3. Run tenant-boundary and cross-vendor denial checks against a real test database.
4. Benchmark realistic resume/provider workloads and report P50/P95 and per-profile latency; do not use the deterministic matching smoke test as SLA evidence.

## Verification commands

| Directory | Command |
|---|---|
| `Zelosify-Backend/Server` | `npm run test -- --run` |
| `Zelosify-Backend/Server` | `npm run build` |
| `Zelosify-Backend/Server` | `npm run prisma:deploy` (only after target DB is confirmed) |
| `Zelosify-Frontend` | `npm run lint` |
| `Zelosify-Frontend` | `npm run build` |

Keep the exact outputs, service availability, and any skipped checks in [`IMPLEMENTATION_NOTES.md`](IMPLEMENTATION_NOTES.md). Never infer a working provider workflow from compilation alone.
