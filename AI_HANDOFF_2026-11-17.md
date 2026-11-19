# Zelosify AI Handoff Context

Updated: 2026-11-18
Repository: `/home/abhishek-nexgen-dev/Desktop/Danger Zone/eval-83deaa4a1213`
Branch and commit state: inspect `git status --short` and `git log` before continuing; this checkout contains uncommitted work.

## Current continuation context (18 November 2026)

- The user asked for a content polish across the documentation and website. First-party docs have been reconciled with the current black-first frontend, public home page (no embedded job search), multipart candidate resume flow, PDF/DOC/DOCX candidate formats, PDF/PPTX vendor formats, team-creation role rules, and current provider setup.
- The user has repeatedly directed that frontend work must not alter backend source. Keep backend implementation unchanged unless the user explicitly changes that scope. API documentation may be corrected to match the backend.
- `/home/abhishek-nexgen-dev/Desktop/FastApi.yml` is a protected, user-owned test collection. Read it as reference only; never edit it.
- Existing uncommitted frontend scroll/hydration work was already present before this content task. Preserve it. It includes the shared Locomotive/Lenis provider, reduced-motion behavior, nested-scroll exemptions, and hydration-warning suppression.
- PostgreSQL, Keycloak/API ports, and frontend port were unavailable in the latest environment check. Do not claim live end-to-end verification. Previously recorded local backend tests/build and frontend lint/tests/build are in `IMPLEMENTATION_NOTES.md` and `checklist.md`.
- Do not expose or copy passwords, API keys, database URLs with credentials, authenticator secrets, or resume content into docs, logs, or handoff messages. Use per-developer `.env` values.
- No commit or push was requested by the current user task.

## How to continue

- Read the repository `AGENTS.md` before making changes. At the start of this verification, the pushed baseline was clean; the Groq compatibility follow-up below is now uncommitted and must be preserved.
- The user approved careful implementation, regression tests, documentation updates, and then explicitly requested a commit and push. This handoff note is included in that requested change set.
- After the requested push completes, check `git status --short`, `git log -1 --oneline`, and branch tracking before continuing. Do not repeat a push unless there are new authorized changes.
- Do not print or copy `.env` values, provider keys, access tokens, or real resume data into logs, tests, or this file.
- Before making more changes, inspect `git status --short`, this file, `IMPLEMENTATION_NOTES.md`, and the relevant diff.

## User's problem and diagnosis

Candidate UI showed: “Analysis unavailable. The analysis did not finish. Re-upload the resume to retry.”

The backend caught AI/parser failures and logged only `PROCESSING_FAILED`, then persisted `FAILED` with a generic candidate-facing retry message. That hid the real cause. Earlier notes recorded a Groq synthetic request returning HTTP 404, but the original error details were discarded, so we cannot tell from the old evidence whether the cause was the API key, model access, endpoint, or request format. The currently configured model was `qwen/qwen3.8-27b`; current Groq tool-use documentation listed it as supporting tool use, so its ID was not assumed to be the cause.

Gemini also was not a selectable recommendation-agent provider before this change. It existed as a separate optional feature-extraction REST path and could silently fall back to local deterministic parsing. The implementation now uses `AI_AGENT_PROVIDER=groq|gemini` to select the provider for structured feature extraction and the tool-calling agent.

## AI implementation in the pushed baseline

- `Zelosify-Backend/Server/package.json` and `package-lock.json`: added `@langchain/core`, `@langchain/google`, and `@langchain/groq`. An attempted `@langchain/community` install hit a peer conflict (`@browserbasehq/stagehand` vs. repo Zod 4), so it was not added. The resume reader is a local `BaseDocumentLoader` using the existing bounded parsers.
- `Zelosify-Backend/Server/src/services/ai/tools/resumeParser.ts`: added `ResumeBufferDocumentLoader`, returning a LangChain `Document` after existing safety checks. Existing PDF worker limits, DOCX/PPTX archive guards, 10 MiB limit, sanitation, and DOC `catdoc` timeout remain in use.
- `Zelosify-Backend/Server/src/services/ai/agentOrchestrator.ts`: routes Groq and Gemini through LangChain; keeps Grok/xAI support through LangChain's OpenAI-compatible client. LangChain structured output extracts resume facts from sanitized, delimited resume text. The registered agent tools remain dynamically selected, dependency ordered, schema validated, retry bounded, and deterministically scored. Token usage now includes structured extraction. Failures are mapped to safe provider codes.
- `Zelosify-Backend/Server/src/services/ai/toolRegistry.ts`: dynamically registers LangChain tools and distinguishes invalid dependency order, invalid arguments, resume parsing errors, and feature extraction failures.
- `Zelosify-Backend/Server/src/services/ai/recommendationService.ts`: logs/persists safe `errorCode`, provider, model, optional HTTP status, and timestamp on failure. It does not log provider response bodies, API keys, or resume text; public error text remains generic.
- `Zelosify-Backend/Server/src/constants/env.ts` and `.env.example`: added Gemini as an agent provider; defaults in the example are Groq model `openai/gpt-oss-20b` and Gemini model `gemini-2.5-flash`. `AI_PROVIDER` is retained but deprecated for recommendation selection. The user's `.env` was not edited.
- Tests updated/added in `Zelosify-Backend/Server/tests/unit/ai/`: provider selection for Groq/Gemini, structured extraction, dynamic tool-order recovery, safe error classification/persistence, LangChain document metadata, and registered tool order.
- Updated `setup.md`, `api.doc.md`, and `IMPLEMENTATION_NOTES.md` with provider setup, parser behavior, troubleshooting/error codes, and verification limitations.
- No frontend source files were changed. The candidate UI still shows a generic failed-analysis message and supports replacing the resume to trigger processing again.

## Baseline verification already run

Commands ran from `Zelosify-Backend/Server` after the final implementation edits:

- `npm run test -- --run` — passed: 150 tests in 21 files.
- `npm run build` — passed (Prisma client generation and TypeScript compilation).
- `git diff --check` — passed.

These checks ran on Node.js `20.19.2`, but the setup guide says Node.js 22. Re-run under Node 22 before release. No frontend build was run because frontend code was unchanged.

## Remaining work before release

1. The user has explicitly excluded live Gemini analysis. Do not call Gemini. A live Groq synthetic-resume check and local fix were completed during the 17 November follow-up; see `IMPLEMENTATION_NOTES.md` and the section below.
2. PostgreSQL, the backend listener, and Keycloak local ports were unavailable. No live DB workflow/migration or end-to-end application was tested.
3. Full processing is still not verified against a working database/API/storage workflow. The live Groq smoke exercised the orchestrator only.
4. A single live Groq run took 2,985 ms, above the 1,500 ms per-profile target. This is a smoke result, not a 100-profile benchmark; P95 and full-workload targets remain unverified.
5. `npm install` refreshed a large part of `package-lock.json` because its resolved dependency versions lagged the current `package.json` ranges. It reported 27 dependency advisories (4 low, 6 moderate, 13 high, 4 critical); no `npm audit fix` was run. Review the lockfile diff and advisories before release; do not casually upgrade or revert dependencies.
6. Re-check Git status and branch tracking before further work. Do not commit or push the current Groq fix unless the user asks.

## Groq compatibility follow-up (17 November 2026)

- The first real Groq synthetic-resume attempt returned HTTP 400 during feature extraction. A sanitized diagnostic identified invalid generated function-call arguments (`experienceYears` was missing and `skills` had the wrong JSON type).
- The installed LangChain Groq integration rejected its `jsonSchema` mode for the configured Qwen model. Its supported `jsonMode` was verified against the same synthetic fixture; the returned data passed the application Zod schema.
- The local follow-up changes only Groq feature extraction to LangChain JSON-object mode with explicit JSON instructions and existing strict Zod validation. Gemini and xAI Grok keep their function-calling extraction path. The focused orchestrator suite passes 7/7; backend build passes; full backend suite passes 150/150.
- A full Groq-only synthetic analysis completed all five registered tools and returned `score=0.8333`, ATS score 83, confidence 0.85, and latency 2,985 ms using `qwen/qwen3.8-27b`. No Gemini request was made. This does not establish the 1,500 ms target or P95.
- `npm audit --omit=dev --audit-level=low` could not reach `registry.npmjs.org` (`EAI_AGAIN`), so current advisory counts are not verified. No dependency changes were made by the audit.
- Historical note for 17 November: the checkout then contained the Groq provider follow-up, decision-email outbox implementation, migration, tests, and documentation. That file list is not a current status snapshot; check `git status --short` before continuing.

## Candidate decision email follow-up (17 November 2026)

- Existing recruiter/admin and hiring-manager decision routes share `decideProfile`. New `SHORTLISTED` and `REJECTED` decisions now enqueue a unique `decisionEmailOutbox` row inside the decision transaction; idempotent same-action retries do not enqueue duplicates.
- A backend worker claims outbox rows with a lease, looks up the current candidate email and opening, sends a responsive HTML plus plain-text Nodemailer template, and retries SMTP failures with bounded backoff. It skips deleted profiles or entries whose current status no longer matches. SMTP-unconfigured messages remain queued, and startup logs only a safe disabled event.
- Added SMTP settings to env validation and `.env.example`, plus a migration, docs, and mocked unit tests. The API response shapes are unchanged.
- Prisma schema validation passed, backend build passed, focused decision/notification tests passed 17/17, and the full backend suite passed 159 tests across 24 files. The new migration has not been applied; PostgreSQL is unavailable.
- Initial SMTP verification returned `EAUTH`; a later retry to the user-designated test inbox was accepted by the relay. This was a clearly labeled technical test email, not a hiring decision. No further email should be sent without user authorization.
- Added a worker regression test for the rejection template. Before calling the workflow complete, apply the migration to the intended database and verify decision-triggered delivery to the test inbox for both decisions. Do not commit/push unless the user asks.

## Useful commands

```bash
# Backend
cd "/home/abhishek-nexgen-dev/Desktop/Danger Zone/eval-83deaa4a1213/Zelosify-Backend/Server"
npm run test -- --run
npm run build

# From repository root
cd "/home/abhishek-nexgen-dev/Desktop/Danger Zone/eval-83deaa4a1213"
git status --short
git diff --check
```
