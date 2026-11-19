# Zelosify Frontend Product Specification

This guide describes current frontend routes and their API integrations. It is not a substitute for the API contract in [`../api.doc.md`](../api.doc.md) or the visual rules in [`Design.md`](Design.md). The actual repository uses both Next.js App Router (`src/app/`) and Pages Router (`src/pages/`); use the existing router for the page being changed.

## User journeys and page/API map

| User             | Page                              | UI purpose                                                                  | Main API                                                                           |
| ---------------- | --------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Public           | `/`                               | Public product introduction and links to candidate and hiring-team journeys | None required                                                                      |
| Public           | `/jobs`                           | Search and paginate open jobs                                               | `GET /jobs?page=&limit=&search=&location=`                                         |
| Public/candidate | `/jobs/[id]`                      | Job details; candidate resume upload and apply                              | `GET /jobs/:id`, multipart `POST /jobs/:id/apply`                                  |
| Candidate        | `/candidate/dashboard`            | Application overview and recent applications                                | `GET /candidate/applications`                                                      |
| Candidate        | `/candidate/applications`         | Application status and resume preview/replacement                           | `GET /candidate/applications`, `PUT /candidate/applications/:id/resume`            |
| Candidate        | `/candidate/profile`              | Read-only authenticated account profile                                     | `GET /auth/user`                                                                   |
| Vendor           | `/vendor/openings`                | Tenant opening list and pagination                                          | `GET /vendor/openings?page=&limit=&query=&location=&contractType=`                 |
| Vendor           | `/vendor/openings/[id]`           | Opening details, multi-file upload, own profile preview/delete              | `GET /vendor/openings/:id`, presign/PUT/submit, preview, delete                    |
| Hiring manager   | `/hiring-manager/openings`        | Assigned openings                                                           | `GET /jobs/managed?page=&limit=`                                                   |
| Hiring manager   | `/hiring-manager/openings/[id]`   | Candidate screening and decisions                                           | `GET /jobs/:id/candidates?page=&limit=`, `POST /candidates/:id/{shortlist,reject}` |
| Recruiter        | `/recruiter/jobs`                 | Tenant openings; create, edit, close                                        | `GET /jobs/managed`, `POST /jobs`, `PUT /jobs/:id`, `DELETE /jobs/:id`             |
| Recruiter        | `/recruiter/jobs/[id]/applicants` | Candidate applications and decisions                                        | `GET /jobs/:id/candidates`, shortlist/reject                                       |
| Tenant admin     | `/admin/recruiters`               | Tenant recruiter/manager directory and recruiter setup                      | `GET /admin/recruiters`, `POST /admin/recruiters`                                  |
| Auth             | `/login`, `/register`             | Login/TOTP and candidate signup                                             | `/auth/login`, `/auth/verify-totp`, `/auth/register`                               |

Every route and exact request/response schema is documented in `api.doc.md`.

## Design contract

Follow [`Design.md`](Design.md): black-first styling, consistent cards, buttons, forms, and badges, responsive layouts, keyboard focus, semantic labels, and visible loading, empty, error, pending, and submitting states. Reuse existing dependencies and UI primitives. Respect reduced-motion preferences and avoid unrelated redesign.

Recruitment pages share the existing recruitment shell and components under `src/components/recruitment/` and `src/components/UI/`. Keep vendor and manager navigation/action sets separate.

## Access and data boundaries

- Frontend middleware and role guards provide navigation feedback only; backend authorization remains authoritative.
- Vendor pages may show tenant openings and only the current vendor's own uploaded profiles. Do not render recommendation score, confidence, band, or explanation in vendor UI.
- Hiring manager pages may show only openings owned by that manager in their tenant. Recruiter/admin pages use backend tenant scope.
- Use backend-returned recommendation values. Do not calculate scores in UI or show fabricated score/reason for `PENDING`, `PROCESSING`, or `FAILED`.
- Use signed upload and preview URLs returned by the backend; never construct public bucket URLs or expose storage credentials.

## Candidate upload flow

1. Validate PDF, DOC, or DOCX extension, MIME, and 10 MiB limit for usability.
2. Submit the file as `multipart/form-data` to `/jobs/:id/apply`; the authenticated candidate identity and scoped storage key are resolved by the backend.
3. For resume replacement, call `PUT /candidate/applications/:id/resume` with a multipart file; retain the legacy signed-URL flow for compatible older clients.
4. Show success only when the API confirms it; refresh application state and represent analysis states honestly.

## Vendor upload flow

1. Select/drop one or more PDF/PPTX files (maximum 20 files per batch, 10 MiB each).
2. Request signed URLs from `/vendor/openings/:id/profiles/presign`.
3. Upload each file directly to storage; report per-file progress and errors.
4. Submit keys through `/vendor/openings/:id/profiles/upload`.
5. Refresh this vendor's profiles. Preview and delete call authorized backend routes; deletion is soft.

Uploads to object storage and profile-row creation are not one distributed transaction. If submission fails after PUT succeeds, an unreferenced object may remain.

## Hiring-manager review

Opening lists and candidate results are server paginated. The current page requests up to 100 profiles; the UI virtualizes rendering when a page has more than 50. Cards show file name/date, recommendation state, score, heuristic confidence, explanation, processing time and decision actions. The manager decision endpoints update application status; they do not accept client-supplied score data.

The `/hiring-manager/openings/:id/profiles` backend route remains as an unpaginated legacy response. The frontend uses the paginated `/jobs/:id/candidates` contract instead.

## Quality checklist for UI changes

- [ ] Black-first visual hierarchy follows `Design.md`; responsive at mobile, tablet, and desktop sizes.
- [ ] Correct persona navigation and backend-protected data boundaries.
- [ ] Loading, empty, error/retry, pending, success, and disabled/submitting states as appropriate.
- [ ] Semantic controls, associated labels, visible focus, keyboard-operable upload and dialogs.
- [ ] Vendor cannot see AI output or other vendors' uploads.
- [ ] Manager sees backend scores as returned and can act only on assigned profiles.
- [ ] No fake data or success states.
- [ ] Run `npm run lint` and `npm run build` from `Zelosify-Frontend`; record browser verification separately.

## Current known gaps

- Candidate profile is read-only; backend has no profile edit endpoint.
- Candidate application history is paginated by the API; dashboard summary counts are returned with the current page response.
- Vendor experience filtering and sorting apply to the loaded API page only; query, location and contract type use server-side filtering and pagination.
- No visual browser audit is implied by a successful frontend build.
- Live login, upload, preview, and analysis require configured Keycloak, database, private object storage, and AI provider.
