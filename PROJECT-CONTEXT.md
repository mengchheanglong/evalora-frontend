# Evalora Frontend Project Context

This folder is the **standalone frontend repository** for Evalora. Push this folder by itself to the frontend GitHub repository.

## Product

Evalora is an AI-powered candidate assessment platform for AI interviews, coding assessments, behavioral/work-style questions, leadership scenarios, communication tasks, dashboards, and candidate reports.

## This repo owns

- Next.js App Router UI.
- Candidate assessment flow.
- Login/register screens.
- Dashboard and analytics UI.
- Candidate report UI.
- API client helpers that call the backend.
- UX copy and responsive layout.

## This repo does not own

- Database schema.
- JWT signing/password hashing.
- AI provider secret handling.
- Code execution sandbox connection.
- Report generation business logic.

Those belong in the backend repository.

## Tech stack

- Next.js.
- TypeScript.
- Tailwind CSS.
- React.

## Backend connection

Use `NEXT_PUBLIC_API_URL` to point to the backend API.

Example local value:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Do not hardcode a teammate's local path or URL in source code.

## Important docs in this repo

- `AGENTS.md` — rules for AI agents and team members.
- `README.md` — setup and run commands.
- `docs/SRS.md` — product requirements.
- `docs/API-CONTRACT.md` — backend API contract.
- `docs/ROUTES.md` — frontend route plan.
- `docs/UX-FLOW.md` — candidate assessment UX.
- `docs/AI-EVALUATION-RUBRICS.md` — AI safety language for UI/report copy.

## Run

```bash
pnpm install
pnpm dev
```

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## AI safety copy rules

- Say AI feedback is advisory.
- Say humans review final decisions.
- Do not say Evalora automatically hires or rejects candidates.
- Do not present behavioral/work-style answers as medical or mental health diagnosis.

## GitHub push

This folder is self-contained. Initialize Git here, not in the parent folder:

```bash
git init
git add .
git commit -m "init evalora frontend"
```
