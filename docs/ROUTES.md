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
| `/admin` | Platform **admin** only | Platform console, Usage & Cost: platform totals, estimated AI spend, and live system health. The console is a separate area from the workspace: it renders in its own `AdminShell` with its own sidebar (Usage & Cost, Organizations, Users) and never shows workspace navigation, and the workspace sidebar never links to it. Admins land here after sign-in. Anonymous visitors go to `/login`, every other role is redirected to `/dashboard`, and the backend rejects them with `403` regardless. Legacy `/admin#organizations` and `/admin#users` links forward to the routes below. | `GET /api/admin/overview` |
| `/admin/organizations` | Platform **admin** only | Every workspace on the platform: search by name or owner email, plan and status filters, inline plan change, suspend/reactivate with confirmation, pagination. | `GET /api/admin/organizations`, `PATCH /api/admin/organizations/:id/{status,plan}` |
| `/admin/users` | Platform **admin** only | Every account across every workspace: search, role and status filters, deactivate/reactivate with confirmation, change-role dialog, pagination. Actions on the signed-in admin are disabled. | `GET /api/admin/users`, `PATCH /api/admin/users/:id/{status,role}` |

Password reset is linked from `/login` → `/forgot-password` → email or demo `resetUrl` → `/reset-password?token=...`. Email registration continues from `/register` → verification email → `/verify-email?token=...` → authenticated dashboard.

After sign-in, platform admins land on `/admin` and workspace roles on `/dashboard` (`src/lib/auth-routes.ts`). An admin who also owns a workspace can switch between the two areas from the account menu; an admin without a workspace who opens a workspace route is sent back to `/admin`.
