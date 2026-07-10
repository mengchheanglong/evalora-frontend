# Evalora Frontend

Production-oriented Next.js + TypeScript frontend for Evalora's interviewer workspace and private candidate assessment flow.

## AI agent start rule

Before changing this repository, read `AGENTS.md` and the product documents it references.

## Run locally

```bash
pnpm install
pnpm dev
```

Frontend: <http://localhost:3010>

The backend should be running at <http://localhost:4000/api>.

## Environment

Create `.env.local` only when the API is not using the local default:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Browser requests go through the same-origin route handler at `/api/backend/*`. Login and registration tokens are stored in an HttpOnly cookie by that boundary; bearer tokens are not exposed to client components.

## Integrated product routes

- `/` - product overview.
- `/login`, `/register` - workspace authentication.
- `/dashboard` - live pipeline, report readiness, and module performance.
- `/templates`, `/templates/create` - template list and builder.
- `/assessment`, `/assessment/create` - interviewer session list and invitation creation.
- `/assessment/[accessCode]` - private candidate assessment, autosave, AI follow-up, coding workspace, review, and submission.
- `/candidates`, `/candidates/[sessionId]` - candidate progress and response evidence.
- `/reports/[sessionId]` - advisory report and reviewer notes.
- `/analytics` - organization-scoped performance and evidence themes.

## Source of truth

- `AGENTS.md` - frontend agent/team alignment.
- `docs/SRS.md` - product requirements.
- `docs/API-CONTRACT.md` - backend API contract.
- `docs/ROUTES.md` - frontend route ownership and dependencies.
- `docs/UX-FLOW.md` - candidate assessment UX.
- `docs/AI-EVALUATION-RUBRICS.md` - advisory AI language and safety.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm build
```

This repository is intentionally independent from the backend repository.
