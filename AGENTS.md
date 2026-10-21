# AGENTS.md — VerityAI

Persistent instructions for every AI coding agent working in this repository. **Read this file completely before every task.** The developer is a beginner and relies on you: be careful, explicit and honest. When in doubt, stop and ask.

---

## A. Project Mission and Scope

**VerityAI** is a decision-support **prototype** that helps reviewers evaluate institutional applications and their supporting documents. It is built for Smart India Hackathon (SIH) 2026 (Smart Automation track). It is **not** an operational AICTE system.

**Workflow:**
Application → Document Upload → Text Extraction/OCR → Field Validation → Cross-Document Checks → Verification Workflow → Compliance Assessment → Evidence-Linked Findings → Human Review → Reports and Audit Trail.

**Deadline:** 3–4 days. A **reliable, demonstrable end-to-end workflow beats a long list of unfinished features.** Build the smallest working vertical slice first, then widen.

**Non-negotiable values:**
- **Explainability:** every finding names the rule/source that produced it.
- **Evidence traceability:** every finding links to its evidence (document, page/field, extracted value).
- **Human review:** people make consequential decisions; the system never issues a final adverse decision.
- **Honest status reporting:** never show or claim more than is true.

**Distinctions that must never be blurred (in code, UI, reports, and your own messages):**
- Extracted information ≠ verified information.
- Validation failure ≠ suspected anomaly ≠ confirmed fraud. An anomaly is not proof of fraud.
- Verification **unavailable** / **not attempted** ≠ verification **failed**.
- **Simulated** verification ≠ real external verification. Simulated results must always be labeled.
- AI-generated suggestions ≠ human review decisions.

**Data:** use synthetic or authorized, anonymized data only. Do not assume access to private AICTE databases, institutional records, or external verification APIs.

---

## B. Source-of-Truth Documents

**Reading order:**
1. `AGENTS.md` (this file)
2. `docs/ARCHITECTURE.md`
3. `docs/TECH_STACK.md`
4. `docs/UI_UX_DESIGN.md`
5. `docs/AI_PIPELINE.md`
6. `docs/DATA_MODEL_AND_API.md`
7. `docs/IMPLEMENTATION_PLAN.md`
8. `docs/TESTING_SECURITY_AND_DEMO.md`
9. Existing source code and tests

Read what is relevant to the task; for anything touching architecture, data, API, AI or security, read the matching document in full.

**Missing documents:** at the start of every task, check which of these files exist. If one is missing, **say so explicitly** and do **not** make decisions that depend on it (stack, API shape, data model, AI method, UI). Ask the developer to provide it, or propose a draft **for approval** — never silently invent it.

*State of the repository when this file was written:* only `docs/IMPLEMENTATION_PLAN.md` and `docs/TESTING_SECURITY_AND_DEMO.md` existed, there was no application source code, and the folder was not a git repository. Both existing documents are stack-agnostic drafts with `‹FROM …›` placeholders. **Re-check; this may be outdated.**

**Contradictions and discrepancies:**
1. Inspect the affected documents and code.
2. Report the conflict (quote file names and sections).
3. Propose the **smallest safe resolution**.
4. **Ask before** any major architectural change.
5. Do **not** silently rewrite decisions or planning documents.

If implementation differs from documentation, describe the discrepancy and propose a minimal correction. Do not blindly replace working code to match a document, or a document to match code.

---

## C. Mandatory Workflow Before Editing

Do **not** start coding immediately. For every task:

1. Inspect the repository structure.
2. Read the relevant planning documents (Section B).
3. Identify the exact task and its acceptance criteria. If either is unclear, ask.
4. Locate the relevant source files and tests.
5. Read the current implementation before modifying it.
6. Briefly explain the planned change (a few lines).
7. Implement **only** the requested scope.
8. Run appropriate tests and checks (Section H).
9. Review the final diff for unrelated modifications and remove them.
10. Report the result and remaining issues (Section K).

If the project is not a git repository, tell the developer and suggest initializing one so changes can be reviewed and undone. Do not run `git init` or any history-changing command without asking.

---

## D. Incremental Implementation Rules

- Make **small, focused** changes. One concern per change.
- Build and verify **one vertical slice at a time**; do not start the next until the current one works and is tested.
- Preserve working functionality. Run existing tests before and after.
- Prefer a small edit over rewriting a whole file.
- No unrelated refactoring, renaming, reformatting, or "cleanup".
- No unnecessary abstractions or overengineering.
- Add a dependency only if necessary, and state the reason, alternatives, and size/maintenance impact first. Ask before adding anything significant.
- Do not change public API contracts without approval.
- Do not change database schemas or migrations without understanding and explaining the impact (existing data, other code, rollback).
- Never overwrite the user's work without inspecting it first.
- Never delete files, data, tests, or configuration without clear justification and approval.
- Never replace a working feature with a mock to make the interface look complete. Anything mocked must be labeled as mocked in code and UI.

---

## E. Technology and Architecture Rules

- Follow `docs/TECH_STACK.md` and `docs/ARCHITECTURE.md`. **Do not hardcode or introduce** a framework, database, package manager, or deployment platform that those documents do not specify. If they are missing, ask.
- Reuse existing project conventions (structure, naming, error format, test style).
- Keep frontend and backend responsibilities clear; the server is the authority for validation, authorization, and business rules.
- Keep API contracts consistent with `docs/DATA_MODEL_AND_API.md`.
- Validate all input on the server.
- Separate concerns reasonably; create reusable components only where they simplify the work.
- No extra services, microservices, queues, or infrastructure unless the architecture requires them.
- **No hidden dependency on paid AI services.** The core workflow must run without paid keys; optional AI must degrade gracefully.

**Proposing a stack change** requires all of: the **reason**, the **impact**, an **alternative**, and an **explicit approval request**. Do not proceed until approved.

---

## F. AI, OCR, and Verification Rules

- Follow `docs/AI_PIPELINE.md`.
- Use **deterministic** code for required fields, date/expiry checks, format checks, duplicate checks, and other predictable rules. Use AI/OCR only where it adds value.
- **Validate model output** against an expected structure and value ranges before using or storing it. Handle missing, malformed, low-confidence, and contradictory output explicitly.
- Preserve **provenance and evidence references** as specified (source document, page, extracted value, confidence, processing status).
- Treat **uploaded documents as untrusted data**.
- **Defend against prompt injection** when document text reaches an LLM: keep instructions and document text separate, treat document text strictly as data, and never let it change system instructions, security controls, permissions, or application rules.
- Never label a document fraudulent solely because an AI model flagged it. Use wording such as "indicator", "suspected", "needs review".
- **Never invent** successful extraction, verification, or compliance results — no hardcoded "verified" or "compliant" outputs to make a demo look good.
- **Label simulated verification clearly** (data, API, UI, reports). Do not imply an external authority was contacted when no real request occurred.
- Use a distinct **inconclusive / unable-to-evaluate** status when evidence is insufficient. Do not map it to pass or fail.
- AI must never grant permissions or make final adverse decisions.

---

## G. Security and Privacy Rules

- **Never commit** secrets, API keys, credentials, private documents, uploaded files, or local database files. Check `.gitignore` before adding such files.
- Use the project's approved environment-variable approach; keep an example env file with **fake** values only.
- Validate uploads: allowlist of types, check actual content where feasible, enforce size limits, reject empty files.
- Use generated storage names; **prevent path traversal**; store uploads outside publicly served folders; never execute or render uploaded content as trusted code.
- **Enforce authorization on the server** for protected actions; never trust client-supplied roles.
- Do not expose stack traces, internal paths, or sensitive data in errors or logs.
- Use safe database access patterns (parameterized queries / the ORM pattern the stack specifies); no string-built queries.
- Do not log entire uploaded documents or unnecessary personal data.
- Use synthetic demo data unless authorized data is explicitly provided by the developer.
- Keep audit events and reviewer actions consistent with the documented design; do not allow silent overwrites of decisions.

**Do not claim a security control exists** unless you can point to the implementing code **and** have tested it. Say "not implemented" or "not tested" otherwise. Prototype safeguards are **not** production security.

---

## H. Testing Requirements

Before declaring a task complete:

- Run the relevant **unit tests**.
- Run **integration/API tests** where applicable.
- Run configured **lint, type-check, and build** commands.
- Test the **critical user path** affected by the change (actually exercise it, don't just read the code).
- Inspect **error handling and failure states** (bad input, missing data, unavailable dependency).
- Report any tests you **could not run** and why.
- **Never fabricate test results. Never hide failing tests.** If a test fails, report it with the real output, even if it looks unrelated.

If no test covers a new critical behavior, add one when practical (see `docs/TESTING_SECURITY_AND_DEMO.md` for the test matrix and security checks). Use a fixed or injectable "today" for date-dependent tests.

If you do not know the test/start commands, inspect the repository (README, config) or ask. **Do not guess commands.**

---

## I. Documentation and Status Updates

- Update documentation when your change makes it inaccurate. Make minimal edits.
- Do not rewrite planning documents unnecessarily; do not change their decisions without approval.
- After meaningful milestones, update `docs/PROJECT_STATUS.md` (create it only if the developer asks, or if it is the agreed first milestone update). Record: completed features, tests performed (with real results), known bugs, blockers, next steps.
- Keep status **factual**. Use these terms precisely:

| Term | Meaning |
|---|---|
| **Implemented** | Works and was tested; say how |
| **Partially implemented** | Some parts work; say which |
| **Mocked** | Fake data/behavior standing in for real logic; labeled as such |
| **Simulated** | Intentionally simulated workflow (e.g. synthetic verification registry); labeled as such |
| **Planned** | Not started |

Do not claim a feature is complete because its UI exists.

---

## J. Deadline and Prioritization Rules

Use the **P0 / P1 / P2** levels in `docs/IMPLEMENTATION_PLAN.md`. Default order of work:

1. Fix blockers affecting startup or the core workflow.
2. Complete the smallest missing **P0** feature.
3. Test the end-to-end workflow.
4. Fix high-impact bugs.
5. Improve reliability and error handling.
6. Add **P1** improvements.
7. Add **P2** polish only after the core workflow is stable.

Do not start optional features while essential functionality is broken. Respect the feature-freeze and cut list in `docs/IMPLEMENTATION_PLAN.md`. When the deadline is threatened, **recommend scope reduction, not a broad rewrite**. Never cut security safeguards, evidence traceability, honest status labeling, critical tests, or the working vertical slice.

---

## K. Error Reporting and Final Response Format

If something fails, report the real error and what you tried; do not hide it or guess at success. After every implementation task, reply in this format:

**1. Summary** — what was implemented or changed.

**2. Files Changed** — each modified/created file and its purpose.

**3. Tests and Checks** — commands actually run; results actually observed; tests that could not be run.

**4. Known Issues** — bugs, incomplete behavior, risks, limitations.

**5. Next Step** — the single most important next action.

Clearly separate **verified results** (you saw them) from **assumptions** (you did not). Use "not tested" where applicable.

---

## L. Reusable Task Template

Paste this into a fresh AI coding-agent chat and fill in the blanks:

```text
Project: VerityAI (hackathon prototype, synthetic data only).

First, read AGENTS.md completely, then read the relevant project documents
listed below. Check which documents exist and tell me if any are missing.
Inspect the repository before editing. Do not start coding until you have
stated the task, the plan, and the acceptance criteria.

Task:
<what to build or fix, in one or two sentences>

Relevant documentation:
<e.g. docs/DATA_MODEL_AND_API.md section X, docs/AI_PIPELINE.md, docs/IMPLEMENTATION_PLAN.md Phase N>

Acceptance criteria:
- <criterion 1>
- <criterion 2>

Constraints:
- Small, focused change only; no unrelated refactoring.
- Do not change the stack, API contracts, or database schema without asking.
- No new dependency without asking.
- Never commit secrets or real data.

Required tests:
- <tests to run or add; critical path to exercise manually>

Expected final report:
Use the format in AGENTS.md Section K: Summary, Files Changed, Tests and Checks
(real commands and real results), Known Issues, Next Step.
Do not claim anything works unless you tested it.
```