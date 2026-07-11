# Frontend Routes

The browser calls backend APIs through `/api/backend/*`; the route handler forwards to `NEXT_PUBLIC_API_URL` and manages the HttpOnly workspace session cookie.

| Route | Access | Purpose | Backend dependency |
| --- | --- | --- | --- |
| `/` | Public | Product overview and workspace entry. | None |
| `/login` | Public | Interviewer/organization login. | `POST /api/auth/login` |
| `/register` | Public | Create an interviewer workspace. | `POST /api/auth/register` |
| `/dashboard` | Workspace | Pipeline, recent completions, activity, and module performance. | `GET /api/analytics/summary`, `GET /api/analytics/activity` |
| `/templates` | Workspace | Search, inspect, assign, and delete templates. | `GET/DELETE /api/templates` |
| `/templates/create` | Workspace | Build a weighted multi-module assessment. | `POST /api/templates` |
| `/assessment` | Workspace | Search and filter interview sessions. | `GET /api/sessions` |
| `/assessment/create` | Workspace | Create an invite-only candidate session. | `GET /api/templates`, `POST /api/sessions` |
| `/assessment/[accessCode]` | Candidate invitation | Validate invitation, start, autosave, complete modules, run code, and submit. | Candidate access endpoints under `/api/sessions`, `/api/responses`, `/api/ai`, and `/api/code` |
| `/candidates` | Workspace | Candidate/session progress list. | `GET /api/sessions` |
| `/candidates/[sessionId]` | Workspace | Candidate details, assigned template, saved responses, and report readiness. | `GET /api/sessions/:id`, `GET /api/responses/session/:id`, report endpoints |
| `/reports/[sessionId]` | Workspace | Evidence-backed advisory report and reviewer notes. | `GET/POST /api/reports/:sessionId/*` |
| `/analytics` | Workspace | Completion, score distribution, module averages, and evidence themes. | `GET /api/analytics/*` |

The legacy password-reset, email-verification, settings, and user-management pages are not linked from the production navigation because the backend does not yet expose those workflows.
