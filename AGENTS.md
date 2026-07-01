# Evalora Frontend Agent Guide

This repository is the standalone frontend for Evalora. Read this file before changing code.

## Product source of truth

1. `docs/SRS.md` — requirements and MVP scope.
2. `docs/API-CONTRACT.md` — backend API contract that this frontend consumes.
3. `docs/ROUTES.md` — frontend route ownership and backend dependencies.
4. `docs/UX-FLOW.md` — candidate assessment UX rules.
5. `docs/AI-EVALUATION-RUBRICS.md` — AI safety and report language rules.

Evalora is the product name. InterviewAI 360 is historical/detail source material only.

## Path policy

Use repo-relative paths in docs and code. Do not commit machine-specific absolute paths.

## Frontend intent

Build a clean, responsive, candidate-friendly Next.js UI for Evalora. The UI must make the assessment flow clear and reports easy for interviewers to understand.

## Folder rules

- Use Next.js App Router under `src/app/`.
- Put reusable frontend helpers under `src/lib/`.
- Keep API base URL in `NEXT_PUBLIC_API_URL`.
- Keep UI copy aligned with AI safety rules: advisory feedback, no final hiring decisions, no medical/mental-health claims.

## Required pages

- Landing page.
- Login/register pages.
- Candidate instruction page.
- Candidate assessment flow.
- AI interview page/section.
- Coding assessment page/section.
- Behavioral/work-style form.
- Leadership scenario page/section.
- Submission page/state.
- Dashboard.
- Report page.
- Analytics page/section.

## API alignment

Use `docs/API-CONTRACT.md` before wiring a route. If a frontend need changes the backend shape, update the contract first and coordinate with the backend repo.

## Verification

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

## UX principles

- Candidate flow must be guided and low-confusion.
- Show progress/status for each module.
- Use clear loading and error states for AI and code execution.
- Warn before final submission.
- Reports should show evidence and reviewer notes clearly.
