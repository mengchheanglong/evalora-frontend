# Frontend Routes

The browser calls backend APIs through `/api/backend/*`; the route handler forwards to `NEXT_PUBLIC_API_URL` and manages the HttpOnly workspace session cookie.

| Route | Access | Purpose | Backend dependency |
| --- | --- | --- | --- |
| `/` | Public | Product overview and workspace entry. | None |
| `/login` | Public | Workspace login (owner or interviewer). | `POST /api/auth/login` |
| `/register` | Public | Create a **workspace owner** and organization. | `POST /api/auth/register` |
| `/verify-email` | Public | Confirm a registration link or resend verification email. | `POST /api/auth/verify-email`, `POST /api/auth/resend-email-verification` |
| `/forgot-password` | Public | Request a workspace password reset email/link. | `POST /api/auth/forgot-password` |
| `/reset-password` | Public | Set a new password with the token from email or demo `resetUrl`. | `POST /api/auth/reset-password` |
| `/invite/[token]` | Public | Accept teammate invite; create interviewer account in that org. | `GET /api/organization/invites/token/:token`, `POST /api/organization/invites/accept` |
| `/dashboard` | Workspace | Pipeline, recent completions, activity, and module performance. | `GET /api/analytics/summary`, `GET /api/analytics/activity` |
| `/templates` | Workspace | Browse prebuilt library, review questions, clone, assign, and delete templates. | `GET /api/templates`, catalog/from-catalog endpoints |
| `/templates/create` | Workspace | From-scratch workspace: basics → modules/questions → review & create. | `POST /api/templates` |
| `/templates/ai` | Workspace | AI template builder: upload a job description or describe the role, review/edit the AI draft (explained weights totalling 100%), publish on confirmation. Resumes drafts via `?draft=<id>`. | `POST/GET/PATCH/DELETE /api/templates/drafts`, `POST /api/templates/drafts/:id/confirm` |
| `/templates/[id]/edit` | Workspace | Edit template details, modules, and questions; save via replace-update. | `GET/PUT /api/templates/:id` |
| `/assessment` | Workspace | Search and filter interview sessions. | `GET /api/sessions` |
| `/assessment/create` | Workspace | Create an invite-only candidate session. | `GET /api/templates`, `POST /api/sessions` |
| `/assessment/[accessCode]` | Candidate invitation | Validate invitation, start, autosave, complete modules, run code, and submit. | Candidate access endpoints under `/api/sessions`, `/api/responses`, `/api/ai`, and `/api/code` |
| `/candidates` | Workspace | Candidate/session progress list. | `GET /api/sessions` |
| `/candidates/[sessionId]` | Workspace | Candidate details, assigned template, saved responses, and report readiness. | `GET /api/sessions/:id`, `GET /api/responses/session/:id`, report endpoints |
| `/reports/[sessionId]` | Workspace | Evidence-backed advisory report and reviewer notes. | `GET/POST /api/reports/:sessionId/*` |
| `/analytics` | Workspace | Completion, score distribution, module averages, and evidence themes. | `GET /api/analytics/*` |
| `/users` | Workspace (Team) | List members; **owner** invites/removes interviewers and manages pending invites. | `/api/organization/members`, `/api/organization/invites*` |
| `/settings` | Workspace | Workspace name, device preferences, notifications, privacy export/retention/delete. | `GET/PUT /api/organization`, `GET /api/organization/privacy`, `GET /api/organization/export`, `DELETE /api/organization/data` |
| `/admin` | Platform **admin** only | Platform console landing page, Overview: a "needs attention" strip linking into filtered lists, four KPI cards with 30-day comparison and sparkline, a compact system-health summary line linking to `/admin/health`, a 30-day activity chart (sessions started/completed, new accounts, new workspaces, billable AI turns), and recently joined workspaces. Loads once; the AI spend card links to `/admin/costs` and nothing on this page polls. Renders in its own `AdminShell` with its own two-group sidebar (Platform, Operations) and a Ctrl/⌘+K search palette over workspaces and people; the workspace sidebar never links here. Admins land here after sign-in; anonymous visitors go to `/login`, every other role to `/dashboard`, and the backend rejects them with `403` regardless. Legacy `/admin#organizations` and `/admin#users` links forward to the routes below. | `GET /api/admin/overview`, `GET /api/admin/organizations` |
| `/admin/organizations` | Platform **admin** only | Every workspace on the platform. Filters, sort, page, and the open row live in the query string (`?q=&plan=&status=&sort=&order=&page=&open=`), so links and the back button restore the view. Sortable columns, skeleton loading, card layout on small screens. Selecting a row opens a nonmodal detail drawer (team, sessions by state, recent sessions, owner) where the plan is changed and the workspace is suspended or reactivated; suspending requires typing the workspace name. | `GET /api/admin/organizations`, `GET /api/admin/organizations/:id`, `PATCH /api/admin/organizations/:id/{status,plan}` |
| `/admin/users` | Platform **admin** only | Every account across every workspace with the same URL-synced filters (`?q=&role=&status=&sort=&order=&page=&open=`), role chips, sortable columns, and a detail drawer (workspace, activity counts, recent sessions). Role changes and deactivate/reactivate happen in the drawer; actions on the signed-in admin are disabled. | `GET /api/admin/users`, `GET /api/admin/users/:id`, `PATCH /api/admin/users/:id/{status,role}` |
| `/admin/costs` | Platform **admin** only | Usage & Cost: AI spend month to date with a 30-day billable-turn comparison, month-end projection, cost per turn, all-time spend, a billable-turns chart, the usage mix that drives spend (billable turns, template drafts, free fallback turns) with the costing methodology, and the plan mix linking into `/admin/organizations?plan=`. Month-to-date aggregates, so the page loads once and does not poll; a notice explains when no provider is configured and nothing is billed. | `GET /api/admin/overview` |
| `/admin/health` | Platform **admin** only | System health: status-page headline, database latency with a client-side trend over recent samples, LiveKit, API uptime and memory, WebSocket connections, every dependency with what happens when it is missing, and today's workload. The only console page that polls: it re-measures every 30 s while the tab is visible, on returning to the tab, and on demand, and the auto-refresh choice is remembered per browser. | `GET /api/admin/overview` |

Password reset is linked from `/login` → `/forgot-password` → email or demo `resetUrl` → `/reset-password?token=...`. Email registration continues from `/register` → verification email → `/verify-email?token=...` → authenticated dashboard.

After sign-in, platform admins land on `/admin` and workspace roles on `/dashboard` (`src/lib/auth-routes.ts`). An admin who also owns a workspace can switch between the two areas from the account menu; an admin without a workspace who opens a workspace route is sent back to `/admin`.
