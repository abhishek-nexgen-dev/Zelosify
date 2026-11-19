# Zelosify product pages, APIs, and UI sketches

This document describes the current recruitment experience and its intended page behavior. Endpoint paths below are relative to `/api/v1`; the frontend reads the origin from `NEXT_PUBLIC_BACKEND_URL`. “Implemented” means a route/component and corresponding API call exist in this checkout. It does not mean the external provider, database, or browser flow has been live-tested.

## Shared design and access rules

- Follow [`Zelosify-Frontend/Design.md`](Zelosify-Frontend/Design.md): black-first styling, clear hierarchy, reusable components, responsive layouts, visible focus, and honest loading, empty, error, pending, and success states. The current product uses a dark theme.
- Keep candidate, vendor, recruiter, hiring-manager, and tenant-admin navigation separate. Route guards improve navigation; API authorization remains authoritative.
- Never show vendors AI scores, explanations, confidence, or another vendor’s uploads. Hiring managers can access only openings assigned to their authenticated ID within their tenant. Tenant admins/recruiters are tenant-scoped.
- Resume object keys and short-lived URLs are created server-side. A browser uploads bytes directly to the signed URL, then submits the opaque scoped key. The API verifies ownership, size, declared type, and file signature before accepting an application/profile.
- AI output is decision support. The interface displays the persisted backend score and label; it does not compute or invent them. `PENDING`, `PROCESSING`, and `FAILED` never render as a fabricated zero score.
- Public job browsing works without an account. Applying requires an authenticated `CANDIDATE` account.

## Page and endpoint map

| Page | Purpose and main UI | Main endpoints | Access |
|---|---|---|---|
| `/` | Public product introduction, candidate and hiring-team journeys, workflow steps, and calls to action | None required | Public |
| `/jobs` | Search and paginate open openings | `GET /jobs?page=&limit=&search=&location=` | Public |
| `/jobs/[id]` | Opening details and secure application form | `GET /jobs/:id`; upload flow below | Public view; candidate apply |
| `/login`, `/register` | Existing sign-in, candidate registration, MFA flow | Existing `/auth/*` routes; see `api.doc.md` | Public / session |
| `/candidate/dashboard` | Application overview and recent items | `GET /candidate/applications` | Candidate |
| `/candidate/applications` | Application state, screening status, resume preview/replacement | `GET /candidate/applications`; `PUT /candidate/applications/:id/resume` | Own applications only |
| `/candidate/profile` | Read-only account identity and link to applications | Authenticated user from existing auth context | Candidate |
| `/recruiter/jobs` | Tenant job list, statuses, applicant counts, actions | `GET /jobs/managed?page=&limit=&status=` | Recruiter/admin; manager sees own only |
| `/recruiter/jobs/new` | Create role including explicit required skills | `POST /jobs` | Recruiter/admin/manager within tenant |
| `/recruiter/jobs/[id]/edit` | Edit owned/in-scope role | `GET /jobs/managed/:id`; `PUT /jobs/:id` | Same server scope |
| `/recruiter/jobs/[id]/applicants` | Paginated applicant screening and human decisions | `GET /jobs/:id/candidates?page=&limit=`; `POST /candidates/:id/shortlist`; `POST /candidates/:id/reject` | In-scope recruiter/admin/manager |
| `/hiring-manager/openings` | Manager’s assigned openings | `GET /jobs/managed?page=&limit=` | Assigned manager |
| `/hiring-manager/openings/[id]` | Candidate review for one assigned opening | `GET /jobs/managed/:id`; `GET /jobs/:id/candidates`; decision routes above | Assigned manager |
| `/vendor/openings` | Tenant contract-opening list with table/cards and pagination | `GET /vendor/openings?page=&limit=&query=&location=&contractType=` | Vendor, tenant scope |
| `/vendor/openings/[id]` | Opening details, multi-file upload, own profile previews/deletion | `GET /vendor/openings/:id`; upload flow below; preview/delete below | Vendor, own submissions |
| `/admin/recruiters` | Tenant recruiter and manager directory plus account creation | `GET /admin/recruiters`; `POST /admin/recruiters` | Tenant admin |

## Public pages

### Home — `/`

**Goal:** Explain the Zelosify product and guide candidates to job search. The current page uses a black-first hero image, concise product sections, workflow steps, role journeys, and clear links to open jobs and sign-in. Job search is a separate page.

**Hero content:** Primary headline, short value proposition, open-jobs action, and an illustrative career image. Supporting sections explain candidate and hiring-team journeys, outline the application steps, and provide clear calls to action. Search and filters are available on `/jobs`. Any illustrative profile cards are labeled as examples, not customer endorsements.

**API and states:** The home page is content-led and does not depend on live jobs data. The separate `/jobs` page handles job API loading, empty, error, and search states.

The current home page is content-led: it introduces the candidate and hiring-team journeys, explains the application steps, and links to job search. It does not embed a job search form or list.

### Job search — `/jobs`

Search fields are job-title/description keywords and location. Results are paginated, open-only job cards with company, title, description preview, location, contract type, experience range, and details link. Current backend supports search against title/description and location; it does not search company name or required skills. Cards provide skeleton, empty, error/retry, and pagination states.

**API:** `GET /jobs?page={1-based page}&limit={1..100}&search={text}&location={text}`. Results are `{ success, data: Job[], pagination: { page, limit, total, totalPages } }`.

```text
┌───────────────────────────────────────────────────────────────────┐
│ Explore opportunities                                             │
│ [ Job title/description ] [ City or Remote ] [ Search jobs ]        │
│ 12 open opportunities                                  Clear      │
│ ┌ Job card ──────────────┐ ┌ Job card ──────────────┐              │
│ │ Company · Role         │ │ Company · Role         │              │
│ │ Description preview    │ │ Description preview    │              │
│ │ Location · Type · Exp  │ │ Location · Type · Exp  │              │
│ │ View role →            │ │ View role →            │              │
│ └────────────────────────┘ └────────────────────────┘              │
│                      [Previous] Page 1 of 2 [Next]                 │
└───────────────────────────────────────────────────────────────────┘
```

### Job detail and application — `/jobs/[id]`

The page presents the opening title, company, location, contract type, experience range, required skills, full description, and hiring manager details when returned. A signed-in candidate can apply with a PDF, DOC, or DOCX resume up to 10 MiB using a multipart request. Show validation and request errors, submitting state, duplicate/closed-job responses, and a success link to the candidate dashboard. No application is created until the backend validates the request and file.

**Endpoints and sequence:**

1. `GET /jobs/:id` — public opening details.
2. `POST /jobs/:id/apply` — authenticated candidate; multipart body with one `file` field. The backend checks opening status, file metadata/type/signature/size, and duplicate application before creating the application.
3. `GET /candidate/applications` — candidate-owned applications and screening state.

The legacy signed-upload endpoint remains available for older clients; see [`api.doc.md`](api.doc.md) for its contract.

```text
┌─────────────────────────────────────────────────────────────────┐
│ ← All jobs                 Senior Engineer · Company            │
│ Location · Full-time · 3–6 years                                │
│ About the role                                                   │
│ Full role description and requirements…                         │
│ ┌ What happens after apply? ──────────────────────────────────┐ │
│ │ Private resume storage · Track analysis and application     │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                         ┌ Apply for this job ──┐ │
│                                         │ [Choose PDF/PPTX]    │ │
│                                         │ Up to 10 MB          │ │
│                                         │ Uploading 64%        │ │
│                                         │ [Submit application] │ │
│                                         └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Candidate workspace

### Candidate dashboard — `/candidate/dashboard`

Welcome and Find jobs action; counts for all applications, in-review, and shortlisted; up to five recent applications with links to the complete list; empty state directs the candidate to job search; load error has retry. Counts come from the aggregate `summary` returned by `GET /candidate/applications?limit=5`.

### My applications — `/candidate/applications`

Each card shows job/company/location, submitted date, application decision status, screening state, private resume preview link, and Replace resume. Results use `GET /candidate/applications?page=&limit=` and the UI supports pagination. A replacement repeats the signed upload flow, then `PUT /candidate/applications/:id/resume` with `{ s3Key }`; backend confirms candidate ownership and resets screening fields before triggering analysis again. Pending/processing entries refresh every five seconds. Failed analysis is explicit and never shown as a zero score. Loading, empty, retry, disabled/uploading, and success states are provided.

### Candidate profile — `/candidate/profile`

Read-only account identity currently available from authenticated user context, plus a link to manage application resumes. There is no candidate profile update endpoint; do not present these values as editable. Add a tenant-safe profile API before adding editable career history, skills, or contact fields.

### Resume analysis pipeline

- Supported documents: PDF and PPTX, 1 byte–10 MiB. Legacy `.ppt` is intentionally not accepted because the current parser does not reliably read the old binary format.
- Candidate keys use `candidate-resumes/{tenantId}/{candidateId}/{uuid}-{sanitizedFilename}`. Vendor keys use `{tenantId}/{openingId}/{vendorId}/{uuid}-{sanitizedFilename}`.
- Backend validates declared content type against extension, object size and stored content type, owner/key scope, and initial PDF/ZIP signature. PDF extraction uses `pdf-extraction`; PPTX extraction reads and decompresses slide XML with bounded output. Documents with too little readable text fail analysis instead of receiving fabricated resume features.
- Application is created with screening `PENDING`, changes to `PROCESSING`, then `COMPLETED` with persisted deterministic score/label/explanation/latency or `FAILED` without a score. Candidate and authorized hiring views read that status.
- Required role skills are explicit `Opening.requiredSkills`, edited as a comma-separated list in job management and stored in PostgreSQL. They are no longer guessed from a title/description. With no required skills, skill match is 1.0 by current scoring policy; document this behavior when deciding whether to change it.
- Work is currently launched asynchronously inside the Express process. It is not durable across process termination and has no external queue/retry worker; do not describe it as production-grade background processing until that is implemented.

## Recruiter and hiring-manager workspace

### Managed openings — `/recruiter/jobs` and `/hiring-manager/openings`

Recruiter page shows paginated tenant openings, status filters, role, location, applicant count, edit/applicant links, create, and close actions. Manager page uses the same data source but backend scope restricts results to `hiringManagerId` and tenant. Manager navigation must not show vendor upload controls. Loading, empty, error/retry, and confirmation states are required.

**API:** `GET /jobs/managed?page=&limit=&status=`; authenticated `ADMIN`, `RECRUITER`, or `HIRING_MANAGER`. `GET /jobs/managed/:id` enforces the same scope. `DELETE /jobs/:id` closes the role in the current controller contract; frontend labels should reflect the resulting behavior.

```text
┌──────────────────────────────────────────────────────────────────┐
│ My Openings / Job openings                       [+ Create role] │
│ [Open] [On hold] [Closed]                                        │
│ Title                Location   Type       Applicants  Actions    │
│ Senior Engineer     Remote     Full-time  12          Review Edit │
│ Product Designer    Austin     Contract    4          Review Edit │
│                                      [Previous] Page 1 [Next]     │
└──────────────────────────────────────────────────────────────────┘
```

### Create/edit opening — `/recruiter/jobs/new`, `/recruiter/jobs/[id]/edit`

Fields: title, description, comma-separated required skills, location, contract type, experience min/max, and edit-only status. Required skills are persisted and used by deterministic screening. Validate max >= min; preserve existing input on errors; show loading/saving states.

**API:** `POST /jobs` and `PUT /jobs/:id`; fields are validated server-side. New opening tenant and creator/manager identity come from verified auth context, never request-supplied tenant or owner IDs. Edit first loads `GET /jobs/managed/:id`.

### Applicants and manager review — `/recruiter/jobs/[id]/applicants`, `/hiring-manager/openings/[id]`

Opening summary followed by paginated candidate cards. Show candidate name/email (authorized hiring roles only), filename and submitted date, application state, screening status, backend score percent, band, confidence percent, reason, processing milliseconds, authorized short-lived resume preview, and Shortlist/Reject. Decisions confirm destructive rejection, disable while saving, and show success/error. Backend applies tenant/owner scope on candidate list and decision routes. Recruiter review fetches 20 at a time with pagination. Manager review fetches up to 100 per page, virtualizes the rendered list when a page contains more than 50 candidates, and provides page navigation for additional records.

**Endpoints:**

- `GET /jobs/:id/candidates?page={1-based}&limit={1..100}` — returns `job`, `totalCandidates`, `pagination`, and `candidates[]` with `aiScreening.status`, `score`, `band`, `confidence`, `reason`, `latencyMs` and `resume.previewUrl`.
- `POST /candidates/:applicationId/shortlist` or `/reject` — authenticated in-scope hiring user; the ID refers to the application/profile record, not candidate user ID.

```text
┌────────────────────────────────────────────────────────────────────┐
│ ← Job openings      Senior Engineer · Remote · Open                │
│ Review AI screening as decision support; you make the final choice.│
│ ┌ Candidate card ───────────────┐ ┌ Candidate card ───────────────┐│
│ │ Candidate · submitted date    │ │ Candidate · submitted date    ││
│ │ Recommended · Match 82%       │ │ Analyzing resume…             ││
│ │ Confidence 81% · 420 ms       │ │ Score — · reason pending      ││
│ │ Evidence based explanation…  │ │ [Preview]                     ││
│ │ [Preview] [Shortlist] [Reject]│ │ [Shortlist] [Reject]          ││
│ └───────────────────────────────┘ └───────────────────────────────┘│
│                         [Previous] Page 1 of 3 [Next]               │
└────────────────────────────────────────────────────────────────────┘
```

## IT vendor workspace

### Contract openings — `/vendor/openings`

Tenant-scoped cards/table show title, location, contract type, posted date, hiring manager and action. Title/description, location, contract type, and pagination use the existing vendor endpoint. Experience filtering and oldest/newest ordering currently apply only to the loaded page because the vendor API does not expose server-side parameters for those operations. It must not show recommendation data. List supports loading, empty, error/retry, and mobile card/table layout.

### Opening detail, uploads, and own submissions — `/vendor/openings/[id]`

Show opening details, manager and dates; multiple PDF/PPTX dropzone (up to 20 files, each <=10 MiB); selected-file type/size and per-file upload progress; successful submissions list with date/status; preview short-lived URL and confirmation before soft delete. Only the authenticated vendor’s submissions are returned. Vendor UI never shows AI fields. API credentials stay server-side; browser PUT uses the short-lived signed URL.

**Upload sequence:**

1. `GET /vendor/openings/:id` returns authorized opening and only this vendor’s profiles.
2. `POST /vendor/openings/:id/profiles/presign` body `{ files: [{ name, contentType, size }] }`; response is an array of `{ filename, key, contentType, uploadUrl, expiresInSeconds }`.
3. Browser `PUT uploadUrl` for each file, exact `Content-Type`, bounded sequential upload and progress.
4. `POST /vendor/openings/:id/profiles/upload` body `{ profiles: [{ s3Key }] }`; backend checks tenant/opening/vendor key prefix, object metadata, declared type, size, and signature, then creates rows transactionally and triggers analysis.
5. `GET /vendor/profiles/:id/preview` returns an authorized short-lived URL. `DELETE /vendor/profiles/:id` soft-deletes only the current vendor’s row.

```text
┌──────────────────────────────────────────────────────────────────┐
│ ← Contract openings     Senior Engineer                           │
│ Remote · Contract · 3–6 years · Hiring manager · Posted date       │
│ Role description…                                                 │
├──────────────────────────────────────────────────────────────────┤
│ Upload candidates                                                │
│ ┌ Drop PDF/PPTX files here or browse · max 20 · 10 MB each ─────┐ │
│ │ resume-a.pdf · 2.1 MB · Uploaded 100%                         │ │
│ │ resume-b.pptx · 4.0 MB · Uploading 42%                        │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ [Submit profiles]                                                 │
├──────────────────────────────────────────────────────────────────┤
│ My uploaded profiles                                              │
│ File                         Submitted      Status    Preview Delete│
│ resume-a.pdf                 Nov 16         Submitted [Open] [Remove]│
└──────────────────────────────────────────────────────────────────┘
```

## Tenant administrator

### Recruiter management — `/admin/recruiters`

List tenant recruiters/managers and provide a create form for username, email, first/last name, department, and a required 12+ character temporary password. Backend creates a Keycloak identity with `UPDATE_PASSWORD` and tenant-scoped database user. Keycloak failure returns a service error; never fall back to local fake accounts or default passwords. Admin must share the one-time password only through their organization’s secure channel. The UI needs loading, empty, validation, duplicate, provider failure, and success states.

**Endpoints:** `GET /admin/recruiters`; `POST /admin/recruiters`. API derives tenant from verified admin identity.

```text
┌───────────────────────────────────────────────────────────────────┐
│ Tenant administration · Recruiters                               │
│ ┌ Recruiter directory ───────────────┐ ┌ Create recruiter ──────┐ │
│ │ Name · Email · Role · Department   │ │ Name                  │ │
│ │ …                                  │ │ Username / Email       │ │
│ │                                    │ │ Department             │ │
│ │                                    │ │ Temporary password    │ │
│ └────────────────────────────────────┘ │ [Create recruiter]     │ │
│                                        └─────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## Errors, accessibility, and product completion gaps

- `400/422`: show validation or upload issue and retain form state. `401`: send user through sign-in. `403`: explain role restriction. `404`: show unavailable job/application. `5xx/network`: retry without losing user input.
- All data-driven pages need accessible labels, semantic buttons/links, visible focus, keyboard-operable upload/select/dialogs, status text for screen readers, responsive content without hidden required actions, and reduced-motion-compatible transitions.
- No live browser/provider/database verification is implied by this document. Local services, Keycloak, storage credentials, bucket CORS, and migrations must be available for a true end-to-end pass.
- Production work still required: durable background processing and safe retry/idempotency; secure recruiter password invite/reset delivery; candidate editable profile contract; pagination for candidate-owned application history; production object malware scanning and full document-content validation; real-provider performance/load measurements and operational monitoring. Confidence is currently a heuristic derived from match score and is not statistically calibrated.
