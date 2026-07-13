# Frontend Routes

The browser calls backend APIs through `/api/backend/*`; the route handler forwards to `NEXT_PUBLIC_API_URL` and manages the HttpOnly workspace session cookie.

| Route | Access | Purpose | Backend dependency |
| --- | --- | --- | --- |
| `/` | Public | Product overview and workspace entry. | None |
| `/login` | Public | Workspace login (owner or interviewer). | `POST /api/auth/login` |
| `/register` | Public | Create a **workspace owner** and organization. | `POST /api/auth/register` |
| `/invite/[token]` | Public | Accept teammate invite; create interviewer account in that org. | `GET /api/organization/invites/token/:token`, `POST /api/organization/invites/accept` |
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
| `/users` | Workspace (Team) | List members; **owner** invites/removes interviewers and manages pending invites. | `/api/organization/members`, `/api/organization/invites*` |
| `/settings` | Workspace | Account/org preferences UI (mostly local mock for MVP). | Optional |

Password-reset and email-verification pages remain unlinked from primary navigation until those backend workflows exist.
