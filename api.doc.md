# Zelosify API Reference

This is the endpoint reference for the Express routers mounted by `Zelosify-Backend/Server/src/index.ts`. It documents the checkout's current contract, including compatibility aliases and known limitations. The API uses `/api/v1` as its prefix.

## 1. Base URL and request conventions

| Environment | Base URL |
|---|---|
| Local default | `http://localhost:5000/api/v1` |
| Configured deployment | `${API_ORIGIN}/api/v1` |

The frontend variable `NEXT_PUBLIC_BACKEND_URL` must include `/api/v1`, for example `http://localhost:5000/api/v1`. Health check `GET /` is mounted outside that prefix.

- Send JSON requests with `Content-Type: application/json`; the server parses JSON bodies up to 1 MiB.
- Authenticated application requests use the HttpOnly `access_token` cookie. Bearer authorization is also accepted by authentication middleware: `Authorization: Bearer <access-token>`.
- Browser requests must use credentials when relying on cookies. The server allows configured origins from `ALLOWED_ORIGINS` (comma-separated), otherwise `FRONTEND_URL`.
- Signed object-storage PUT requests go directly to the returned `uploadUrl`, use the exact returned `Content-Type`, and must not include app cookies (`withCredentials: false`). The upload URL is a short-lived bearer capability; keep it private.
- JSON response dates are ISO 8601 strings. Database IDs are strings for openings/users and integers for hiring profiles/applications.
- Unless the response example says otherwise, errors are JSON. This API does not currently enforce one universal error envelope; see each endpoint's documented status and error shape.

## 2. Authentication, roles, and tenant scope

The frontend checks the HttpOnly `access_token` cookie and its JWT expiry before protected dashboard pages render. Missing, malformed, or expired tokens redirect to `/login` with a same-site `returnTo` path; an API `401` on a protected route clears browser-visible auth state and redirects the same way. After its auth check, the navbar shows the signed-in user's role-based Dashboard link, or Sign in and Create account when no valid session exists. A failed background `/auth/user` check clears stale user state without displaying raw token-validation text on the login form. The `/auth/user` handler reuses the user record already loaded by authentication middleware, avoiding a second database lookup while preserving its response fields. If the temporary TOTP session has expired, the login form returns to the password stage and asks the user to sign in again without showing the raw token error; invalid credentials and invalid TOTP codes remain actionable.

| Role | API scope |
|---|---|
| `CANDIDATE` | Own applications and candidate-owned resume objects |
| `IT_VENDOR` | Open opportunities in the authenticated tenant; submit, preview, and soft-delete only the vendor's own profiles. No candidate score or hiring decision access. |
| `HIRING_MANAGER` | Read and review only openings assigned to the authenticated manager in the authenticated tenant; may view scores and shortlist/reject candidates. |
| `RECRUITER` | Openings assigned to the authenticated recruiter in the authenticated tenant; may review and decide on applicants in that scope. |
| `ADMIN` | Full tenant-scoped administration and recruiting access, including team creation and permission management |

Assignment permission ceilings are enforced by the backend even if a stored permission array is stale. `ADMIN` has all registered permissions. `IT_VENDOR` receives `JOBS_VIEW`, `VENDOR_PROFILES_VIEW`, `VENDOR_PROFILES_SUBMIT`, and `VENDOR_PROFILES_DELETE`. `HIRING_MANAGER` receives `JOBS_VIEW`, `JOBS_CREATE`, `CANDIDATES_VIEW`, `CANDIDATES_SHORTLIST`, and `CANDIDATES_REJECT`; it does not receive `JOBS_UPDATE`. `CANDIDATE` has no internal team permissions; candidate capabilities are enforced by candidate-specific routes. Unknown roles receive no application permissions. Migrations `20261118150000_align_assignment_role_permissions` and `20261118170000_hiring_manager_opening_creation` normalize existing role arrays and grant existing Hiring Managers `JOBS_CREATE`. UI visibility follows the same role ceiling and stored permission list; API middleware remains authoritative.

IDs or tenant values in a request do not prove authorization. Backend scope comes from the verified token and database user. Hiring-manager and vendor list/detail controllers add their own tenant and ownership filters. Vendor API payloads never return AI scores or explanations.

The Prisma role enum includes `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `CANDIDATE`, and `IT_VENDOR`. Apply the `20261116060000_add_it_vendor_role` migration before creating vendor users. Public signup only creates `CANDIDATE`; no public endpoint creates vendors, managers, recruiters, or admins.

### Common validation error

Routes using `validateRequest` return HTTP `400` in this shape:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "title", "message": "Job title must be at least 3 characters" }
  ]
}
```

`field` is relative to the request body, query, or params. Controllers that do not use the validation middleware may return endpoint-specific errors instead.

## 3. Endpoint index

Paths in this document include the `/api/v1` prefix. For example, `POST /auth/login` means `POST http://localhost:5000/api/v1/auth/login` locally.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/auth/register`, `/auth/signup` | Public | Create an account and a pending TOTP session; no QR is returned |
| `POST` | `/auth/verify-login`, `/auth/login` | Public | Verify password through Keycloak; every account requires TOTP |
| `GET` | `/auth/totp/setup/qr` | Password-verified temporary TOTP session | Generate a pending setup QR or a replacement authenticator QR |
| `POST` | `/auth/verify-totp` | Temporary TOTP session | Verify code and set access/refresh cookies |
| `GET` | `/auth/user` | Authenticated | Return current account, tenant, and persisted permissions |
| `POST` | `/auth/logout` | Authenticated | Attempt Keycloak logout and clear app cookies |
| `GET` | `/dashboard` | `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `IT_VENDOR` | Load the caller's role-scoped internal dashboard summary |
| `GET` | `/admin/recruiters` | `ADMIN` | Searchable, paginated tenant team list of recruiters, managers, and vendors |
| `GET` | `/admin/team/permission-targets` | `ADMIN` | Paginated, searchable list of same-tenant internal permission targets |
| `POST` | `/admin/recruiters` | `ADMIN` | Create a tenant-scoped recruiter, hiring manager, or IT vendor through Keycloak |
| `PATCH` | `/admin/recruiters/:id/permissions` | `ADMIN` | Replace the complete permission list for a same-tenant recruiter, hiring manager, or IT vendor |
| `POST` | `/admin/team/:id/permissions` | `ADMIN` | Add one permission to an eligible same-tenant team account |
| `DELETE` | `/admin/team/:id/permissions/:permission` | `ADMIN` | Remove one permission from an eligible same-tenant team account |
| `DELETE` | `/admin/recruiters/:id` | `ADMIN` | Delete an eligible same-tenant team account |
| `GET` | `/jobs` | Public | Paginated list of open jobs |
| `GET` | `/jobs/:id` | Public | Read one open job |
| `GET` | `/jobs/managed` | `ADMIN`, `RECRUITER`, `HIRING_MANAGER` | List tenant openings for Admin, recruiter-assigned openings for Recruiter, and manager-assigned openings for Hiring Manager |
| `GET` | `/jobs/managed/:id` | `ADMIN`, `RECRUITER`, `HIRING_MANAGER` | Read one opening inside the caller's scope |
| `GET` | `/jobs/assignees` | `ADMIN`, `RECRUITER`, `HIRING_MANAGER` | Read eligible same-tenant opening assignees for job setup |
| `POST` | `/jobs` | `ADMIN`, `RECRUITER`, `HIRING_MANAGER` | Create opening; Hiring Manager is assigned as its owner |
| `PUT` | `/jobs/:id` | `ADMIN`, `RECRUITER` | Update scoped opening |
| `DELETE` | `/jobs/:id` | `ADMIN`, `RECRUITER` | Close opening (soft behavior; does not delete row) |
| `GET` | `/jobs/:id/candidates` | `ADMIN`, `RECRUITER`, `HIRING_MANAGER` | Paginated hiring review list with screening fields and signed previews |
| `POST` | `/jobs/:id/apply` | `CANDIDATE` | Submit an application with a fresh multipart resume upload |
| `GET` | `/candidate/applications` | `CANDIDATE` | Paginated list of own applications and aggregate counts |
| `GET` | `/candidate/applications/:id/score` | `CANDIDATE` | Read the recommendation for the candidate's own application |
| `POST` | `/candidate/applications/:id/retry-analysis` | `CANDIDATE` | Retry failed AI analysis for the candidate's own application without re-uploading the resume |
| `PUT` | `/candidate/applications/:id/resume` | `CANDIDATE` | Replace own application's resume and restart screening |
| `POST` | `/candidates/:id/shortlist` | `ADMIN`, `RECRUITER`, `HIRING_MANAGER` | Shortlist in-scope application/profile |
| `POST` | `/candidates/:id/reject` | `ADMIN`, `RECRUITER`, `HIRING_MANAGER` | Reject in-scope application/profile |
| `GET` | `/candidates/:id/score` | `ADMIN`, `RECRUITER`, `HIRING_MANAGER` | Read recommendation for an application in the caller's opening scope; requires `CANDIDATES_VIEW` |
| `GET` | `/vendor/openings`, `/vendor` | `IT_VENDOR` | Paginated tenant opening list (the latter is a compatibility alias) |
| `GET` | `/vendor/openings/:id` | `IT_VENDOR` | Opening details and this vendor's active submissions |
| `POST` | `/vendor/openings/:id/profiles/presign` | `IT_VENDOR` | Create signed vendor upload URLs |
| `POST` | `/vendor/openings/:id/profiles/upload` | `IT_VENDOR` | Verify stored files and submit profile batch |
| `GET` | `/vendor/profiles/:id/preview` | `IT_VENDOR` | Create an authorized short-lived preview URL for own profile |
| `DELETE` | `/vendor/profiles/:id` | `IT_VENDOR` | Soft-delete own profile |
| `GET` | `/hiring-manager/openings`, `/hiring-manager` | `HIRING_MANAGER` | Paginated assigned opening list (the latter is a compatibility alias) |
| `GET` | `/hiring-manager/openings/:id/profiles` | `HIRING_MANAGER` | Paginated legacy review response |
| `POST` | `/hiring-manager/profiles/:id/shortlist` | `HIRING_MANAGER` | Manager-scoped shortlist alias |
| `POST` | `/hiring-manager/profiles/:id/reject` | `HIRING_MANAGER` | Manager-scoped reject alias |
| `GET` | `/aws/list` | Authenticated | Legacy storage object listing under caller's contract upload folder |
| `GET` | `/` | Public | Backend health response (`Server Connected!` text) |

### `GET /dashboard`

Requires an authenticated `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, or `IT_VENDOR` account with tenant scope. The server derives role, user, and tenant scope from the verified session. Hiring managers see only their own openings; recruiters and admins see openings from their tenant; vendors see open tenant opportunities and their own active submissions. The endpoint returns recent opening summaries and role-appropriate counts without returning candidate records or resume data.

```json
{
  "success": true,
  "data": {
    "role": "HIRING_MANAGER",
    "summary": {
      "openingCount": 4,
      "applicantCount": 12,
      "teamAccountCount": null,
      "ownSubmissionCount": null
    },
    "recentOpenings": [
      {
        "id": "opening-uuid",
        "title": "Senior Software Engineer",
        "location": "Remote",
        "contractType": "Full-Time",
        "status": "OPEN",
        "postedDate": "2026-11-16T10:00:00.000Z",
        "companyName": "Example Org",
        "hiringManagerName": "Alex Manager",
        "applicantsCount": 5
      }
    ]
  }
}
```

`applicantCount` counts all non-deleted applications across the caller's in-scope openings, not only the six recent opening summaries. Each recent opening's `applicantsCount` remains its own non-deleted application count. `teamAccountCount` is populated only for `ADMIN`; `ownSubmissionCount` is populated only for `IT_VENDOR`. Vendor responses omit applicant counts. Errors: `401` unauthenticated; `403` unsupported role or missing tenant scope; `500` dashboard query failure.

## 3.1 Lifecycle Workflow

The platform lifecycle follows six distinct stages:

```
[1. User Registration]
  (tenantId auto-resolved -> Keycloak account created -> pending TOTP secret and temp_token cookie)
          │
          ▼
[2. Authentication & 2FA]
  (GET /auth/totp/setup/qr -> POST /auth/verify-totp -> activate initial or replacement TOTP and issue session cookies)
          │
          ▼
[3. Resume Upload]
  (POST /jobs/:id/apply multipart file -> Validate PDF/DOC/DOCX -> Store tenant/candidate-scoped object)
          │
          ▼
[4. Job Application Submission]
  (Authenticated candidate + route job ID -> Save Profile with server-generated object key)
          │
          ▼
[5. Asynchronous AI Screening & Scoring Engine]
  (Worker PDF text extraction -> Tool-Calling Agent: parse -> extract -> normalize -> match -> score)
  (Deterministic 50% Skill + 30% Exp + 20% Location formula -> Persist score, reason, confidence)
          │
          ▼
[6. Recruiter / Manager Review & Decisions]
  (GET /jobs/:id/candidates -> Review scores & reasons -> POST /candidates/:id/shortlist or reject)
```

1. **User Registration (`POST /auth/register`)**:
   - Both public registration routes are candidate-only. Legacy `tenantId` and `role` fields are stripped; the backend attaches the configured tenant and `CANDIDATE` role.
   - Keycloak identity creation is reconciled on safe retries only when the exact username/email match, the submitted password authenticates, and the identity has no privileged application role.
   - The user's TOTP secret is stored as pending and the server sets a five-minute HttpOnly `temp_token` cookie after Keycloak accepts the new credentials.
   - The signup response contains no `qrCode`, `qrCodeUrl`, or `otpAuthUrl`. The browser requests the QR from `GET /auth/totp/setup/qr` using that cookie.

2. **User Login & Two-Factor Authentication (`POST /auth/login` ➔ `POST /auth/verify-totp`)**:
   - The client submits username/email and password to `/auth/login`. Keycloak validates credentials.
   - The server issues a short-lived, HttpOnly `temp_token` cookie.
   - The user enters their 6-digit TOTP code to `/auth/verify-totp`.
   - The server verifies the code with `otplib` (with a ±2 30-second window tolerance), exchanges credentials with Keycloak for bearer tokens, clears `temp_token`, and sets secure HttpOnly `access_token` and `refresh_token` cookies.

3. **Fresh Resume Upload (`POST /jobs/:id/apply`)**:
   - The candidate selects and uploads a PDF, DOC, or DOCX file for each job application using one multipart request.
   - The server validates the authenticated candidate, extension, MIME type, size, and file signature, then creates a fresh candidate-scoped storage key.

4. **Job Application Submission (`POST /jobs/:id/apply`)**:
   - Candidate identity comes from the authenticated session; job identity comes from `:id`; the client cannot submit a storage key or candidate ID.
   - A new resume file is required for each opening. The server stores it under a new candidate-scoped key.
   - A `hiringProfile` record is created with `status: SUBMITTED` and `recommendationStatus: PENDING`.
   - Asynchronous AI recommendation processing is triggered immediately.

5. **Asynchronous AI Screening & Tool-Calling Agent**:
   - Untrusted PDF parsing runs in an isolated worker thread with memory limits to prevent denial of service or event-loop stalls.
   - The orchestrator engages the configured LLM tool-calling agent (Groq or xAI Grok) executing registered tools in strict dependency order:
     - `parse_resume`: Sanitizes prompt injection attacks and strips malicious tags.
     - `extract_features`: Extracts experience years, skills, and candidate location.
     - `normalize_skills`: Deduplicates and normalizes skill aliases (e.g. ReactJS ➔ react).
     - `match_candidate`: Compares normalized candidate attributes against opening criteria.
     - `score_candidate`: Computes validated deterministic scores:
       - **Skill Match Score** (50% weight): matching skills / required skills.
       - **Experience Match Score** (30% weight): 1.0 (within range), 0.8 (above max), 0.0 (below min).
       - **Location Match Score** (20% weight): 1.0 (remote or exact match), 0.5 (onsite mismatch).
       - **Final Score**: `0.5 * skill + 0.3 * exp + 0.2 * location`.
     - Factual grounding: The LLM produces a factual explanation strictly quoting tool results without inventing hallucinated criteria.
   - The transaction persists `recommendationScore`, `recommendationConfidence`, `recommendationReason`, `recommendationLatencyMs`, and updates `recommendationStatus: COMPLETED`.

6. **Recruiter / Hiring Manager Review & Decisions**:
   - Authorized managers/recruiters view candidates with scores, confidence, and preview links via `GET /jobs/:id/candidates`.
   - An authorized decision (`POST /candidates/:id/shortlist` or `POST /candidates/:id/reject`) atomically transitions profile status and records reviewer identity.

## 4. Authentication endpoints

### `POST /auth/register` and `POST /auth/signup`

Creates a candidate account in the configured tenant and starts pending TOTP enrollment. Public callers cannot select a role or tenant. The response does not contain QR data or an OTP auth URI; the pending session cookie authorizes a separate QR request.

- **`/auth/register`**: Legacy API alias for candidate registration.
- **`/auth/signup`**: Candidate self-registration alias. The frontend uses `/auth/register` to match the API collection.

Both routes validate the same body with Zod. Legacy `tenantId` and `role` fields are ignored and cannot change the server-assigned tenant or role.

```json
{
  "username": "abdulla",
  "email": "abdulla@example.com",
  "password": "<your-unique-test-password>",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+12334567890",
  "department": "Sales"
}
```

- `username`, `email`, and `password` are required. Username is 3–50 characters. Password minimum is 8 characters.
- Tenant is resolved from `DEFAULT_TENANT_ID`; role is always `CANDIDATE`.
- Existing matching Keycloak identities can be linked on retry only after password verification and a non-privileged role check. Otherwise a duplicate returns `409`.
- Missing tenant configuration returns `503`; Keycloak unavailability returns `503`.

**Success: `201 Created`**

```json
{
  "message": "User registered successfully. Continue to configure TOTP.",
  "user": {
    "id": "2a32cf54-e301-4fa2-bade-643f07a71d9d",
    "username": "abdulla",
    "email": "abdulla@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+12334567890",
    "department": "Sales",
    "role": "CANDIDATE",
    "tenantId": "8dc0e05b-2956-4d74-b0e9-5aea5ab3b748",
    "provider": "KEYCLOAK"
  },
  "totpSessionReady": true,
  "expiresIn": 300
}
```

`temp_token` is set only as an HttpOnly cookie and is not returned in JSON. `totpSessionReady` reports whether the backend could start the five-minute setup session. `expiresIn` is its lifetime in seconds. If session setup fails after account creation, sign in to continue pending enrollment.

### `GET /auth/totp/setup/qr` (and `GET /api/v1/auth/totp/setup/qr`)

Accessible at both `/auth/totp/setup/qr` and `/api/v1/auth/totp/setup/qr`.

Requires the valid five-minute `temp_token` issued after Keycloak validates the user's password (accepted from an HttpOnly cookie, `Authorization: Bearer <temp_token>` header, `x-temp-token` header, or `?token=` query parameter). The endpoint returns a no-store QR data URL. Pending accounts get the saved pending secret; enrolled accounts get a newly generated replacement secret. For a replacement, the endpoint keeps the current secret active and puts the proposed secret in a renewed short-lived HttpOnly temporary cookie. Retrying with that renewed session returns the same proposed QR. The new secret is not saved to the account until the user confirms it with a valid six-digit code.

The existing login screen displays the QR during initial setup and lets an enrolled user choose “Set up a replacement” after password verification. On replacement, the user scans the new QR and confirms its code; the old authenticator remains active until confirmation succeeds. If replacement is cancelled, the user can return to the current code. Active TOTP secrets are never re-displayed.

If the browser reports `Network Error`, it received no HTTP response from the API. Check that the backend is running and that frontend `NEXT_PUBLIC_BACKEND_URL` points to it with the `/api/v1` prefix. Also confirm the backend's `FRONTEND_URL` or `ALLOWED_ORIGINS` includes the exact frontend origin, then restart the frontend after changing its environment file. A `401`, `409`, or `500` is an API response and should be diagnosed by that status instead.

When accessed directly in a web browser (`Accept: text/html`), the endpoint renders a responsive, scannable QR setup card with setup instructions.

**Success: `200 OK` (JSON)**

```json
{ "qrCode": "data:image/png;base64,iVBORw0KGgo...", "replacement": true }
```

`replacement` is `false` during initial enrollment and `true` when the QR contains a proposed replacement secret. The endpoint returns no `otpAuthUrl` or raw secret in JSON mode. The browser must send credentials so the HttpOnly cookie is included.

**Errors:** `400` schema violation or duplicate user; `503` missing configured tenant or Keycloak identity/role service unavailable; `500` unexpected persistence error.

### `POST /auth/verify-login` and `POST /auth/login`

Aliases. The frontend uses `/auth/login`; `/auth/verify-login` remains available for compatibility. Request uses JSON `usernameOrEmail` and `password`; the route validates both required strings with the login schema.

```json
{ "usernameOrEmail": "sam@example.com", "password": "your-password" }
```

The server responds `200`, sets an HttpOnly, five-minute `temp_token` cookie, and indicates whether setup is pending:

```json
{ "message": "Login verified. Complete your authenticator setup.", "totpSetupRequired": true }
```

For enrolled accounts, `totpSetupRequired` is `false` and the user can enter the current authenticator code. If the user lost access, the login screen can request a replacement QR from the same endpoint; the old factor stays active until the replacement code is verified.

Optional `Authorization: Bearer` use is supported for authenticated API requests; browser login uses cookies. `401` invalid credentials or provider login failure; `503` authentication service unavailable. Do not expose whether an email exists to untrusted callers in production without reviewing the current message behavior.

### `POST /auth/verify-totp`

Requires the purpose-scoped `temp_token` cookie created during signup or login and a six-digit numeric code. For pending accounts, a valid code activates TOTP. For enrolled accounts, it verifies the current factor. If the temporary token includes a pending replacement secret, a valid code from that new authenticator atomically replaces the old secret; a valid code from the current authenticator can still complete sign-in without applying the replacement. Provider failure does not issue a local session.

```json
{ "totp": "123456" }
```

**Success: `200 OK`** sets HttpOnly `access_token` and `refresh_token`, clears `temp_token`, and returns:

```json
{
  "message": "TOTP verified successfully. Login successful.",
  "user": {
    "id": "database-user-uuid",
    "username": "sam_candidate",
    "email": "sam@example.com",
    "firstName": "Sam",
    "lastName": "Candidate",
    "role": "CANDIDATE",
    "department": "Engineering",
    "tenant": { "tenantId": "tenant-uuid", "companyName": "Example Org" }
  }
}
```

Errors: `400` missing or malformed code, `401` missing/invalid/expired temporary session, invalid code, or token exchange failure, `409` setup state changed during verification, `500` unexpected error.

### `GET /auth/user`

Requires authentication. **Success `200`** returns the account JSON directly (no `data` wrapper):

```json
{
  "id": "database-user-uuid",
  "username": "sam_candidate",
  "email": "sam@example.com",
  "firstName": "Sam",
  "lastName": "Candidate",
  "role": "CANDIDATE",
  "department": "Engineering",
  "tenant": { "tenantId": "tenant-uuid", "companyName": "Example Org" }
}
```

Errors: `401` missing/invalid token or missing database user; `500` retrieval failure.

### `POST /auth/logout`

Requires a valid authenticated access token. No body. Attempts Keycloak refresh-token logout when a refresh token is present, then clears `access_token`, `refresh_token`, and `temp_token` cookies.

**Success `200`:** `{ "message": "Logged out successfully" }`. A Keycloak logout call failure is logged server-side and app cookies are still cleared. If the access token is already invalid, authentication middleware returns `401` before this controller clears cookies.

## 5. Tenant administrator endpoints

All routes require authentication, and each endpoint enforces its role, permission, and tenant scope. Under the assignment workflow, team account and permission management are Admin-only. IT Vendors and Hiring Managers cannot create team accounts or manage permissions. This keeps the operational Admin account distinct from the IT Vendor submission persona.

### Tenant provisioning model

This deployment uses one configured tenant. There is no tenant-management API: backend startup creates the configured tenant from `DEFAULT_TENANT_ID` and `DEFAULT_TENANT_NAME` if it does not exist, public candidate signup resolves that same configured tenant, and internal team creation uses the authenticated caller's tenant. `Tenant` is an organization record, not a user role and does not have its own permission list; permissions are stored on each user's `User.permissions` array. Add tenant creation and management endpoints only when customer organizations need to be onboarded dynamically, with corresponding tenant-scoped user provisioning and authorization.

The supplied setup guide's older workflow says to create a tenant manually in Prisma Studio and send `tenantId` and `role` during public registration. That workflow is superseded by the current API: bootstrap provisions the configured tenant, and public signup does not let clients choose a tenant or role. Use the endpoint contract in this document for the current checkout.

### Administrator bootstrap

At startup, the backend creates or verifies the tenant and administrator configured by `DEFAULT_TENANT_ID`, `DEFAULT_TENANT_NAME`, and `DEFAULT_ADMIN_*`. Set unique secrets in the ignored backend `.env` file and enroll TOTP during first sign-in. This reference intentionally does not publish default passwords or authenticator secrets. Rotate any credentials copied from older documentation.

The recruiting team and permission pages are Admin-only for this assignment flow. Team targets and permissions are tenant-scoped; the tenant always comes from the verified session. Candidate accounts are never permission-management targets. Hiring Managers receive only `JOBS_CREATE` in addition to their review permissions; they cannot update or close openings, and the UI only exposes their own-opening create flow. Vendor navigation remains limited to opening discovery and profile submission.

Permission groups are centralized in the backend and mirrored by the frontend. Permission checks intersect the stored permission list with a role ceiling, so stale grants cannot expand access. Existing vendor and hiring-manager arrays are normalized by the additive role-permission migration. Vendor routes enforce tenant and uploader ownership; vendors do not receive applicant-review routes or AI recommendation fields.

### `GET /admin/recruiters`

Requires an authenticated `ADMIN` with tenant scope and `TEAM_VIEW`. Query parameters: `page` defaults to `1`; `limit` defaults to `20` and is capped at `100`; optional `search` (up to 100 characters) matches name, username, email, or department; optional `role` is `RECRUITER`, `HIRING_MANAGER`, or `IT_VENDOR`. Results are limited to the caller's tenant and ordered by newest account first. `assignedJobsCount` counts all assigned openings for that member across all opening statuses.

**Success `200`:**

```json
{
  "success": true,
  "count": 1,
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
  "data": [
    {
      "id": "user-uuid",
      "username": "alex_recruiter",
      "email": "alex@example.com",
      "firstName": "Alex",
      "lastName": "Recruiter",
      "role": "RECRUITER",
      "department": "Talent Acquisition",
      "createdAt": "2026-11-16T10:00:00.000Z",
      "assignedJobsCount": 3
    }
  ]
}
```

The list includes each user's `permissions` array. `count` is the total number of accounts matching the tenant, role, and search filters, independent of the current page. Errors: `400` invalid query; `403` role or tenant scope required; `500` query failure.

### `PATCH /admin/recruiters/:id/permissions`

Admin-only. The target must be a recruiter, hiring manager, or IT vendor in the caller's tenant. The endpoint replaces the full permission list; send an empty array to remove all permissions. Candidate and admin accounts cannot be targeted.

```json
{
  "permissions": ["JOBS_VIEW", "CANDIDATES_VIEW", "CANDIDATES_SHORTLIST"]
}
```

Supported values are the registered constants: `JOBS_VIEW`, `JOBS_CREATE`, `JOBS_UPDATE`, `CANDIDATES_VIEW`, `CANDIDATES_SHORTLIST`, `CANDIDATES_REJECT`, `TEAM_VIEW`, `RECRUITER_CREATE`, `RECRUITER_MANAGE`, `VENDOR_PROFILES_VIEW`, `VENDOR_PROFILES_SUBMIT`, and `VENDOR_PROFILES_DELETE`. Invalid values or duplicate entries return validation `400`; an account outside the tenant or with another role returns `404`; non-admin callers receive `403`.

### `GET /admin/team/permission-targets`

Requires a tenant-scoped `ADMIN`. Returns a paginated list of internal accounts with their persisted permissions. Candidates and admins are excluded. Query parameters: `page` defaults to `1`; `limit` defaults to `20` and is capped at `100`; optional `search` matches name, email, or username; optional `role` filters to `IT_VENDOR`, `HIRING_MANAGER`, or `RECRUITER`.

### `POST /admin/team/:id/permissions`

Requires a tenant-scoped `ADMIN`. Adds one registered permission to an eligible same-tenant IT vendor, hiring manager, or recruiter. Granting an already assigned permission is idempotent. Admin and candidate targets are excluded.

```json
{ "permission": "JOBS_CREATE" }
```

Success returns `{ "success": true, "data": { "id": "user-id", "permissions": ["JOBS_VIEW", "JOBS_CREATE"] } }`.

### `DELETE /admin/team/:id/permissions/:permission`

Requires a tenant-scoped `ADMIN`. Removes one registered permission from an eligible same-tenant IT vendor, hiring manager, or recruiter. Removing a permission that is already absent is idempotent. Admin and candidate targets are excluded. Invalid permission names return validation `400`; out-of-tenant or excluded targets return `404`.

Role permission defaults are persisted in `User.permissions`; `/auth/user` returns that array for the authenticated account. The frontend uses the role ceiling and this array to show or hide controls, while backend route role checks, permission checks, and tenant/ownership scopes remain authoritative.

Apply the additive database migration before using this feature with an existing database: `cd Zelosify-Backend/Server && npm run prisma:deploy`.

### `DELETE /admin/recruiters/:id`

Requires tenant-scoped `ADMIN` with persisted `RECRUITER_MANAGE`. Admin may target a same-tenant recruiter or hiring manager. Recruiters are unassigned from openings before deletion. A hiring manager with assigned openings receives `409` and must be reassigned first. Local access is removed transactionally; the response includes `identityCleanupPending` if Keycloak cleanup needs attention. Self-deletion and cross-tenant targets are rejected.

### `POST /admin/recruiters`

**Request JSON:**

```json
{
  "username": "alex_recruiter",
  "email": "alex@example.com",
  "password": "temporary-password",
  "firstName": "Alex",
  "lastName": "Recruiter",
  "department": "Talent Acquisition",
  "role": "RECRUITER"
}
```

Requires a tenant-scoped `ADMIN` with `RECRUITER_CREATE`. `role` may be `RECRUITER`, `HIRING_MANAGER`, or `IT_VENDOR` and defaults to `RECRUITER` for older clients. Required: username (3–50; letters/numbers/underscore/hyphen), valid email, password (at least 12 characters), first name, and last name. `department` is optional and defaults to `Talent Acquisition`. The backend creates the corresponding Keycloak identity with a permanent initial password, ensures the matching realm role exists (creating it if the Keycloak admin API reports it missing), and assigns that role before persisting the local account and role-specific default permissions. The creator should share the initial password securely with the team member. Tenant is always resolved from the authenticated caller; client-supplied tenant values are not trusted. Duplicate usernames/emails in the database or identity provider return `409`; invalid role or fields return `400`; role/permission violations return `403`; other Keycloak provisioning failures return `503` and log a safe failure stage/status; database failures return `500` and trigger Keycloak cleanup.

**Success `201`:**

```json
{
  "success": true,
  "message": "Recruiter successfully assigned and created.",
  "data": {
    "id": "user-uuid",
    "username": "alex_recruiter",
    "email": "alex@example.com",
    "firstName": "Alex",
    "lastName": "Recruiter",
    "role": "RECRUITER",
    "department": "Talent Acquisition",
    "tenantId": "tenant-uuid",
    "createdAt": "2026-11-16T10:00:00.000Z"
  }
}
```

Errors: validation `400`; duplicate user `409`; missing tenant or disallowed creator/role combination `403`; Keycloak unavailable `503`; database failure `500`. Automated invitation delivery is not implemented.

### Frontend integration

The tenant team page is `/admin/recruiters`. It requests `GET /admin/recruiters?page={page}&limit=10` and links to `/admin/permissions`. The permission page and team creation form are Admin-only. The backend role, permission, and tenant checks remain authoritative even when a user navigates directly to a page.

## 6. Public and managed jobs

### `GET /jobs`

Public. The homepage searches by title using `search`; the same parameter also matches the description. Results render inline in the home page. Query parameters:

| Query | Type | Default | Limit/behavior |
|---|---|---|---|
| `page` | integer | `1` | Minimum 1 |
| `limit` | integer | `10` | 1–100 |
| `search` | string | none | Case-insensitive title or description substring |
| `location` | string | none | Case-insensitive location substring |
| `status` | enum | `OPEN` | Schema accepts `OPEN`, `CLOSED`, `ON_HOLD`; public controller always returns only `OPEN` |

**Success `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "opening-uuid",
      "title": "Senior Software Engineer",
      "description": "Role details...",
      "location": "Remote",
      "contractType": "Full-Time",
      "experienceMin": 4,
      "experienceMax": 8,
      "requiredSkills": ["TypeScript", "React"],
      "status": "OPEN",
      "postedDate": "2026-11-16T10:00:00.000Z",
      "companyName": "Example Org",
      "applicantsCount": 4
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

Errors: validation `400`; `500` `{ "success": false, "message": "Failed to list jobs" }`.

### `GET /jobs/:id`

Public; only an `OPEN` opening is visible. No body.

**Success `200`:** `{ "success": true, "data": { /* same job fields as list item */ } }`. Missing, closed, and out-of-scope are indistinguishable: `404` `{ "success": false, "message": "Job opening not found." }`. Server errors return `500` with a safe message.

### `GET /jobs/managed`

Requires `ADMIN`, `RECRUITER`, or `HIRING_MANAGER`. Query `page` default `1`; `limit` default `20`, maximum `100`; optional `status` of `OPEN`, `CLOSED`, or `ON_HOLD`. Invalid `status` is ignored by the controller after query validation rather than returning a status-specific error. Managers are restricted to their own openings and tenant, recruiters to openings assigned to them, and admins to their tenant. IT vendors use `/vendor/openings` and do not receive the general candidate list or decision routes.

**Success `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "opening-uuid",
      "tenantId": "tenant-uuid",
      "title": "Senior Software Engineer",
      "description": "Role details...",
      "location": "Remote",
      "contractType": "Contract",
      "hiringManagerId": "user-uuid",
      "experienceMin": 4,
      "experienceMax": 8,
      "requiredSkills": ["TypeScript"],
      "postedDate": "2026-11-16T10:00:00.000Z",
      "expectedCompletionDate": null,
      "actionDate": null,
      "status": "OPEN",
      "applicantsCount": 4
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

Errors: `401` unauthenticated; `403` invalid role or missing tenant scope; `500` query failure.

### `GET /jobs/managed/:id`

Same authorization/scope as managed list. **Success `200`:** `{ "success": true, "data": { /* opening fields, tenant relation, and populated hiringManager and recruiter */ } }`. Each populated assignee contains only `id`, `username`, `firstName`, `lastName`, and `email`, and is `null` if no same-tenant user with the expected role matches. The top-level assignment ID scalars are omitted from this detail response. Missing or out-of-scope opening: `404`. Server error: `500`.

### `GET /jobs/assignees`

Requires an authenticated `ADMIN`, `RECRUITER`, or `HIRING_MANAGER` with `JOBS_CREATE` or `JOBS_UPDATE` and a tenant. The tenant is derived from the authenticated account. Returns same-tenant users with the `RECRUITER` or `HIRING_MANAGER` role for job setup. Hiring Managers see only themselves in the manager list; they may select a same-tenant Recruiter.

**Success `200`:** `{ "success": true, "data": { "recruiters": [/* id, username, email, firstName, lastName, role, department */], "hiringManagers": [/* same fields */] } }`. Errors: `401` unauthenticated; `403` unsupported role or missing tenant; `500` query failure.

### Frontend opening form integration

Admins may assign or clear same-tenant hiring managers and recruiters. Hiring Managers may create an opening; the server assigns the creator as its hiring manager and the UI lets them choose a same-tenant Recruiter. They cannot assign another Hiring Manager, update, or close openings. Recruiters may create openings assigned to themselves but cannot change team assignments. IT Vendors cannot create openings and use the separate vendor opening and profile-submission flow. The server validates assignee IDs against tenant and role.

### `POST /jobs`

Requires `ADMIN`, `RECRUITER`, or `HIRING_MANAGER` with `JOBS_CREATE`. Tenant always comes from authenticated user. The server validates selected IDs against tenant and role. Admin-created openings may have no manager or recruiter until Admin assigns them; Admin may assign either same-tenant role. Recruiter-created openings are assigned to the authenticated recruiter. Hiring-Manager-created openings are assigned to the authenticated manager; that manager may optionally select a same-tenant Recruiter and cannot select or override the manager assignment. `hiringManagerId` and `recruiterId` may be omitted or `null` for Admin-created openings.

**Request JSON:**

```json
{
  "title": "Senior Software Engineer",
  "description": "We are looking for a senior engineer to build and support reliable customer-facing products. You will design and implement features, collaborate with product and design, review code, and improve testing, accessibility, and performance. Candidates should have relevant production experience, communicate clearly across teams, and be comfortable documenting decisions and supporting software after release.",
  "location": "Remote",
  "contractType": "Full-Time",
  "experienceMin": 4,
  "experienceMax": 8,
  "requiredSkills": ["TypeScript", "React"],
  "hiringManagerId": "same-tenant-hiring-manager-id",
  "recruiterId": "same-tenant-recruiter-id",
  "status": "OPEN"
}
```

`title` 3–200 characters; description is required and, after trimming whitespace, must be 200–700 characters; location defaults to `Remote`; contract type defaults to `Full-Time`; minimum experience required integer 0–50; optional maximum integer 0–50 and not below minimum; skills default `[]`, at most 50 strings of 1–80 chars. Admin may assign same-tenant users to either team field. Recruiter remains assigned to their own opening and cannot choose a hiring manager or another recruiter. Status defaults `OPEN` and must be `OPEN`, `CLOSED`, or `ON_HOLD`.

**Success `201`:** `{ "success": true, "message": "Job opening created successfully.", "data": { /* created Opening */ } }`.

Errors: validation `400`; `403` no tenant-linked account; `500` persistence failure.

### `PUT /jobs/:id`

Requires `ADMIN` or `RECRUITER` and opening ownership scope. Partial update; send one or more supported fields from the create request. If `description` is supplied, it is trimmed and must contain 200–700 characters; omit it to leave an existing description unchanged. Admin may update or clear both assignment IDs. Recruiters cannot update assignment fields. Assignment IDs are checked for same-tenant membership and expected role. Empty body is accepted by current schema/controller and results in a no-op update.

**Success `200`:** `{ "success": true, "message": "Job opening updated successfully.", "data": { /* updated Opening */ } }`. Re-sending an assignee already set on this opening returns `409` with a field-specific “already assigned” message. Errors: validation `400`; `403` no tenant scope or forbidden role assignment; `404` missing/out-of-scope; `500` persistence failure.

### `DELETE /jobs/:id`

Requires `ADMIN` or `RECRUITER` and opening ownership scope. This is a **close operation**, not row deletion. No request body.

**Success `200`:** `{ "success": true, "message": "Job opening closed successfully.", "data": { /* opening with status CLOSED */ } }`. Errors: `403`, `404`, `500`.

### `GET /jobs/:id/candidates`

Requires `ADMIN`, `RECRUITER`, or `HIRING_MANAGER`; tenant/manager opening scope enforced. Query `page` defaults to `1`, `limit` defaults to `20` and is capped at `100`. Optional `status` filters to `SUBMITTED`, `SHORTLISTED`, or `REJECTED`; omitting it preserves the existing all-statuses response.

**Success `200`:**

```json
{
  "success": true,
  "job": {
    "id": "opening-uuid",
    "title": "Senior Software Engineer",
    "status": "OPEN",
    "experienceMin": 4,
    "experienceMax": 8,
    "location": "Remote"
  },
  "totalCandidates": 1,
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
  "candidates": [
    {
      "applicationId": 42,
      "candidate": { "id": "candidate-uuid", "name": "Sam Candidate", "email": "sam@example.com", "mobileNumber": "+1-555-0100" },
      "resume": { "key": "candidate-resumes/.../resume.pdf", "previewUrl": "https://...", "fileName": "resume.pdf" },
      "aiScreening": {
        "status": "COMPLETED",
        "recommended": true,
        "band": "Recommended",
        "score": 82,
        "confidence": 81,
        "recommendationScore": 0.82,
        "recommendationConfidence": 0.81,
        "atsScore": 82,
        "atsBreakdown": { "scale": 100, "skillMatch": 100, "experienceMatch": 100, "locationMatch": 50, "formula": "50% skills + 30% experience + 20% location" },
        "resumeAnalysis": { "candidateName": "Sam Candidate", "experienceYears": 5, "skills": ["React", "TypeScript"], "normalizedSkills": ["react", "typescript"], "location": "Remote", "education": ["Bachelor's Degree"], "keywords": ["React", "TypeScript"] },
        "reason": "Validated match explanation",
        "latencyMs": 950,
        "version": "v1.2.0-tool-calling-agent"
      },
      "status": "SUBMITTED",
      "submittedAt": "2026-11-16T10:00:00.000Z",
      "shortlistedAt": null,
      "rejectedAt": null
    }
  ]
}
```

`candidate.mobileNumber` is read from `User.phoneNumber` and is `null` when not provided. It is returned only with the existing authorized, tenant/opening-scoped candidate list. For candidate self-applications, candidate contact details come from the candidate account. For IT Vendor submissions, the vendor account is never presented as the candidate: the displayed name comes from validated resume analysis when available, and candidate ID, email, and mobile number are `null` because the vendor API does not collect them. `score` and `confidence` are integer percentages; `recommendationScore` and `recommendationConfidence` are also provided on their persisted 0–1 scale. `atsScore` is 0–100 and `resumeAnalysis` contains validated extracted facts (no raw resume text). `previewUrl` is a short-lived storage URL or `null` if URL creation failed. Recommendation state is `PENDING`, `PROCESSING`, `COMPLETED`, or `FAILED`; the band is `Pending` until a score exists. Deleted profiles are excluded. Errors: `403` missing tenant scope; `404` missing/out-of-scope opening; `500` retrieval failure.

### `GET /candidates/:id/score`

Requires `ADMIN`, `RECRUITER`, or `HIRING_MANAGER` plus the `CANDIDATES_VIEW` permission. `:id` is the numeric application/profile id. The application is looked up inside the caller's tenant and opening scope; hiring managers are further restricted to openings assigned to them. Out-of-scope and missing applications both return `404`. The response includes the candidate's name/email, public `aiScreening` fields, and safe `analysisIssue` (`IDENTITY_UNVERIFIED` only for a resume name mismatch), without a resume preview URL, raw resume content, or provider diagnostics. Errors: `400` invalid id, `403` missing permission/scope, `404` missing or out-of-scope application, `500` retrieval failure.

## 7. Candidate application and resume endpoints

### `POST /jobs/:id/apply`

Requires `CANDIDATE`.

**Required request `multipart/form-data`:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | File | Yes | One PDF, DOC, or DOCX resume, maximum 10 MiB, 2 pages, and 12,000 extracted characters |

Candidate ID comes from the authenticated user and job ID from the route. The server generates a fresh candidate/tenant-scoped storage key, checks MIME type, extension, size, and file signature, then stores the resume. JSON requests, client-supplied `s3Key` values, and client-supplied candidate IDs are rejected. Applying to another opening requires a new upload, even if the candidate chooses the same local file.

**Success `201`:**

```json
{
  "success": true,
  "message": "Application submitted successfully! Your resume is now being screened.",
  "data": {
    "applicationId": 42,
    "jobTitle": "Senior Software Engineer",
    "status": "SUBMITTED",
    "submittedAt": "2026-11-16T10:00:00.000Z",
    "screeningStatus": "PENDING"
  }
}
```

Screening starts asynchronously after persistence; its status can advance before this response is received. Every opening application requires a fresh multipart file; a previously stored key cannot be submitted. Before storage, the backend verifies readable content, page count, and extracted text length; resumes must be no more than 2 pages and 12,000 extracted characters. Word files whose saved layout does not expose a reliable page count are rejected with a prompt to upload as PDF. Errors: `400` closed opening or missing file; `401` missing candidate identity; `404` unknown opening; `413` file exceeds 10 MiB; `422` invalid type/signature/content, more than 2 pages, more than 12,000 extracted characters, or unverifiable page count; `500` persistence failure.

### `GET /candidate/applications`

Requires `CANDIDATE`. Query `page` (default 1) and `limit` (default 20, maximum 100). Response includes aggregate `summary` counts and `pagination`.

**Success `200`:**

```json
{
  "success": true,
  "count": 1,
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
  "summary": { "total": 1, "inReview": 1, "shortlisted": 0, "screening": 1 },
  "data": [
    {
      "applicationId": 42,
      "jobId": "opening-uuid",
      "jobTitle": "Senior Software Engineer",
      "companyName": "Example Org",
      "location": "Remote",
      "status": "SUBMITTED",
      "screeningStatus": "PROCESSING",
      "aiScreening": {
        "status": "PROCESSING",
        "recommended": null,
        "band": "Analyzing",
        "score": null,
        "confidence": null,
        "reason": null,
        "latencyMs": null,
        "version": null,
        "atsScore": null
      },
      "submittedAt": "2026-11-16T10:00:00.000Z",
      "resumeUrl": "https://storage-provider/signed-read..."
    }
  ]
}
```

Only the authenticated candidate's non-deleted applications are returned. The storage key is not exposed; candidates must upload a file for every new application. `analysisRetryAvailable` indicates whether the candidate may retry a failed AI run for that same application without re-uploading. `analysisIssue` is `IDENTITY_UNVERIFIED` when the name extracted from the resume could not be matched to the account name. `resumeUrl` may be `null` if a signed URL could not be generated. `aiScreening.score`, `confidence`, and `atsScore` are integer percentages and are populated only when analysis is `COMPLETED`; scores are `null` while pending, processing, or failed. `band` is `Pending`, `Analyzing`, `Analysis unavailable`, `Recommended`, `Borderline`, or `Not Recommended`. `reason` is included for completed analysis and failed analysis when a safe user-facing explanation is available; `latencyMs` and `version` are included only for completed analysis. No extracted resume text, provider error, or private screening metadata is exposed. Errors: `401`, `500`.

### `GET /candidate/applications/:id/score`

Requires `CANDIDATE`. Returns public `aiScreening` score and safe explanation fields plus `analysisIssue` for one non-deleted application owned by the authenticated candidate. `analysisIssue` is `IDENTITY_UNVERIFIED` only for a resume name mismatch; other provider or processing failures are described through the safe `aiScreening.reason` and never expose internal provider diagnostics. It does not return a resume URL or extracted resume text. The application id must be a positive integer. Errors: `400` invalid id, `401` missing candidate identity, `404` application not found or not owned, `500` retrieval failure.

**Success `200`:** `{ "success": true, "data": { "applicationId": 42, "jobId": "opening-uuid", "jobTitle": "Senior Software Engineer", "companyName": "Example Org", "location": "Remote", "status": "SUBMITTED", "analysisIssue": null, "aiScreening": { "status": "COMPLETED", "recommended": true, "band": "Recommended", "score": 82, "confidence": 81, "reason": "Validated match explanation", "latencyMs": 950, "version": "v1.2.0-tool-calling-agent", "atsScore": 82 } } }`. On identity mismatch, `analysisIssue` is `IDENTITY_UNVERIFIED`, score fields remain `null`, and `aiScreening.reason` explains that the resume name could not be verified. Other failures include a safe retry-oriented reason without provider details.

### `POST /candidate/applications/:id/retry-analysis`

Retries AI screening for the authenticated candidate's own non-deleted application without changing its resume. The service queues a fresh job-specific analysis and returns `202`; the candidate applications endpoint reports progress. A failed analysis can be retried while fewer than three attempts have been used. Errors: `400` invalid ID, `401` missing candidate identity, `404` application not found or not owned, `409` analysis already complete, `429` retry limit reached, `500` retrieval failure.

### `PUT /candidate/applications/:id/resume`

Requires `CANDIDATE`; `:id` is the integer application/profile ID.

**Required request:** `multipart/form-data` with one `file` field containing a PDF, DOC, or DOCX file up to 10 MiB, 2 pages, and 12,000 extracted characters. The backend validates the filename, MIME type, size, signature, readable text, and page count before storage, then writes the new file to a key scoped to the authenticated candidate. JSON requests and client-supplied `s3Key` values are rejected.

**Success `200`:**

```json
{
  "success": true,
  "message": "Resume updated successfully. Candidate re-screening initiated.",
  "data": { "applicationId": 42, "screeningStatus": "PENDING", "storageCleanup": "PENDING" }
}
```

The existing application row and ID are retained. Its previous score, extracted features, recommendation metadata, and reviewer decision are cleared, status is reset, and recommendation processing starts again for the new resume. The old resume is queued for object-storage cleanup. A replacement file is also required as multipart; storage keys cannot be supplied by the client. The same 2-page and 12,000-character limits are checked before storage. Errors: `400` invalid ID or missing file; `404` missing, deleted, or not owned; `413` file exceeds 10 MiB; `422` invalid type/signature/content, page count, or text length; `503` upload storage unavailable; `500` update failure.

### `DELETE /candidate/applications/:id`

Requires `CANDIDATE`; candidates may revoke only their own application. The application row is hard-deleted in a database transaction with a durable storage-cleanup record for its resume. The response includes refreshed candidate counts; cleanup retries run in the background until the configured storage provider confirms deletion. Candidate application lists and reviewer counts no longer include the revoked application.

**Success `202`:** `{ "success": true, "message": "Application withdrawn. Resume deletion is queued.", "data": { "applicationId": 42, "storageCleanup": "PENDING", "summary": { "total": 2, "inReview": 1, "shortlisted": 0, "screening": 1 } } }`.

Errors: `400` invalid ID; `404` missing, deleted, or not owned; `409` concurrent change; `500` database transaction failure. If the application is deleted but count refresh is temporarily unavailable, the response still succeeds with `summary: null`; the client can reload counts. A pending cleanup row is retained and retried when storage deletion fails.

## 8. Recruiter/admin candidate decisions

### `POST /candidates/:id/shortlist` and `POST /candidates/:id/reject`

Requires `ADMIN`, `RECRUITER`, or `HIRING_MANAGER`, plus tenant/manager scope of the profile's opening. `:id` is an integer application/profile ID. Body is optional; if supplied, accepted shape is:

```json
{ "notes": "Optional note, max 1000 characters" }
```

Notes are ignored. Decisions are transactional: same-action retries are idempotent, opposite terminal decisions return `409`, compare-and-set prevents concurrent transitions, and a new decision enqueues one email notification in the same transaction. A background worker sends the shortlist or rejection template over SMTP after the response; unconfigured SMTP leaves the message queued, and transient failures retry with backoff. The response shape is unchanged.

**Shortlist success `200`:**

```json
{
  "success": true,
  "message": "Candidate shortlisted successfully.",
  "data": { "applicationId": 42, "status": "SHORTLISTED", "shortlistedAt": "2026-11-16T10:00:00.000Z" }
}
```

**Reject success `200`:**

```json
{
  "success": true,
  "message": "Candidate application rejected.",
  "data": { "applicationId": 42, "status": "REJECTED", "rejectedAt": "2026-11-16T10:00:00.000Z" }
}
```

Errors: validation `400`; `403` no tenant scope; `404` profile missing, deleted, or out-of-scope; `500` update failure.

## 9. Vendor opening and profile endpoints

All endpoints require the `IT_VENDOR` role. Tenant and vendor identity come from authentication. Only openings with status `OPEN` appear in the list. The detail handler can return a tenant opening by ID even if it is no longer open; upload endpoints reject non-open openings. Endpoint-specific `VENDOR_PROFILES_*` permissions gate profile listing, submission, preview, and deletion.

### `GET /vendor/openings` (alias `GET /vendor`)

Query: `page` default 1, `limit` default `DEFAULT_PAGE_LIMIT` or 10 (max `MAX_PAGE_LIMIT` or 100), optional `query` searches title/description, `location` substring, `contractType` exact case-insensitive match.

**Success `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "opening-uuid",
      "title": "Senior Software Engineer",
      "description": "Role details...",
      "location": "Remote",
      "contractType": "Contract",
      "experienceMin": 4,
      "experienceMax": 8,
      "postedDate": "2026-11-16T10:00:00.000Z",
      "expectedCompletionDate": null,
      "actionDate": null,
      "status": "OPEN",
      "companyName": "Example Org",
      "hiringManagerName": "Morgan Manager"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

Errors: `403` tenant context missing; `500` list failure.

### `GET /vendor/openings/:id`

Requires `JOBS_VIEW`; no body. Opening must belong to caller tenant. Returns opening fields listed above and, when the caller also has `VENDOR_PROFILES_VIEW`, `profilesCount` and only this vendor's non-deleted profiles:

```json
{
  "success": true,
  "data": {
    "id": "opening-uuid",
    "title": "Senior Software Engineer",
    "description": "Role details...",
    "location": "Remote",
    "contractType": "Contract",
    "experienceMin": 4,
    "experienceMax": 8,
    "postedDate": "2026-11-16T10:00:00.000Z",
    "expectedCompletionDate": null,
    "actionDate": null,
    "status": "OPEN",
    "companyName": "Example Org",
    "hiringManagerName": "Morgan Manager",
    "profilesCount": 1,
    "profiles": [
      { "id": 71, "fileName": "uuid-resume.pdf", "s3Key": "tenant/opening/vendor/uuid-resume.pdf", "submittedAt": "2026-11-16T10:00:00.000Z", "status": "SUBMITTED" }
    ]
  }
}
```

AI recommendation fields are deliberately omitted. Errors: `403` no tenant/vendor context; `404` opening not in tenant; `500` read failure.

### `POST /vendor/openings/:id/profiles/presign`

Requires `VENDOR_PROFILES_SUBMIT`. Opening must belong to vendor tenant and remain `OPEN`. Request accepts 1–20 files:

```json
{
  "files": [
    { "name": "candidate-one.pdf", "contentType": "application/pdf", "size": 123456 },
    { "name": "candidate-two.pptx", "contentType": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "size": 234567 }
  ]
}
```

Each file must have a supported extension/MIME pair and size 1 byte–10 MiB. The server sanitizes the filename and issues object keys in `{tenantId}/{openingId}/{vendorId}/{uuid}-{filename}`.

**Success `200`:**

```json
{
  "success": true,
  "data": [
    {
      "filename": "candidate-one.pdf",
      "key": "tenant-uuid/opening-uuid/vendor-uuid/upload-uuid-candidate-one.pdf",
      "contentType": "application/pdf",
      "uploadUrl": "https://storage-provider/signed-upload...",
      "expiresInSeconds": 600
    }
  ]
}
```

Browser uploads each matching file with `PUT` to its `uploadUrl`, raw bytes, exact `Content-Type`, and no credentials. Errors: `400` malformed file list, unsupported file, >20 files, or closed opening; `403` missing tenant/vendor context; `404` opening unavailable; storage/signing errors currently return `400` from this handler.

### `POST /vendor/openings/:id/profiles/upload`

Requires `VENDOR_PROFILES_SUBMIT`. The browser sends object keys after all signed PUTs succeed:

```json
{
  "profiles": [
    { "s3Key": "{tenantId}/{openingId}/{vendorId}/{uuid}-candidate-one.pdf" },
    { "s3Key": "{tenantId}/{openingId}/{vendorId}/{uuid}-candidate-two.pptx" }
  ]
}
```

Accepts 1–20 unique keys. The server checks tenant/opening/vendor key prefix and traversal, opening status, stored size/MIME, extension and initial PDF/ZIP signature. It inserts all profile rows in one database transaction and triggers recommendation for each row after commit. The authorized S3 object is fetched lazily by the agent's `parse_resume` tool; vendor account names are not treated as candidate identities. This is not a distributed transaction with storage: a failed submit may leave uploaded but unreferenced objects.

**Success `201`:**

```json
{
  "success": true,
  "message": "2 profile(s) submitted successfully. AI evaluation started.",
  "data": [
    { "id": 71, "s3Key": "tenant/opening/vendor/uuid-candidate-one.pdf", "submittedAt": "2026-11-16T10:00:00.000Z", "status": "SUBMITTED" }
  ]
}
```

AI results are not returned to the vendor. Errors: `400` invalid batch, duplicate keys, object verification failure, or storage/database failure (current catch maps any exception to `400`); `403` missing caller context; `404` opening unavailable.

### `GET /vendor/profiles/:id/preview`

Requires `VENDOR_PROFILES_VIEW`. `:id` is integer profile ID. No body. Backend requires profile to be non-deleted, uploaded by caller, and linked to a tenant opening belonging to caller.

**Success `200`:** `{ "success": true, "url": "https://storage-provider/short-lived-read..." }`.

Errors: `400` invalid profile ID/context; `404` missing/out-of-scope/deleted; `500` storage/signing failure. The URL is short lived; the API returns a URL, not file bytes.

### `DELETE /vendor/profiles/:id`

Requires `VENDOR_PROFILES_DELETE`. `:id` is integer profile ID. No body. Only the submitting vendor may delete, within its tenant. This soft-deletes the record (`isDeleted = true`); normal active lists and manager review exclude it. Current delete handler does not check for an already-deleted row before writing.

**Success `200`:** `{ "success": true, "message": "Profile soft-deleted successfully" }`.

Errors: `400` invalid ID/context; `404` missing/out-of-scope; `500` persistence failure.

## 10. Hiring-manager endpoints

### `GET /hiring-manager/openings` (alias `GET /hiring-manager`)

Requires `HIRING_MANAGER`. Query: `page` defaults to 1; `limit` defaults to `DEFAULT_PAGE_LIMIT` or 10 and caps at `MAX_PAGE_LIMIT` or 100. Both values must be positive whole numbers (malformed values are rejected with `400`); pagination overflow is also rejected. Results include only openings whose `hiringManagerId` and `tenantId` match the authenticated user. Database failures return a generic message; internal details are written only as safe structured error codes.

**Success `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "opening-uuid",
      "title": "Senior Software Engineer",
      "description": "Role details...",
      "location": "Remote",
      "contractType": "Contract",
      "experienceMin": 4,
      "experienceMax": 8,
      "postedDate": "2026-11-16T10:00:00.000Z",
      "expectedCompletionDate": null,
      "actionDate": null,
      "status": "OPEN",
      "companyName": "Example Org",
      "candidateCount": 12
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

Errors: `403` missing tenant/user context; `500` list failure.

### `GET /hiring-manager/openings/:id/profiles` (legacy)

Requires `HIRING_MANAGER`; verifies exact manager and tenant ownership before reading profiles. Query `page` (default 1) and `limit` (default 20, maximum 100). Both values must be positive whole numbers and pagination overflow is rejected before profile queries. Response includes `pagination`. Unexpected database errors return a generic message while structured logs contain only a safe error code. The frontend uses `GET /jobs/:id/candidates?page=&limit=`.

**Success `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 71,
      "openingId": "opening-uuid",
      "fileName": "resume.pdf",
      "s3Key": "tenant/opening/vendor/uuid-resume.pdf",
      "uploadedBy": "vendor-uuid",
      "uploadDate": "2026-11-16T10:00:00.000Z",
      "submittedAt": "2026-11-16T10:00:00.000Z",
      "status": "SUBMITTED",
      "recommendationLabel": "Recommended",
      "recommended": true,
      "score": 0.82,
      "recommendationScore": 0.82,
      "confidence": 0.81,
      "recommendationConfidence": 0.81,
      "explanation": "Validated match explanation",
      "recommendationReason": "Validated match explanation",
      "processingTime": 950,
      "recommendationLatencyMs": 950,
      "shortlistedAt": null,
      "rejectedAt": null
    }
  ],
  "opening": { "id": "opening-uuid", "title": "Senior Software Engineer", "location": "Remote", "contractType": "Contract", "experienceMin": 4, "experienceMax": 8, "status": "OPEN" }
}
```

The score/confidence here are fractions from 0 to 1. The response includes recommendation status so pending and failed outcomes remain distinct. Errors: `403` missing context or not assigned to caller; `500` retrieval failure.

### `POST /hiring-manager/profiles/:id/shortlist` and `/reject`

Manager-specific decision aliases. `:id` is integer profile ID. Request body is not validated or used. Backend checks exact manager and tenant, rejects deleted/missing profiles, and records status plus actor/time.

These aliases use the same transactional decision email outbox and SMTP templates as the recruiter/admin endpoints above.

**Shortlist `200`:** `{ "success": true, "message": "Candidate shortlisted successfully", "data": { "id": 71, "status": "SHORTLISTED", "shortlistedAt": "2026-11-16T10:00:00.000Z" } }`.

**Reject `200`:** `{ "success": true, "message": "Candidate rejected successfully", "data": { "id": 71, "status": "REJECTED", "rejectedAt": "2026-11-16T10:00:00.000Z" } }`.

Errors: `400` invalid ID/context; `403` not assigned to caller; `404` missing/deleted; `500` update failure.

## 11. Legacy storage and health endpoints

### `GET /aws/list`

Requires authentication but no specific role. No query/body. Lists objects below the current user's `contract-uploads/{tenantId}/{department}/{userId}` folder according to `getUserFolderPath` and the configured storage provider.

**Success `200`:** `{ "files": [{ "key": "...", "lastModified": "2026-11-16T10:00:00.000Z", "size": 12345 }] }`.

Errors include `401` when no user context and `500` `{ "status": "error", "error": "..." }`. This is a legacy route, distinct from the resume-specific signed upload APIs.

### `GET /`

Public liveness response, plain text `Server Connected!`. This indicates the Express listener responds; it does not prove database, Keycloak, storage, or AI readiness.

## 12. Resume analysis lifecycle and limitations

Candidate applications accept PDF, DOC, or DOCX, at most 10 MiB, 2 pages, and 12,000 extracted characters. PDF pages are counted by `pdf-extraction`; Word files must contain saved page-count metadata or explicit page breaks that allow a bounded count. If page count cannot be verified, upload is rejected with a request to upload as PDF. Vendor profile ingestion retains its existing PDF/PPTX support. LangChain's `ResumeBufferDocumentLoader` creates the document used by the analysis pipeline; it delegates parsing to the existing bounded readers: PDF uses `pdf-extraction` in a memory-limited worker, DOCX reads bounded OOXML entries, and legacy DOC uses the `catdoc` executable with a temporary file and timeout. PPTX vendor resumes retain bounded archive/XML parsing. Install `catdoc` on backend hosts for candidate `.doc` support. Insufficient readable text fails analysis. Job skills come from persisted `Opening.requiredSkills`; an empty required-skills list currently scores skill-match as `1.0`.

The deterministic `recommendationScore` is stored on a 0–1 scale and returned to reviewers as a percentage. `atsScore` is stored separately on a 0–100 scale, with `atsBreakdown` for the skill, experience, and location match components. Validated extracted facts (`candidateName`, `experienceYears`, `skills`, `normalizedSkills`, `location`, `education`, and `keywords`) are persisted as `resumeAnalysis`; raw resume text is not stored there. The agent invokes the registered `parse_resume` tool, which retrieves the authorized object through a server-side loader and parses it into bounded text; file bytes are never sent to the AI provider. Candidate applications (PDF, DOC, DOCX) are limited to 2 pages and 12,000 extracted characters, checked before storage. Vendor profiles retain the assignment's PDF/PPTX formats and are parsed after submission; vendor account names are not used as candidate identities. For candidate applications only, the printed resume name is compared with the authenticated candidate account's first and last name; mismatch prevents score persistence and asks the candidate to verify the profile and resume. Vendor profile reviewer output uses the extracted resume name when available and never labels the submitting vendor account as the candidate. Formula: `0.5 * skillMatch + 0.3 * experienceMatch + 0.2 * locationMatch`. Bands are `Recommended` at `>= 0.75`, `Borderline` at `>= 0.50`, otherwise `Not Recommended`. Set `AI_AGENT_PROVIDER=groq` with `GROQ_API_KEY` and `GROQ_MODEL`, or `AI_AGENT_PROVIDER=gemini` with `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) and `GEMINI_MODEL`. Groq extraction uses JSON mode with strict local Zod validation; if Groq returns HTTP 400, the backend retries as plain JSON text and validates the parsed object before use. Groq allows 1,500 output tokens and Gemini 800 for extraction. Rate limits and server-side availability errors receive one bounded retry, honoring a short `Retry-After` when provided. Timeouts immediately use the other configured provider so a repeated slow call does not consume the fallback window. Any provider-specific error can fall back to the alternate provider; invalid credentials and missing models are not retried against the same provider. Configure both provider keys to enable cross-provider failover. Matching scores are computed deterministically. `AI_AGENT_PROVIDER=grok` remains available for existing xAI configurations. If configured providers still fail, analysis remains unavailable instead of fabricating a score; safe error codes, model, and provider are recorded in internal recommendation metadata and logs, while candidate-facing messages remain generic. `AI_PROVIDER` is deprecated and no longer selects the screening model. Confidence is heuristic and is not calibrated accuracy. These scores help admins, recruiters, and hiring managers review candidates; they do not auto-accept or auto-reject anyone.

Processing currently runs asynchronously in the web process; there is no durable queue, automatic retry endpoint, or worker. The health route and compile/unit tests do not prove a live provider workflow or assignment latency target. Vendor routes do not return recommendation fields.

## 13. Setup, CORS, and migrations

1. Follow [`setup.md`](setup.md) for PostgreSQL, Keycloak, private GCS/S3, Groq, Gemini, and frontend configuration.
2. Run `npm run prisma:generate` from `Zelosify-Backend/Server` after schema changes.
3. Apply migrations with `npm run prisma:deploy`; `npm run dev` and `npm start` also apply pending migrations. Never reset a database to apply this API's schema.
4. Configure bucket CORS for the exact frontend origin, `PUT`, and the `Content-Type` header. Keep buckets private.
5. Configure `DEFAULT_TENANT_ID` to an existing tenant before public candidate registration.
6. Run endpoint workflows only with test accounts and test resumes; do not use real candidate data in logs or fixtures.

The backend currently does not have a single OpenAPI/Swagger schema or global rate limiter. This Markdown file is maintained from the mounted routers, validation schemas, and controller responses; update it alongside API changes.
