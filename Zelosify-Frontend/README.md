# Zelosify Frontend

Next.js 15 / React 19 application using the App Router for the main product, Pages Router for legacy authentication and dashboard screens, Redux Toolkit, Tailwind, and shared shadcn/Radix components.

## Local development

```bash
npm ci
cp .env.example .env.local
```

Set the backend API origin (including version prefix):

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api/v1
```

Start the app at `http://localhost:5173`:

```bash
npm run dev
```

Backend services are required for authenticated routes, upload flows, and live job data. See the root [setup guide](../setup.md).

## API integration

The app uses the shared Axios client with `withCredentials: true` and the `/api/v1` base URL. Keep authenticated calls on that client so the backend's HttpOnly session cookies are sent. Vendor file uploads use presigned storage URLs and intentionally do not send backend cookies. Candidate application and resume-replacement forms submit multipart requests to the API.

The existing frontend API modules are connected to the backend routes used by the user-owned `FastApi.yml` collection:

| Flow                                 | Frontend API module or flow                                                                                  | Backend route                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Password login and TOTP              | `redux/features/Auth/authSlice.js`                                                                           | `POST /auth/login`, `POST /auth/verify-totp`, `GET /auth/user`                                                 |
| Shared internal dashboard            | `features/internal-dashboard/`                                                                               | `GET /dashboard`                                                                                               |
| Candidate registration and QR setup  | `pages/LandingPage/auth/RegisterPage.jsx`                                                                    | `POST /auth/register`, `GET /auth/totp/setup/qr`, `POST /auth/verify-totp`                                     |
| Recruiter administration             | `features/admin/api.js`                                                                                      | `GET/POST /admin/recruiters`                                                                                   |
| Public job discovery and job details | `features/candidate/api.js`, `features/candidate/JobSearchPage.jsx`, `features/candidate/JobDetailsPage.jsx` | `GET /jobs?search={keyword}`, `GET /jobs/:id`                                                                  |
| Managed openings and candidates      | `features/recruiter/api.js`                                                                                  | `GET /jobs/managed`, `GET /jobs/managed/:id`, `POST /jobs`, `PUT/DELETE /jobs/:id`, `GET /jobs/:id/candidates` |

The backend supports legacy auth aliases, but the frontend uses `/auth/login` and `/auth/register` to match the collection paths. The backend implementation and [API reference](../api.doc.md) define current behavior when a saved collection example is out of date. Keep `FastApi.yml` unchanged; update application code and this documentation instead.

The home page introduces the product and links to job discovery; job search and filtering live on `/jobs`.

## Main routes

| Route                                                                       | Purpose                                                          |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/`                                                                         | Public product introduction and entry points                     |
| `/jobs`, `/jobs/[id]`                                                       | Public opening discovery and candidate application               |
| `/candidate/dashboard`, `/candidate/applications`, `/candidate/profile`     | Candidate workspace                                              |
| `/dashboard`                                                                | Shared internal dashboard for admin, recruiter, manager, vendor  |
| `/vendor/openings`, `/vendor/openings/[id]`                                 | Vendor opening browse, resume submission, own profile management |
| `/hiring-manager/openings`, `/hiring-manager/openings/[id]`                 | Assigned openings and candidate review                           |
| `/recruiter/jobs`, `/recruiter/jobs/[id]/applicants`, `/recruiter/jobs/new` | Tenant recruiter opening and applicant workflow                  |
| `/admin/recruiters`                                                         | Tenant team management and permission-aware team creation        |
| `/login`, `/register`                                                       | Keycloak/TOTP login and candidate registration                   |

Route protection is for navigation and user experience; backend authorization is authoritative. Vendor pages must not render recommendation details.

The four internal roles share `/dashboard`; cards and actions are filtered by role. `ADMIN` and `IT_VENDOR` can create recruiters or hiring managers; `HIRING_MANAGER` can create recruiters. The backend assigns the authenticated caller's tenant and role-specific default permissions. `RECRUITER` accounts do not see or access the recruiter-creation page.

## Commands

| Command         | Purpose                            |
| --------------- | ---------------------------------- |
| `npm run dev`   | Development server on port 5173    |
| `npm run build` | Optimized Next.js build            |
| `npm start`     | Run production server on port 5173 |
| `npm run lint`  | Run ESLint                         |

## Design and API docs

- [Design.md](Design.md) defines the black-first visual and accessibility contract.
- [Frontend specification](FRONTEND_SPECIFICATION.md) describes the recruitment workflow and implementation state.
- [API reference](../api.doc.md) documents request/response contracts.
