# Frontend Routes

| Route | Owner | Purpose | Backend dependency |
| --- | --- | --- | --- |
| `/` | Member 3 | Landing page and value proposition. | None initially. |
| `/login` | Member 2 | Login form. | `POST /api/auth/login` |
| `/register` | Member 2 | Register form. | `POST /api/auth/register` |
| `/dashboard` | Member 3 | Organization/admin analytics overview. | `GET /api/analytics/summary` |
| `/templates` | Member 2/3 | Template list and creation entry. | `GET/POST /api/templates` |
| `/assessment/[sessionId]` | Member 2/4 | Candidate assessment flow. | `/api/sessions`, `/api/responses`, `/api/ai`, `/api/code` |
| `/reports/[sessionId]` | Member 3 | Candidate report view. | `GET /api/reports/:sessionId` |
| `/analytics` | Member 3 | Detailed dashboard analytics. | `GET /api/analytics/*` |

Add routes here before asking an agent to build them.
