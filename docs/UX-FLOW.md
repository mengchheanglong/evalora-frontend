# Candidate UX Flow

## Candidate flow

```text
Receives session link/code
  -> logs in or enters access code
  -> views instructions and time expectations
  -> completes modules in order
  -> reviews answers if allowed
  -> submits assessment
  -> sees completion confirmation
```

## Required UX states

- Not started.
- In progress.
- Saving progress.
- AI response loading.
- Code execution running.
- Code execution timeout.
- Validation error.
- Submitted/completed.
- Expired session.
- Invalid session link.

## Candidate copy rules

Use plain language:

- "Answer based on your real experience."
- "Your responses will be reviewed by a human interviewer."
- "AI feedback supports review and is not the final hiring decision."

Avoid:

- "The AI decides if you are hired."
- "This test diagnoses your personality/mental state."

## Frontend handoff checklist

For every new page:

1. Route path documented in `docs/ROUTES.md`.
2. API endpoint documented in `docs/API-CONTRACT.md`.
3. Loading state present.
4. Error state present.
5. Mobile layout checked except coding editor, which may be desktop-first.
