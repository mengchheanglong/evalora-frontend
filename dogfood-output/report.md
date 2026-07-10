# Dogfood Report: Evalora

| Field | Value |
| --- | --- |
| Date | 2026-07-10 |
| App URL | http://localhost:3010 |
| Browser sessions | `evalora-local`, `evalora-candidate` |
| Scope | Registration, template/session creation, candidate assessment, AI follow-up, coding, report, reviewer notes, analytics, desktop/mobile |

## Summary

| Status | Critical | High | Medium | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Unresolved | 0 | 0 | 0 | 0 | 0 |
| Resolved during QA | 0 | 2 | 3 | 0 | 5 |

## Resolved Issues

### [HIGH] Nest development runtime did not inject several controller services

- **Area:** Registration and protected API controllers
- **Reproduction:** Submit a valid workspace registration through `/register` while running Nest with the repository's `tsx` development command.
- **Observed:** Registration failed because controller constructor dependencies were `undefined` at runtime.
- **Resolution:** Added explicit Nest `@Inject(...)` tokens to affected controllers, services, and guards. Registration then returned `201`, established the HttpOnly frontend session, and opened the dashboard.

### [HIGH] Default Piston endpoint rejected all code execution

- **Area:** Candidate coding workspace
- **Reproduction:** Start a candidate session, open coding, and run sample JavaScript.
- **Observed:** `/api/code/access/:accessCode/run` returned `503`; the public Piston service returned `401`.
- **Resolution:** Added a provider-neutral execution service with Judge0 support and retained explicitly configured Piston support. Sample execution and all hidden-test submissions then returned `201`; three submitted challenges scored 100%.

### [MEDIUM] Candidate report generation blocked final submission

- **Area:** Final assessment confirmation
- **Reproduction:** Submit a completed assessment with several AI-evaluated modules.
- **Observed:** The completion request waited for sequential provider calls before showing the receipt.
- **Resolution:** Candidate completion now returns immediately with `reportStatus: pending`; advisory report generation is queued independently. Module evaluation also runs concurrently.

### [MEDIUM] Deterministic coding assignment could return three hard challenges

- **Area:** Coding question selection
- **Reproduction:** Open the coding module for the QA invitation used in this run.
- **Observed:** The contiguous seeded selection returned Sort Ascending, Count Primes, and Longest Word, all marked hard.
- **Resolution:** Assignment now selects a deterministic easy, medium, and hard challenge. The retest returned Sum From 1 to N, Binary to Decimal, and Fibonacci Sequence.

### [MEDIUM] Mobile completion table hid score and report action off-screen

- **Area:** Dashboard at 390 x 844
- **Evidence before fix:** `screenshots/mobile-dashboard.png`
- **Observed:** The desktop table required horizontal scrolling and did not expose report access in the first viewport width.
- **Resolution:** Added a mobile-specific completion row with candidate, assessment, date, advisory score, and direct report navigation; the desktop table remains at larger breakpoints.

## Verified Flows

- Workspace registration, login persistence, logout boundary, and authenticated reload.
- Template creation with AI, behavioral, leadership, and coding modules.
- Private candidate invitation creation and isolated access-code entry.
- Candidate start, 700 ms autosave, reload restoration, AI follow-up, module gating, coding execution, hidden-test submission, final confirmation, and completion receipt.
- Persisted report readback, response/code evidence, reviewer note creation, dashboard refresh, and all analytics endpoints.
- Desktop dashboard/report and mobile dashboard/report layouts with no browser console errors.

## Visual Evidence

- `screenshots/dashboard-completed.png`
- `screenshots/report-completed.png`
- `screenshots/mobile-dashboard.png`
- `screenshots/mobile-navigation.png`
- `screenshots/mobile-report.png`
