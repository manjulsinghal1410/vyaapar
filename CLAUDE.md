# CLAUDE.md — Planning & Execution Contract (Vibha Net — Auth v0)

## Project Context
- **Product:** Vibha Net
- **Current scope:** Auth v0 — global phone+password with sessions (no OTP, no password reset).
- **Truth source:** `PRD.md`. Do not contradict it. When this file conflicts with PRD, PRD wins.

## Main Agenda — Vibha Net
- Build a **trustworthy, privacy‑minimal** authentication foundation with **global E.164** phone support.
- Optimize for **simplicity, idempotency, and determinism**; no surprises, no magic.
- Ship **small, reversible increments** with measurable acceptance tests mirroring PRD §9.
- Keep **observability** from day one (structured logs + key counters) without over‑engineering.
- Maintain **cost and operational discipline** (single service, Postgres; no optional dependencies in v0).
- Ensure **accessibility and clear UX copy** for a global audience (see PRD §2 + Appendix).

## Canonical Truths & Non‑Negotiables
1. Follow `PRD.md` exactly for scope, API, and acceptance tests.
2. Do **not invent** new endpoints, env vars, database columns, or flows.
3. Global phone validation must normalize to **E.164** and store canonical `phone_e164` (unique).
4. Sessions are **opaque IDs** stored server‑side; cookies: HttpOnly, Secure, SameSite=Lax.
5. Guardrails: Simplicity • Idempotency • Determinism • Privacy‑minimal • No regression.

## Output Rules (how you work)
- Propose plans as a short checklist of tasks (each 30–90 minutes).
- For code changes, output **file paths + full file contents** or **unified diffs**.
- Every task ends with: **what changed**, **commands to run**, **acceptance check** to verify.
- Update docs when code changes (keep `PRD.md` the reference, `README.md` the how-to).

## Planning Loop
1. Read `PRD.md` and this file end‑to‑end.
2. Draft a **minimal** plan for the next task batch (1–3 tasks).
3. Execute task 1; provide diff + test instructions; **stop**.
4. Await the next instruction (or proceed if explicitly allowed).
5. Repeat; never widen scope without PRD update.

## File Boundaries
- API contracts live in **PRD §3** (use those shapes).
- Acceptance tests mirror **PRD §9** scenarios.
- Secrets are **never** invented; reference `.env` keys from README.

## Quality Gates
- All tasks must pass: lint, type checks, and tests.
- Acceptance checks: signup/login/logout happy path; duplicate signup (409); lockout (423); wrong password (401); multi‑country numbers; invariants on `sessions` and `users`.

## Stop Conditions
- If a requirement is ambiguous, state the assumption **explicitly** in the plan and choose the **smallest reversible** implementation.
- If a requested change expands scope, request a **PRD update** before proceeding.