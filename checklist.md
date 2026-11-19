# Zelosify delivery status

This checklist summarizes what is implemented in the current checkout and what still needs live-service or product work. A passing unit test or build does not prove an external service workflow works. See [`IMPLEMENTATION_NOTES.md`](IMPLEMENTATION_NOTES.md) for dated verification evidence.

## Product workflows

- [x] Public visitors can search open jobs and view job details.
- [x] Candidate accounts use Keycloak authentication and TOTP; public signup assigns the configured tenant and candidate role on the server.
- [x] Candidate applications support PDF, DOC, and DOCX resumes up to 10 MiB, application tracking, authorized resume replacement, and analysis status.
- [x] IT vendors can submit supported PDF/PPTX profiles to tenant openings and manage their own submissions; vendor screens do not expose candidate recommendation output.
- [x] Recruiters and hiring managers can review in-scope applicants and make human shortlist/reject decisions.
- [x] Admins and IT vendors can create recruiters and hiring managers; hiring managers can create recruiters; recruiters cannot create team members.
- [x] Permission-aware UI is paired with backend role, permission, tenant, and ownership enforcement.
- [x] Resume recommendation values and extracted profile facts are persisted; score calculations are deterministic and model output is validated.
- [x] Shortlist/rejection notifications use an outbox and optional SMTP worker.

## Data and integration

- [x] Prisma schema and additive migrations cover the current roles, recommendation state, permissions, and decision email outbox.
- [x] Upload authorization is generated server-side and object keys are checked for ownership and expected metadata before persistence.
- [x] API contract, setup, product page, architecture, and design documentation are maintained in this repository.
- [~] Apply migrations and seed data against the intended PostgreSQL database; a successful build does not apply migrations.
- [~] Verify Keycloak login/TOTP, private object storage upload/preview/deletion, SMTP delivery, and Groq/Gemini workflows with configured services.
- [ ] Move recommendation processing from the web process to a durable queue with retry, idempotency, and restart recovery.
- [ ] Add orphaned-object cleanup and malware/content scanning for uploaded documents.
- [ ] Add internal-account invitation and secure initial-password setup.
- [ ] Measure real provider-backed per-profile and P95 latency at the required workload; deterministic matching tests are not a substitute.

## Frontend quality

- [x] The product uses a black-first theme with responsive page layouts and role-aware navigation.
- [x] Loading, empty, error, pending, and success states are represented in the main user journeys.
- [x] Shared Locomotive/Lenis smooth scrolling respects reduced-motion preferences and protects nested scroll regions.
- [~] Lint and production build pass; live API behavior and a full keyboard/screen-reader audit require a running environment.
- [ ] Review the main public and authenticated workflows in a browser at mobile, tablet, and desktop sizes.
- [ ] Complete keyboard-only and screen-reader review of uploads, dialogs, menus, and tables.

## Latest local verification

- Backend test suite: 247 tests across 31 files passed in the latest recorded run.
- Backend build: passed, including Prisma client generation and TypeScript compilation.
- Frontend lint, targeted auth/permission tests, and production build: passed in the latest recorded run.
- Browser scroll behavior was verified in a local browser in the prior run. API/database and Keycloak services are currently unavailable in this workspace, so live registration, application, storage, and provider flows remain unverified.
- `git diff --check`: passed after the 18 November documentation and copy pass.

The specific command outputs, environment limits, and history are recorded in [`IMPLEMENTATION_NOTES.md`](IMPLEMENTATION_NOTES.md).
