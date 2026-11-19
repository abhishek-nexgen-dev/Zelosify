# Zelosify Comprehensive Setup Guide

Use this guide to prepare a local Zelosify environment. It covers the frontend, API, database, identity provider, private resume storage, and optional AI/email integrations. Production deployment requires separate security and operations review.

## Contents

- [Prerequisites](#prerequisites)
- [Install dependencies](#step-1-clone-repository--install-dependencies)
- [Configure PostgreSQL](#step-2-set-up-postgresql-database)
- [Configure Keycloak](#step-3-install--configure-keycloak-identity--totp-2fa)
- [Configure environment variables](#step-4-configure-backend-environment-variables-env)
- [Migrate and seed the database](#step-5-run-prisma-migrations--seed-database)
- [Start the backend and frontend](#step-6-start-backend-server)
- [Register and enroll TOTP](#step-8-user-registration--totp-2fa-workflow-postman--api)
- [Troubleshooting](#troubleshooting-checklist)
- [Production commands](#production-deployment-mode)

---

## Architecture Overview

```
Next.js 15 frontend: http://localhost:5173
  Uses REST APIs
Express and TypeScript backend: http://localhost:5000
  PostgreSQL database: localhost:5432 (multi-tenant records)
  Keycloak 26: http://localhost:8080/auth (identity and MFA/TOTP)
  AWS S3: private resume objects (configured bucket)
```

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Node.js**: `v20.x` or `v22.x LTS` (Node 24 supported)
- **npm** or **pnpm**: `npm v10+` / `pnpm v9+`
- **PostgreSQL**: `v14+` (Local installation or Docker)
- **Java OpenJDK**: `Java 17`, `21`, or `25` (required for running Keycloak standalone)
- **Git**: `2.30+`
- **Docker & Docker Compose**: Optional (alternative to standalone local services)

Verify your environment:
```bash
node -v
npm -v
psql --version
java -version
```

---

## Step 1: Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd eval-83deaa4a1213

# 1. Install Backend Dependencies
cd Zelosify-Backend/Server
npm ci

# 2. Install Frontend Dependencies
cd ../../Zelosify-Frontend
npm ci

# 3. Return to project root
cd ..
```

---

## Step 2: Set Up PostgreSQL Database

Zelosify requires a PostgreSQL database named `zelosify`.

### 1. Verify PostgreSQL Service
```bash
# Linux (systemd)
sudo systemctl status postgresql
# Start now and enable automatic startup after reboot:
sudo systemctl enable --now postgresql

# macOS (Homebrew)
brew services start postgresql@14

# Windows (Administrator PowerShell; adjust the service name to your installed version)
Start-Service postgresql-x64-17
```

The backend checks the configured PostgreSQL host before applying migrations. If the server is still starting, it waits for `DB_STARTUP_WAIT_SECONDS` (20 seconds by default), then reports the host, port, and recovery command. It cannot start an operating-system database service without administrator privileges.

### 2. Create the `zelosify` Database
Open the PostgreSQL interactive shell:
```bash
sudo -u postgres psql
# Or if you have a password set:
psql -U postgres -h localhost -p 5432
```

In the `psql` prompt, run:
```sql
CREATE DATABASE zelosify;
```

Verify the database was created:
```sql
\l
```
*(You will see `zelosify` listed under Database names)*.

Exit `psql`:
```sql
\q
```

---

## Step 3: Install & Configure Keycloak (Identity & TOTP 2FA)

Keycloak powers authentication, password credentials, and TOTP 2FA.

### Option A: Standalone Java Keycloak (Recommended - Fast & No Docker Needed)

The repository provides automated scripts to download Keycloak, configure it, and auto-provision the `Zelosify` realm, roles, and client.

#### 1. Download & Install Keycloak (One-time step):
From the backend directory:
```bash
cd Zelosify-Backend/Server
npm run keycloak:install
```
*Or from the workspace root:*
```bash
bash scripts/install-keycloak.sh
```
This downloads Keycloak 26.0.7 into `./keycloak` (gitignored).

#### 2. Start Keycloak:
```bash
cd Zelosify-Backend/Server
npm run keycloak:start
```
The script prompts for the local Keycloak administrator password without echoing it when `KEYCLOAK_ADMIN_PASSWORD` is not already set.

*Or from the workspace root:*
```bash
bash scripts/start-keycloak.sh
```

**What this script does automatically:**
- Creates a development-mode Keycloak administrator. Set a unique password immediately and keep it outside tracked files.
- Configures `-Dnet.bytebuddy.experimental=true` so Keycloak runs seamlessly on OpenJDK 17, 21, and 25.
- Starts Keycloak in development mode on `http://localhost:8080/auth`.
- Auto-imports `keycloak-realm/zelosify-realm.json`, which provisions:
  - **Realm**: `Zelosify`
  - **Roles**: `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `CANDIDATE`, `IT_VENDOR`
  - **Client**: `dynamic-client`
  - **Client Secret**: retrieve it from the `dynamic-client` credentials page and set `KEYCLOAK_CLIENT_SECRET` in `.env`.
  - Direct Access Grants (Resource Owner Password Credentials) and Service Accounts enabled.

#### 3. Verify Keycloak is Running:
In a new terminal window:
```bash
curl -s http://localhost:8080/auth/realms/Zelosify/.well-known/openid-configuration | grep issuer
```
Expected output:
```json
"issuer":"http://localhost:8080/auth/realms/Zelosify"
```

Keycloak Admin Console is available at:
- **URL**: `http://localhost:8080/auth/admin`
- Sign in with the administrator credentials configured for your local Keycloak instance. Do not reuse defaults or publish credentials.

---

### Option B: Docker Compose Keycloak (Alternative)

If you prefer Docker containers, set unique `POSTGRES_PASSWORD` and `KEYCLOAK_ADMIN_PASSWORD` values in the ignored `Zelosify-Backend/Server/.env` file first. The database password must match the password in `DATABASE_URL`. Docker Compose now refuses to start with missing credentials.

```bash
cd Zelosify-Backend/Server
docker compose up -d keycloak
```
Then log in to `http://localhost:8080/auth/admin`, create realm `Zelosify`, create the client `dynamic-client`, and add the realm roles: `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `CANDIDATE`, `IT_VENDOR`.

---

## Step 4: Configure Backend Environment Variables (`.env`)

In `Zelosify-Backend/Server/.env`, configure your database, Keycloak, AWS S3, and JWT secrets:

```dotenv
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173

# Database Connection (native local PostgreSQL)
DATABASE_URL=postgresql://<your-postgres-user>:<your-postgres-password>@localhost:5432/zelosify?schema=public
# Set the username/password to match your local PostgreSQL role.
# If using Docker Compose instead, use its port 5445 and database zelosify_recruit_test.
# For Supabase, use the project connection string with sslmode=require; keep the password only in this ignored .env file.

Supabase direct `db.<project>.supabase.co:5432` connections require IPv6 unless the project has the IPv4 add-on. For IPv4-only computers or networks, copy the **Session pooler** string from the Supabase Dashboard's Connect dialog; its host and username differ from the direct connection. Do not guess the pooler host or commit either connection string.

# JWT & Session Security
JWT_SECRET=replace_with_local_jwt_secret
SESSION_SECRET=replace_with_local_session_secret
ENCRYPTION_ALGORITHM="aes-256-gcm"
ENCRYPTION_KEY=replace_with_64_hex_chars

# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8080/auth
KEYCLOAK_REALM=Zelosify
KEYCLOAK_CLIENT_ID=dynamic-client
KEYCLOAK_CLIENT_SECRET=replace_with_keycloak_client_secret
KEYCLOAK_ADMIN=<your_local_keycloak_admin_username>
KEYCLOAK_ADMIN_PASSWORD=<your_unique_local_keycloak_admin_password>

# Storage Configuration (AWS S3)
STORAGE_PROVIDER=aws
S3_AWS_REGION=us-east-1
S3_ACCESS_KEY_ID=replace_with_aws_access_key_id
S3_SECRET_ACCESS_KEY=replace_with_aws_secret_access_key
S3_BUCKET_NAME=zel-recruit
STORAGE_SIGNED_URL_EXPIRES_IN=900

# LangChain AI screening tool-calling provider (choose groq or gemini)
AI_AGENT_PROVIDER=groq
GROQ_API_KEY=<your_groq_api_key>
GROQ_MODEL=openai/gpt-oss-120b
# Or select Gemini:
# AI_AGENT_PROVIDER=gemini
# GEMINI_API_KEY=<your_gemini_api_key>
# GEMINI_MODEL=gemini-3.1-flash-lite
# GEMINI_REQUEST_TIMEOUT_MS=15000
# Optional legacy xAI-compatible model:
# AI_AGENT_PROVIDER=grok
# XAI_API_KEY=<your_xai_api_key>
# GROK_MODEL=<model_available_to_your_xai_account>

# SMTP for candidate shortlist/rejection notifications (optional in local development)
# When SMTP_HOST and SMTP_FROM are configured, queued decision emails are sent by the backend worker.
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your_smtp_username>
SMTP_PASSWORD=<your_smtp_password>
SMTP_FROM="Zelosify Talent <no-reply@example.com>"
DECISION_EMAIL_WORKER_INTERVAL_MS=10000

# Default Tenant & Admin Auto-Provisioning Configuration
DEFAULT_TENANT_ID=8dc0e05b-2956-4d74-b0e9-5aea5ab3b748
DEFAULT_TENANT_NAME="Bruce Wayne Corp"
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@zelosify.com
DEFAULT_ADMIN_PASSWORD=<your_unique_local_admin_password>
DEFAULT_ADMIN_FIRST_NAME=System
DEFAULT_ADMIN_LAST_NAME=Admin
```

Candidate decision notifications are written to a PostgreSQL outbox in the same transaction as the shortlist/rejection. Configure the SMTP values above to send them. The worker retries transient send failures up to five times with backoff; messages remain queued when SMTP is not configured. After pulling the change, apply the additive migration with `npm run prisma:deploy`.

> **Default Tenant & Admin Bootstrap**:
> On server startup, the backend reads `DEFAULT_TENANT_ID` and `DEFAULT_ADMIN_*` from `.env` to provision or verify the default tenant administrator. These values select the tenant used for local setup and seed data; they do not restrict the application to one tenant. Tenant-scoped APIs must continue to derive tenant access from the authenticated account.

---

### Administrator access

The backend provisions the configured tenant administrator from `DEFAULT_ADMIN_*` during startup. Use a unique password you control and complete TOTP enrollment at first sign-in. The repository does not publish working administrator passwords or TOTP secrets. If credentials were previously copied from older documentation, rotate them in both Keycloak and the local environment.

---

## Step 5: Run Prisma Migrations & Seed Database

Apply migrations to create all database tables, foreign keys, and role enums (`ADMIN`, `RECRUITER`, `HIRING_MANAGER`, `CANDIDATE`, `IT_VENDOR`):

For native PostgreSQL, enable/start the local service and confirm port 5432 accepts connections before continuing:

```bash
sudo systemctl enable --now postgresql
pg_isready -h localhost -p 5432
```

Create database `zelosify` once if it does not exist (for example, with `sudo -u postgres createdb zelosify`). Set the `.env` username and password to match your local PostgreSQL role. If `pg_isready` reports no response, the database service is stopped, not installed, or listening on a different port; Prisma cannot migrate or seed until it is reachable. For remote PostgreSQL, confirm outbound access to its host and port and use the provider's required TLS setting. Never paste database passwords into source code, issue reports, or tracked configuration.

```bash
cd Zelosify-Backend/Server

# 1. Generate Prisma Client
npm run prisma:generate

# 2. Deploy database migrations
npm run prisma:deploy

# 3. Seed Tenant and Openings
npm run seed:openings
```

Expected seed output:
```text
🌱 Seeding Bruce Wayne Corp tenant and openings...
✅ Tenant verified: Bruce Wayne Corp (8dc0e05b-2956-4d74-b0e9-5aea5ab3b748)
✅ Hiring Manager verified: Lucius Fox
✅ Successfully seeded 14 diverse contract openings for Bruce Wayne Corp!
```

The seed command upserts 14 tenant openings and assigns them to the configured hiring manager. Each seeded opening includes role-specific required skills for AI matching. It does not delete other openings or applications.

For the assignment workflow, sign in as the tenant `ADMIN` and use **Create team member** to provision an `IT_VENDOR` account. Use the same page to provision hiring managers and recruiters. Vendor and manager permissions are role-limited by the backend; a stale database permission array cannot grant a role access outside its ceiling. The Admin account is the tenant operator and is separate from the IT Vendor submission persona.

Apply the additive assignment permission migrations through the normal deployment step (`npm run prisma:deploy`) before testing existing accounts. They normalize Vendor permissions, grant Hiring Managers `JOBS_CREATE` while keeping `JOBS_UPDATE` disabled, clear internal permissions from candidate accounts, and preserve all users and openings.

Add the verified tenant ID to `Zelosify-Backend/Server/.env`:
```dotenv
DEFAULT_TENANT_ID=8dc0e05b-2956-4d74-b0e9-5aea5ab3b748
```

---

## Step 6: Start Backend Server

```bash
cd Zelosify-Backend/Server
npm run dev
```

Expected startup logs:
```text
[AWS S3] Initialized with: {
  region: 'us-east-1',
  bucket: 'zel-recruit',
  endpoint: 'https://s3.us-east-1.amazonaws.com',
  hasCredentials: true
}
✅ Connected to Keycloak Server
✅ [PostgreSQL] Connected successfully to database (postgresql://postgres:****@localhost:5432/zelosify)
Server running on port 5000...
```

Verify backend root endpoint in another terminal:
```bash
curl http://localhost:5000/
# Output: Server Connected!
```

---

## Step 7: Configure & Start Next.js Frontend

1. Navigate to frontend:
   ```bash
   cd Zelosify-Frontend
   ```

2. Create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Verify content:
   ```dotenv
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api/v1
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

   Run the auth/session regression tests with `npm run test:auth` from `Zelosify-Frontend`.

4. Open your browser:
   ```text
   http://localhost:5173
   ```

---

## Step 8: User Registration & TOTP 2FA Workflow (Postman / API)

For protected dashboard URLs, the frontend redirects users with missing, malformed, or expired access-token JWTs to `/login`, preserving a same-site return path. A `401` from an API while on a protected page also redirects to login. On public pages, the navbar waits for the current-session check, then shows Dashboard only for a valid signed-in user; otherwise it shows Sign in and Create account. The background check does not display raw `Invalid or expired token` responses on the login screen. If the temporary TOTP session expires, the form returns to the password step so the user can sign in again.

### 1. Tenant provisioning
```bash
cd Zelosify-Backend/Server
npm run prisma:studio
```
Opens browser at `http://localhost:5555`. View the `tenants` table and observe the configured default tenant. The application schema supports additional tenants; create or provision them through the supported tenant setup process rather than changing `DEFAULT_TENANT_ID` to switch an existing user's tenant.

### 2. Register a candidate (Postman / cURL)

> **Tenant and public registration policy:** The data model and authenticated APIs support multiple tenants. Public candidate registration is intentionally narrower: it creates only a `CANDIDATE` in the configured `DEFAULT_TENANT_ID`; a client cannot choose a role or tenant. Do not change this default tenant to move an existing account between tenants.

Send a `POST` request to `http://localhost:5000/api/v1/auth/register`:

**Headers:**
```text
Content-Type: application/json
```

**Candidate Body (role and tenant are server-controlled):**
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

To provision recruiters, use the authenticated admin recruiter endpoint. Public registration cannot grant vendor, manager, recruiter, or admin roles.

#### cURL Example:
```bash
curl -c cookies.txt -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "abdulla",
    "email": "abdulla@example.com",
    "password": "<your-unique-test-password>",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+12334567890",
    "department": "Sales"
  }'
```

### 3. Signup Response and Temporary Cookie
The backend provisions the user in Keycloak, maps their realm role, saves the account and a pending TOTP secret in PostgreSQL, and sets a five-minute HttpOnly `temp_token` cookie. The signup response does not contain `qrCode`, `qrCodeUrl`, `otpAuthUrl`, or the TOTP secret:

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

`temp_token` is set with `Set-Cookie`; it is not included in JSON and cannot be read by frontend JavaScript. Browser requests must use credentials. If `totpSessionReady` is `false`, use the normal login flow to continue setup.

### 4. Fetch the Pending Setup QR
The signup page calls this automatically. To fetch it with cURL, preserve the cookie jar created during signup:

```bash
curl -b cookies.txt http://localhost:5000/api/v1/auth/totp/setup/qr
```

The response is `{ "qrCode": "data:image/png;base64,..." }`. The QR is generated from the stored pending secret and is not stored in S3. Repeating this request returns the same pending secret. The route requires the valid temporary cookie and rejects accounts whose TOTP is already active.

Open Google Authenticator, scan the QR, and enter its current six-digit code on the setup page. The page posts the code to `/auth/verify-totp`; successful verification activates TOTP, clears `temp_token`, sets the authenticated cookies, and redirects to the dashboard.

### 5. Logging In via Frontend / API
1. Navigate to `http://localhost:5173/login`.
2. Enter username/email and password (the unique test password you set during registration).
3. Accounts with pending setup receive a QR through `/auth/totp/setup/qr`; scan it and enter the six-digit code. Enrolled accounts enter their current six-digit code and are not given a QR during password-only sign-in.
4. You will be authenticated and redirected to your dashboard based on role:
   - `IT_VENDOR` ➔ `/vendor/openings`
   - `RECRUITER` ➔ `/recruiter/jobs`
   - `ADMIN` ➔ `/admin/recruiters`
   - `HIRING_MANAGER` ➔ `/hiring-manager/openings`
   - `CANDIDATE` ➔ `/candidate/dashboard`

The `temp_token` cookie expires after five minutes. For enrolled accounts that have lost their authenticator, use the organization’s recovery process; the password-stage session cannot reveal or rotate an active TOTP secret.

---

## Step 9: Hiring Lifecycle and Verification

The following describes the intended platform workflow. A successful build or unit test does not by itself verify external services or a live end-to-end workflow; use the verification checklist at the end of this guide for those checks.

### Workflow Overview:
1. **Candidate Registration (`POST /auth/register` or `/auth/signup`)**:
   - `tenantId` and `role` are server-controlled; public registration always creates a candidate in `DEFAULT_TENANT_ID`.
   - Keycloak credentials and PostgreSQL profile are provisioned.
   - TOTP secret remains pending; signup sets a short-lived HttpOnly `temp_token` cookie and does not return QR data.
   - The frontend retrieves the QR through `GET /auth/totp/setup/qr`, then activates setup through `POST /auth/verify-totp`.
2. **Candidate Login & 2FA (`POST /auth/login` ➔ `POST /auth/verify-totp`)**:
   - Credential validation yields an HttpOnly `temp_token` and indicates if setup is still pending.
   - Pending users can fetch a setup QR; enrolled users must provide their current TOTP code. Password-stage sessions cannot retrieve active users' QR secrets.
   - Successful TOTP verification completes Keycloak token exchange and sets `access_token` and `refresh_token` cookies.
3. **Fresh Resume Upload (`POST /jobs/:id/apply`)**:
   - Candidate must upload a PDF, DOC, or DOCX in a single multipart request for every job application.
   - Backend validates the file and generates a new candidate-scoped object key. The client cannot submit `s3Key` or candidate ID.
4. **Job Application Submission (`POST /jobs/:id/apply`)**:
   - Job identity comes from the route and candidate identity from the authenticated session; no previously stored resume key is accepted for a new application.
   - Server checks file size, MIME, extension, and signature before storage.
   - Creates `hiringProfile` record with `status: SUBMITTED` and queues AI recommendation.
5. **Asynchronous AI Screening & Deterministic Scoring**:
   - LangChain's `ResumeBufferDocumentLoader` extracts bounded text from the uploaded PDF, DOC, or DOCX; the original file is not sent to the AI provider. Repeated layout lines are removed. Uploads must be no more than 2 pages and 12,000 extracted characters; validation occurs before storage.
   - Orchestrator invokes the selected Groq or Gemini tool-calling model executing:
     `parse_resume` ➔ `extract_features` ➔ `normalize_skills` ➔ `match_candidate` ➔ `score_candidate`.
   - Deterministic scoring:
     - **Skill Score** (50% weight): matching / required skills.
     - **Experience Score** (30% weight): 1.0 (in range), 0.8 (above max), 0.0 (below min).
     - **Location Score** (20% weight): 1.0 (exact match or remote), 0.5 (onsite mismatch).
     - **Final Score**: `0.5 * skill + 0.3 * exp + 0.2 * location`.
   - Checks the printed resume name against the authenticated candidate profile before saving a score. A mismatch leaves the analysis failed with no score.
   - Groq and Gemini receive up to 12,000 extracted characters. Groq extraction allows 1,500 output tokens and Gemini allows 800. If Groq structured extraction returns HTTP 400, the backend retries with plain JSON text and validates the parsed response with Zod before using it; invalid output triggers the configured Gemini fallback.
   - Updates profile with score, reason, confidence, and `recommendationStatus: COMPLETED`. On provider rate limits or temporary server errors, one bounded retry uses a short `Retry-After` when provided. A timeout switches immediately to the other configured provider to preserve time for fallback. Other provider-specific failures also use the configured fallback; invalid credentials and missing models are not retried against the same provider. Candidates can retry a failed run for the same application without uploading again; a new application still requires a fresh file upload.
6. **Recruiter / Admin Decision (`POST /candidates/:id/shortlist` or `/reject`)**:
   - Recruiter reviews candidate recommendations and executes shortlist/reject decision.

### Manual assignment check: IT Vendor to Hiring Manager

Use this checklist to verify the assignment workflow in the running app. Use a non-production tenant and synthetic resume files. Do not use a real candidate's resume for a smoke test.

#### Before testing

1. Confirm PostgreSQL, Keycloak, backend, and frontend are running. The frontend defaults to `http://localhost:5173`; the backend defaults to `http://localhost:5000`; Keycloak defaults to `http://localhost:8080`.
2. Confirm the configured tenant has received migrations. From `Zelosify-Backend/Server`, run `npx prisma migrate status`; if migrations are pending, apply them with `npm run prisma:deploy` before continuing. Do not use `prisma:reset`.
3. If the tenant needs the assignment openings, run `npm run seed:openings`. This is an upsert of the 14 configured openings; it does not delete existing openings or applications.
4. Prepare one synthetic PDF or PPTX file under 10 MiB. Vendor profile uploads support PDF/PPTX. Candidate self-application is a separate flow and accepts PDF/DOC/DOCX; do not use candidate registration/apply as a substitute for the vendor test.

#### Run the workflow

1. Sign in as the tenant `ADMIN` at `http://localhost:5173/login`, completing TOTP if prompted. From the admin team page (`/admin/recruiters/new`), create an `IT_VENDOR` test account if one does not already exist. Keep its temporary password private. Confirm a `HIRING_MANAGER` account is also available.
2. As Admin, open an assignment opening and its **Team** tab. Assign a same-tenant Hiring Manager and Recruiter, then save. The seeded openings are assigned to the configured manager; Admin can change assignments for this test. Do not assign a Hiring Manager to another tenant's opening.
3. As Hiring Manager, choose **Create opening** from the Hiring Manager area. Confirm the new opening is assigned to you and you can choose a same-tenant Recruiter. The form must not let you choose a different Hiring Manager; the API must reject a forged `hiringManagerId` that names another person. Vendor and Candidate accounts must not be able to create an opening.
4. Sign out and sign in as the test `IT_VENDOR`. Open `http://localhost:5173/vendor/openings`, select the same opening, and submit the synthetic PDF/PPTX through the upload control. A successful submission should create a profile and show it in that vendor's own opening view. Analysis is asynchronous, so it may initially appear as pending/processing.
5. Sign out and sign in as the assigned `HIRING_MANAGER`. Open `http://localhost:5173/hiring-manager/openings`, choose the same opening, and open its candidate/profile view. Confirm the submitted profile appears, the analysis reaches `COMPLETED` or displays a safe failure reason, and any displayed candidate name comes from the resume analysis rather than the Vendor account. A completed analysis should show the score, confidence, band, and recommendation explanation to the reviewer.
6. From the manager review UI, manually shortlist or reject this synthetic test profile. Confirm the decision status updates. If SMTP is configured, verify the notification reaches the designated test inbox; otherwise the decision should still save and the email remains queued for delivery.

#### Check role boundaries

- As IT Vendor, confirm only that vendor's submissions are visible and that candidate score, recommendation explanation, shortlist, and reject controls are absent. Vendor routes are `/vendor/openings`, `/vendor/openings/:id`, and `/vendor/openings/:id/profiles/:id/preview` (preview only for the vendor's own profile).
- As Hiring Manager, confirm only openings assigned to that manager are listed and only those opening profiles can be reviewed or decided. A different manager's opening should be unavailable (the API returns not found for out-of-scope openings).
- As Hiring Manager, confirm `JOBS_CREATE` is present after migration and `JOBS_UPDATE` is absent. Creation must assign the new opening to the current manager; only a same-tenant Recruiter can be selected as the additional assignee.
- As Recruiter, confirm only recruiter-assigned openings appear. A Recruiter cannot reassign the opening team.
- As Admin, confirm team creation and both manager/recruiter assignment controls are available, and that created identities remain in the configured tenant.
- Cross-tenant denial requires a separate test tenant and identities in a non-production environment. The public signup API does not create tenants. Use the approved tenant-provisioning process for a disposable test environment; never add test tenants or accounts to production solely for this check.

#### Record the result

Record the opening ID, test profile ID, file type, upload result, final analysis state, decision result, and whether each role saw only its authorized data. Do not record passwords, tokens, API keys, raw resume text, or private resume content. For a failed analysis, record only the safe `errorCode`, provider, model, and HTTP status from the backend's structured diagnostic.

This manual workflow verifies functional integration for one synthetic profile. It does **not** prove the assignment's load/performance target. The separate performance requirement is 100 profiles, under 1,500 ms per profile and P95 below 2,000 ms; measure and report it separately, and do not send a large batch to a paid AI provider without checking quota and cost first.

### Live functional verification record (18 November 2026)

The live functional check used the configured Supabase database, the local Keycloak realm, the running backend and frontend, two disposable tenants, and synthetic PDF files. It created temporary test identities and openings, then removed the test tenants, users, openings, profiles, and uploaded S3 objects after the run.

- All five roles (`ADMIN`, `IT_VENDOR`, `HIRING_MANAGER`, `RECRUITER`, and `CANDIDATE`) completed password and TOTP login. A second-tenant Vendor and Hiring Manager also completed login.
- Admin provisioning created the test Vendor, Hiring Managers, and Recruiter. A Hiring Manager created an opening assigned to themself and a same-tenant Recruiter.
- Two synthetic PDFs uploaded through the Vendor signed-URL flow. AI analysis completed and persisted for both profiles. The assigned Hiring Manager viewed the scores, shortlisted one profile, and rejected the other.
- A second-tenant Vendor received `404` for the first tenant's opening. An unassigned same-tenant Hiring Manager and a second-tenant Hiring Manager were denied profile access. The Vendor response did not contain recommendation scores or reasons.
- Cleanup reported all temporary identities, tenant rows, profiles, openings, and S3 objects removed.

This is a functional integration check, not a performance benchmark. It does not establish the assignment's 1,500 ms per-profile or 2,000 ms P95 target.

The account audit also found one existing Hiring Manager database row whose linked Keycloak identity is missing. The disposable test Hiring Managers passed login; this existing account still needs an Admin to provision a replacement identity through the normal team-management flow. Keep its existing database row and assignments until the Admin has confirmed how to retire or replace it.

The pre-update Desktop copy of this guide contained an AWS access key that matches the configured backend credential. It has now been replaced with this sanitized guide. The matching AWS key still needs rotation by the AWS account owner before it is considered safe; do not copy real credentials into this guide, source control, or support messages.

Two product choices intentionally differ from the assignment PDF: the website is dark-only, per the requested product direction, and Admin-created openings may remain unassigned, per the requested job workflow. Hiring Managers creating openings are assigned to themselves automatically. Keep these choices unless the product owner explicitly changes them.

---

## Production Deployment Mode

To run in production mode:

### 1. Backend Production Build & Start
```bash
cd Zelosify-Backend/Server

# Build TypeScript to production dist/
npm run build

# Set production mode in .env
NODE_ENV=production

# Run production server
npm start
```

### 2. Frontend Production Build & Start
```bash
cd Zelosify-Frontend

# Build Next.js production bundle
npm run build

# Start production server
npm start
```

---

## Troubleshooting Checklist

| Issue | Root Cause | Solution |
|---|---|---|
| Login shows `Invalid credentials or identity service unavailable` | The app returns a generic message for a wrong password, missing/disabled Keycloak user, provider outage, or password-grant configuration problem | Email sign-in is trimmed and case-insensitive; both email and username are resolved to the same canonical Keycloak username. Restart/reload the backend after updating this login handling. Check the backend log for `KEYCLOAK_PASSWORD_GRANT_FAILED`; it records only the HTTP status, a sanitized Keycloak error code, or a transport error code, never the username, password, token, or provider description. `invalid_grant` usually means the identity/password does not match; a transport error or 5xx points to Keycloak/network availability. Confirm the app user is linked to an enabled Keycloak user with a password credential and the expected realm role. Do not paste passwords or OTPs into logs or support messages. After password login succeeds, complete TOTP setup/verification as prompted. |
| One role account exists in the app database but cannot sign in | Its linked Keycloak identity may have been removed or become stale | Have an Admin provision a replacement account through the supported team flow, or repair the identity in Keycloak and verify the application link. Do not manually change database `externalId` values to an unrelated user. Password reset/re-provisioning must be completed by the account owner/Admin using the approved credential workflow. |
| Frontend shows `Cannot read properties of undefined (reading 'call')` or a missing `segment-explorer-node.js#SegmentViewNode` Client Manifest error in development | Stale or inconsistent Next.js `.next` development artifacts | Stop the frontend dev server, remove only `Zelosify-Frontend/.next`, then run `npm run dev` again from `Zelosify-Frontend`. Do not remove `node_modules`, lockfiles, or source files. This is a development-cache recovery step; if it returns after a clean start, capture the first server stack trace and check for multiple Next.js processes using port 5173. |
| `POSTGRES_STARTUP_CHECK_FAILED` or Prisma `P1001` | Database service stopped, host/port mismatch, network/DNS restriction, or database missing | For local Debian/Parrot, run `sudo systemctl enable --now postgresql`; check `pg_isready -h localhost -p 5432`; verify `DATABASE_URL` and create `zelosify` if needed. For remote PostgreSQL, verify DNS, firewall/outbound TCP, and provider TLS settings. |
| Prisma `P2022` naming a missing recommendation column | The database has not received the recommendation execution migration | From `Zelosify-Backend/Server`, run `npm run prisma:deploy`, then restart the backend. This migration adds run metadata and a zero-default attempt count without deleting profiles. |
| `KEYCLOAK_STARTUP_CHECK_FAILED` or registration returns 503 | Keycloak is stopped, the `Zelosify` realm is unavailable, the admin credentials are wrong, or a role assignment failed | Run `npm run keycloak:start` in a separate terminal. Verify the realm discovery URL and inspect the backend `KEYCLOAK_REGISTRATION_FAILED` stage/status log. Check `.env` admin credentials and client configuration. |
| `Java 25 ByteBuddy Exception` on Keycloak startup | OpenJDK 25 compatibility with Keycloak 26 | Handled automatically by `scripts/start-keycloak.sh` using `-Dnet.bytebuddy.experimental=true` |
| Registration ignores `tenantId` or `role` | Public registration is candidate-only by design | The backend strips these legacy fields and assigns `DEFAULT_TENANT_ID` and `CANDIDATE`. Use the authenticated admin recruiter endpoint for recruiter provisioning. |
| Registration returns `409` for an existing Keycloak username | The identity may already exist from an earlier partial registration or another account | Retry with the same username, email, and password only if it is your account; the backend safely links a matching unprivileged identity. Otherwise sign in or contact an administrator. |
| Candidate sees “Analysis unavailable” | Recommendation is `FAILED`; the backend log and internal recommendation metadata contain a safe `errorCode`, provider, model, and optional HTTP status | Check that `AI_AGENT_PROVIDER` is `groq` or `gemini`, the matching API key is present, and the model name is enabled for that account. On a provider rate limit or temporary outage, the worker makes one bounded retry; a timeout immediately uses the other configured provider. Other provider-specific failures also use the configured fallback; invalid credentials and missing models are not retried against the same provider. For `PROVIDER_MODEL_NOT_FOUND`, select a model enabled for your provider account; for `PROVIDER_AUTH_FAILED`, rotate/check the key. For `RESUME_PARSE_FAILED`, use a readable PDF/DOC/DOCX under 10 MiB and install `catdoc` for DOC. The candidate can retry the same application from My Applications if the retry button is available. Never paste API keys or resume text into logs or support messages. |
| S3 upload errors | Missing or invalid AWS credentials | Verify `S3_AWS_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_BUCKET_NAME` in `.env` |
| Port 5000 / 8080 already in use | Another process running | Check with `lsof -i :5000` or `lsof -i :8080` and terminate previous process |

---

## Summary of Useful Commands

| Task | Location | Command |
|---|---|---|
| **Install Keycloak** | `Zelosify-Backend/Server` | `npm run keycloak:install` |
| **Start Keycloak** | `Zelosify-Backend/Server` | `npm run keycloak:start` |
| **Prisma Generate** | `Zelosify-Backend/Server` | `npm run prisma:generate` |
| **Apply DB Migrations** | `Zelosify-Backend/Server` | `npm run prisma:deploy` (also runs automatically from `npm run dev` and `npm start`) |
| **Seed Tenant & Openings** | `Zelosify-Backend/Server` | `npm run seed:openings` |
| **Run Backend Dev Server** | `Zelosify-Backend/Server` | `npm run dev` |
| **Run Unit Tests** | `Zelosify-Backend/Server` | `npm run test -- --run` |
| **Prisma Studio GUI** | `Zelosify-Backend/Server` | `npm run prisma:studio` |
| **Run Frontend Dev Server** | `Zelosify-Frontend` | `npm run dev` |
| **Build Frontend** | `Zelosify-Frontend` | `npm run build` |
