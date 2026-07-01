# Evalora Frontend

Standalone Next.js + TypeScript frontend for Evalora.

## Run locally

```bash
pnpm install
pnpm dev
```

Local URL: <http://localhost:3000>

## Environment variables

Create `.env.local` when needed:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Do not commit `.env.local`.

## Current routes

- `/` — landing page.
- `/login` — login form scaffold.
- `/dashboard` — organization/admin dashboard scaffold.
- `/assessment/[sessionId]` — candidate assessment flow scaffold.
- `/reports/[sessionId]` — candidate report scaffold.

## Source of truth

- `AGENTS.md` — frontend agent/team alignment.
- `docs/SRS.md` — product requirements.
- `docs/API-CONTRACT.md` — backend API contract.
- `docs/ROUTES.md` — frontend routes.
- `docs/UX-FLOW.md` — candidate UX flow.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Separate repository note

This folder is intentionally self-contained so it can be pushed to its own GitHub repository independently from the backend.
