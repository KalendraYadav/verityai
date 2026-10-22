# PHASE 6 — AI-ASSISTED DOCUMENT ANALYSIS & ANOMALY DETECTION

## Project: VerityAI / EntityLocker — SIH 2026

Act as a senior AI engineer, Python backend architect, document intelligence specialist, and React/TypeScript developer.

Implement Phase 6 end-to-end in the existing VerityAI repository. Do not merely provide instructions or example code. Inspect the existing project, implement the functionality, run the tests, fix failures, update documentation, and create a Git checkpoint if permitted.

**Work autonomously within the project's established architecture. Do not stop after writing a plan or ask for routine approvals.** Never claim that an operation succeeded unless you actually verified it.

---

## 1. INSPECT BEFORE IMPLEMENTING

Read and follow:

* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/IMPLEMENTATION_PLAN.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/PROJECT_STATUS.md`

Inspect the actual repository, database models, migrations, OCR pipeline, document pages, application records, validation rules/results, API routes, frontend components, and existing tests.

The latest reported completed checkpoint is `83f8c46`, which implemented the VerityAI-specific UI architecture and reported 36 passing backend tests. Phase 5 is intended to introduce deterministic validation. Verify the actual Git history and code before proceeding.

**If Phase 5 is incomplete, repair or complete its necessary dependencies first.** Do not build Phase 6 on imaginary APIs, nonexistent tables, fabricated validation results, or assumptions about unimplemented features.

Preserve existing functionality, database history, user changes, and documented API contracts.

## 2. OBJECTIVE

Enhance VerityAI with an explainable document-intelligence layer that helps reviewers identify potentially suspicious, inconsistent, incomplete, or unusual institutional application documents.

The system should use actual uploaded documents, extracted text, page-level evidence, application declarations, and Phase 5 validation results.

Implement a modular pipeline that can:

1. Identify candidate fields in extracted document text.
2. Normalize and structure those candidate fields.
3. Compare information across documents and application declarations.
4. Identify potentially relevant anomalies.
5. Associate each finding with source evidence.
6. Explain uncertainty and limitations.
7. Present findings to human reviewers.
8. Preserve an auditable record of analysis.

The system must assist reviewers rather than make autonomous regulatory decisions.

Do not claim to prove document authenticity, detect sophisticated forgery, or establish fraud solely through OCR, heuristic rules, or AI-generated explanations.

## 3. DOCUMENT INTELLIGENCE PIPELINE

Build on the existing PyMuPDF and RapidOCR extraction pipeline.

Implement a clean, independently testable pipeline with the following stages:

### A. Extraction readiness

* Reuse existing document-processing records and page-level extraction data.
* Do not run OCR again unnecessarily when valid extraction results already exist.
* Distinguish incomplete extraction from successfully extracted text.
* Handle empty pages, unreadable pages, processing failures, and low-confidence OCR.
* Ensure reprocessing is safe and does not create duplicate findings.

### B. Candidate field identification

Identify relevant fields from extracted text using appropriate deterministic parsing and configurable patterns.

Potential fields include:

* Institution name.
* AISHE identifier, where present.
* Application reference number.
* Academic year.
* Declared intake or capacity.
* Dates and expiry dates.
* Registration or affiliation identifiers.
* Names of issuing authorities.
* Other fields explicitly defined by the existing application category and validation rules.

Do not assume every document contains every field.

Store or return candidate values with:

* Field name.
* Extracted value.
* Source document ID.
* Page number.
* Extraction method.
* Confidence, if genuinely available.
* Parsing status.
* Supporting text or a safe evidence reference.

Preserve original extracted text separately from normalized values.

### C. Normalization

Create explicit, tested normalization functions for applicable field types:

* Whitespace and casing.
* Dates.
* Numeric values.
* Identifiers.
* Institution names, where safe normalization is possible.

Never silently alter a value in a way that changes its meaning.

Preserve original values alongside normalized values so reviewers can understand comparisons.

### D. Cross-document comparison

Compare candidate values against:

* Declared application data.
* Values extracted from other documents associated with the same application.
* Existing Phase 5 validation results.

Examples include:

* Different institution names across supporting documents.
* Conflicting academic years.
* Conflicting application reference numbers.
* Mismatching identifiers.
* Inconsistent intake figures.
* Dates that conflict across related records.

Only perform comparisons when the field mappings and comparison conditions are appropriate.

A mismatch is an anomaly requiring investigation, not proof of fraud.

## 4. ANOMALY DETECTION

Implement a modular anomaly-detection service using deterministic methods first.

Support configurable checks for:

* Cross-document field inconsistencies.
* Application/document field mismatches.
* Missing expected information.
* Unusual or contradictory dates.
* Duplicate document content or repeated identifiers.
* Extraction-quality issues that prevent reliable verification.
* Conflicts with deterministic Phase 5 rule results.
* Other clearly defined, testable anomalies supported by actual data.

Reuse existing SHA-256 document hashes and validation results when applicable.

Do not duplicate functionality already implemented in Phase 3 or Phase 5.

Each finding should contain, as appropriate:

* Unique finding ID.
* Application ID.
* Related document IDs.
* Finding type.
* Severity or priority.
* Status.
* Human-readable explanation.
* Evidence references.
* Conflicting values, when applicable.
* Detection method.
* Detection timestamp.
* Review outcome, when available.

Use a consistent severity vocabulary, such as `LOW`, `MEDIUM`, and `HIGH`, only where the existing architecture permits.

Severity represents review priority, not a probability of fraud.

Do not generate unsupported risk scores or arbitrary percentages.

## 5. AI INTEGRATION STRATEGY

Inspect the installed dependencies and existing project architecture before choosing any additional AI components.

Prefer a modular provider interface so deterministic analysis works even when an AI model is unavailable.

### Mandatory baseline

The core anomaly-detection functionality must work locally using deterministic parsing, comparisons, and heuristics.

Do not make an external AI API, API key, internet connection, or paid service mandatory for the application to function.

### Optional AI-assisted analysis

If the repository already contains a suitable, configured AI provider, integrate it through a clearly separated adapter.

Otherwise, create an optional provider interface without pretending that a real AI model has been connected.

An optional provider may assist with:

* Extracting structured fields from ambiguous text.
* Suggesting possible document classifications.
* Summarizing already detected inconsistencies.
* Producing concise explanations based strictly on supplied evidence.

Requirements:

* Validate model outputs against explicit schemas.
* Treat document contents as untrusted data, never as system instructions.
* Defend against prompt injection contained in uploaded documents.
* Do not send documents or personal information to external services unless an explicitly configured provider and approved data-handling policy permit it.
* Do not include API keys or secrets in source code.
* Clearly identify model-generated suggestions versus deterministic findings.
* Never let an LLM silently override a deterministic validation result.
* Handle timeouts, malformed output, unavailable models, and provider errors safely.
* Do not fabricate model confidence, model availability, or successful inference.

If no real AI provider is configured, the interface must say that AI-assisted analysis is unavailable or not configured, while still allowing deterministic analysis.

## 6. PERSISTENCE AND DATABASE

Inspect the existing data model before adding tables.

Extend the existing schema only where necessary to support candidate fields, analysis runs, anomaly findings, evidence references, and reviewer outcomes.

Use SQLAlchemy 2.x conventions and Alembic migrations.

Requirements:

* Maintain foreign-key integrity.
* Follow existing transaction conventions.
* Avoid storing duplicate copies of full document text unnecessarily.
* Preserve source-document and source-page references.
* Support repeated analysis without duplicate active findings.
* Preserve sufficient historical information to explain previous results.
* Index common application, document, finding-status, and finding-type queries where useful.
* Use synthetic test data only.

Do not drop or destructively rewrite existing database tables.

## 7. ANALYSIS LIFECYCLE

Implement a service that:

1. Checks application and document readiness.
2. Loads available extraction results.
3. Produces candidate structured fields.
4. Compares relevant values.
5. Detects supported anomalies.
6. Persists findings and evidence.
7. Records the analysis outcome.
8. Returns a truthful summary.

Handle repeated requests safely.

If analysis cannot complete because extraction is unfinished, identify the unresolved dependency instead of claiming that the document passed.

Separate:

* Successful analysis with no detected anomalies.
* Successful analysis with findings.
* Partial analysis.
* Analysis requiring human review.
* Analysis failure.

**Absence of detected anomalies does not mean that a document is authentic or that an application is compliant.**

## 8. API ENDPOINTS

Follow existing API conventions and inspect `docs/DATA_MODEL_AND_API.md` before adding endpoints.

Implement equivalent functionality using `/api/v1/` if compatible with the established API contract.

Suggested endpoints:

* `POST /api/v1/applications/{application_id}/analyze`
* `GET /api/v1/applications/{application_id}/analysis`
* `GET /api/v1/applications/{application_id}/anomalies`
* `GET /api/v1/anomalies/{finding_id}`
* `POST /api/v1/anomalies/{finding_id}/review`

Add an endpoint to retrieve structured candidate fields if needed by the existing frontend and architecture.

Avoid creating duplicate endpoints.

Use Pydantic v2 schemas, validate inputs, return consistent errors, and implement pagination where appropriate.

For reviewer actions, validate the requested outcome against a defined set of allowed values.

Do not expose absolute file paths, secrets, or unnecessary personal information.

## 9. HUMAN REVIEW WORKFLOW

Implement a meaningful review lifecycle for anomaly findings.

At minimum, support appropriate transitions such as:

* `OPEN`
* `UNDER_REVIEW`
* `CONFIRMED_ISSUE`
* `FALSE_POSITIVE`
* `RESOLVED`

Use the existing project's terminology if already defined.

Record reviewer decisions, timestamps, and reasons where the data model supports them.

Do not automatically close findings merely because a later analysis produces no anomaly.

Do not automatically reject applications because findings exist.

Where the project has not yet implemented full authentication, clearly document that limitation and do not pretend the reviewer identity is securely authenticated.

## 10. FRONTEND INTEGRATION

Implement the frontend functionality in the existing React, Vite, and TypeScript application.

Preserve the current VerityAI design system and product-specific information architecture.

### Application Detail Workspace

Extend `ApplicationDetailWorkspace.tsx` to display:

* Candidate extracted fields.
* Source documents and page references.
* Cross-document comparisons.
* Detected anomalies.
* Severity and review status.
* Explanation and supporting evidence.
* Analysis status and timestamp.
* Available reviewer actions.
* Clear distinctions between deterministic results and optional AI suggestions.

### Documents Workspace

Where appropriate, provide access to extracted fields and related findings from the existing document repository and document inspection experience.

Allow reviewers to trace findings back to the actual source document and relevant page.

### Scrutiny Queue

Surface applications that have genuine unresolved findings or require review, using actual persisted data.

### Dashboard

Display anomaly counts or summaries only when backed by real stored records.

Do not fabricate anomaly counts, fraud probabilities, compliance percentages, trends, or AI-generated results.

### UI design

Use the established lavender, pale-purple, tomato-red, deep-navy, white, and Inter typography system.

The reference images are styling inspiration only. Do not copy their unrelated layouts, metrics, navigation, or workflows.

The product remains a regulatory application scrutiny platform, not a generic document-storage product.

## 11. AUDITABILITY AND SECURITY

Use the existing audit-event architecture.

Record meaningful events such as:

* Analysis initiated.
* Analysis completed.
* Analysis failed.
* Findings created or updated.
* Reviewer decisions recorded.

Ensure audit messages do not unnecessarily expose full document contents or sensitive personal information.

Treat uploaded content as untrusted.

Maintain file-storage protections and the existing upload size and content-validation safeguards.

Avoid arbitrary code execution, unsafe deserialization, unsafe document rendering, and unrestricted access to uploaded files.

Do not introduce real institutional data or claim access to official AICTE databases.

## 12. TESTING

Add comprehensive automated tests covering:

* Field extraction from representative synthetic text.
* Missing and ambiguous fields.
* Normalization of dates, identifiers, and numeric values.
* Cross-document conflicts.
* Matching and mismatching application declarations.
* Duplicate document hashes.
* Low-quality or incomplete OCR.
* Unprocessed and failed documents.
* No-anomaly outcomes.
* Multiple anomaly findings.
* Repeated analysis and idempotency.
* Findings updated after source data changes.
* AI provider disabled or unavailable.
* Invalid or malformed AI output, if an adapter exists.
* Reviewer status transitions.
* Invalid review actions.
* API success and error cases.
* Audit events.
* Database persistence and migrations.
* Existing application, upload, OCR, and Phase 5 validation regressions.

Use synthetic fixtures and temporary test databases.

Tests must not require external AI services, paid APIs, or network connectivity.

Run the full backend test suite and frontend production build. Fix regressions introduced by the implementation.

Report only tests that actually ran and their actual results.

## 13. DOCUMENTATION AND GIT

Update:

* `docs/PROJECT_STATUS.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`

Update other documentation where necessary.

Document:

* Implemented anomaly types.
* Supported field extraction and normalization.
* Evidence traceability.
* AI provider configuration and limitations.
* Human-review workflow.
* API contracts.
* Migrations.
* Actual test results.
* Remaining limitations.

Follow `AGENTS.md` for Git rules.

Preserve existing history and user changes. Create a focused milestone commit only when permitted and after relevant checks pass.

## 14. DEFINITION OF DONE

Phase 6 is complete only when:

1. The existing Phase 3 extraction pipeline is reused correctly.
2. Phase 5 validation results are integrated wherever available.
3. Candidate field identification works against real extracted text.
4. Supported cross-document anomalies are detected deterministically.
5. Findings are persisted with traceable evidence.
6. Analysis can be triggered and retrieved through the API.
7. Reviewers can inspect findings and record supported review outcomes.
8. The frontend displays real findings without fabricated results.
9. The application works without an external AI provider.
10. Any optional AI integration accurately reports its configuration and limitations.
11. Existing functionality remains operational.
12. Migrations, backend tests, and frontend build pass.
13. Documentation and the Git checkpoint are updated as appropriate.

## 15. FINAL REPORT

After implementation, provide a concise report with:

* Features implemented.
* Models and migrations changed.
* API endpoints added or updated.
* Frontend components updated.
* Actual backend test results.
* Actual frontend build result.
* Git commit hash, if created.
* Known limitations and any incomplete requirements.

Begin by inspecting the actual repository. Complete prerequisite work if necessary, then implement Phase 6 end-to-end.




# PHASE 7 — AUTHENTICATION, AUTHORIZATION & ROLE-BASED ACCESS CONTROL

## Project: VerityAI / EntityLocker — SIH 2026

Act as a senior application-security engineer, FastAPI architect, database engineer, and React/TypeScript developer.

Implement Phase 7 end-to-end in the existing repository. Inspect the actual code, implement the features, run the complete tests, fix regressions, update documentation, and create a Git checkpoint if permitted.

Work autonomously on routine implementation tasks. Do not stop after producing a plan or ask for routine approvals. Never claim that an operation succeeded unless you have verified it.

## 1. INSPECT THE EXISTING PROJECT

Read and follow:

* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/IMPLEMENTATION_PLAN.md`
* `docs/PROJECT_STATUS.md`

Inspect existing User models, database migrations, API dependencies, frontend routing, application/document access, validation and anomaly-review functionality, and audit events.

The previous roadmap planned full cookie-based authentication for Phase 7. Verify which features already exist and reuse them.

Phases 5 and 6 must be checked against the actual repository. If either is incomplete, finish the prerequisites needed for secure integration without rebuilding completed work.

Preserve all user changes, existing Git history, and working functionality.

## 2. OBJECTIVE

Implement secure authentication and authorization for the VerityAI prototype.

The system must support:

* User sign-in and sign-out.
* Secure session handling.
* Role-based permissions.
* Protected frontend routes.
* Protected backend endpoints.
* Appropriate audit events.
* Consistent handling of expired or invalid sessions.

Do not rely on frontend-only protection. Every protected backend operation must independently enforce authentication and authorization.

## 3. AUTHENTICATION

Use the existing architecture and documented authentication strategy.

Prefer the planned JWT-based authentication using an **HttpOnly cookie**.

Requirements:

* Use a maintained, appropriate password-hashing implementation.
* Never store plaintext passwords.
* Never return passwords, password hashes, or session secrets through APIs.
* Validate credentials using constant-time-safe library mechanisms where applicable.
* Use secure token expiration and verification.
* Validate token signature, expiry, and required claims.
* Reject malformed, expired, revoked, or invalid sessions.
* Keep cryptographic secrets in environment configuration.
* Fail safely if required production secrets are missing.
* Use `Secure` cookies outside local development.
* Set `HttpOnly` and an appropriate `SameSite` policy.
* Restrict cookie path and lifetime appropriately.
* Implement sign-out that invalidates the session according to the selected token/session design.
* Avoid logging passwords, tokens, or sensitive authentication data.

Do not introduce an insecure homemade cryptographic algorithm.

## 4. CSRF AND BROWSER SECURITY

The existing architecture planned cookie authentication with a custom request header:

`X-Requested-With: VerityAI`

Inspect the existing CSRF strategy and implement it correctly.

Requirements:

* Validate the expected custom header on state-changing authenticated requests where required.
* Apply appropriate Origin/Referer checks where suitable.
* Restrict CORS to explicitly configured trusted origins.
* Do not enable unrestricted credentialed CORS.
* Ensure the CSRF strategy is compatible with frontend development and production deployment.
* Do not mistake the presence of a custom header alone for complete CSRF protection.
* Ensure login, logout, and other state-changing operations are protected appropriately without creating an unusable authentication flow.

Document any remaining limitations.

## 5. ROLE-BASED ACCESS CONTROL

Implement a clear, extensible role model.

Inspect the current `User` model and existing project requirements before choosing exact roles.

At minimum, consider:

* `ADMIN`: manages users and system configuration.
* `REVIEWER`: reviews applications, documents, validation results, and anomaly findings.
* `VIEWER`: read-only access to permitted records.

Use the project's existing terminology if equivalent roles already exist.

Define permissions explicitly for:

* Viewing applications and institutions.
* Creating or updating application records.
* Uploading and accessing documents.
* Triggering validation.
* Triggering document analysis.
* Reviewing anomaly findings.
* Recording review decisions.
* Managing users and roles.
* Viewing audit events.
* Changing system configuration.

Do not allow users to assign themselves elevated roles.

Enforce permissions on the backend using reusable dependencies or services.

Do not rely solely on hidden buttons or frontend route restrictions.

## 6. USER MANAGEMENT

Implement the minimum necessary user-management functionality.

Depending on the existing architecture, support:

* Listing permitted user metadata.
* Creating users through an authorized administrator workflow.
* Assigning allowed roles.
* Activating or deactivating accounts.
* Changing passwords securely.
* Preventing disabled users from continuing to use existing sessions.

Do not expose password hashes, session secrets, or unnecessary personal data.

If public registration is unnecessary for this prototype, keep it disabled and document the supported administrator-created or seeded-user workflow.

Do not create a public default administrator account with a known production password.

For synthetic demo accounts, use an explicit local-development configuration and document the limitations.

## 7. DATABASE AND SESSION MANAGEMENT

Inspect the existing SQLAlchemy models and migrations.

Add only the tables, columns, or session/revocation records genuinely needed.

Use Alembic migrations and preserve existing data.

Requirements:

* Maintain foreign-key integrity.
* Handle concurrent requests safely.
* Invalidate sessions for disabled users.
* Support password changes and the intended revocation policy.
* Avoid creating multiple inconsistent sources of truth for roles.
* Preserve auditability of security-sensitive changes.

Do not destructively recreate the database.

## 8. API ENDPOINTS

Follow the existing API conventions and `docs/DATA_MODEL_AND_API.md`.

Implement equivalent endpoints using `/api/v1/` where appropriate.

Suggested endpoints:

* `POST /api/v1/auth/login`
* `POST /api/v1/auth/logout`
* `GET /api/v1/auth/me`
* `POST /api/v1/auth/change-password`

Add administrator-protected user-management endpoints if needed.

Requirements:

* Validate all request bodies.
* Return consistent error responses.
* Avoid revealing whether a username exists when doing so would enable account enumeration.
* Apply appropriate rate limiting or login-attempt protections using an approach compatible with the existing deployment.
* Do not expose tokens to JavaScript unnecessarily.
* Do not add a token to localStorage or sessionStorage.
* Keep OpenAPI documentation consistent with the actual authentication mechanism.

Do not duplicate existing endpoints.

## 9. FRONTEND AUTHENTICATION

Integrate authentication into the existing React, Vite, and TypeScript frontend.

Implement:

* A professional sign-in page.
* Authentication state derived from the backend.
* Protected application routes.
* Sign-out.
* Clear expired-session handling.
* Appropriate loading and error states.
* Permission-aware navigation and actions.

Use the existing API client and React architecture.

For cookie-authenticated requests, configure credential handling appropriately and ensure the custom request header is added to applicable state-changing requests.

Do not store authentication tokens in browser localStorage or sessionStorage.

Preserve the VerityAI lavender, pale-purple, tomato-red, deep-navy, white, and Inter design system.

The application remains an institutional scrutiny platform. Do not replace its product-specific navigation with generic SaaS navigation.

## 10. PROTECT EXISTING FUNCTIONALITY

Review all existing endpoints and enforce suitable permissions for:

* Applications.
* Institutions.
* Document uploads and downloads.
* Document processing.
* Validation rules and results.
* AI-assisted analysis and anomaly findings.
* Reviewer decisions.
* Audit events.
* User management.

Read operations and write operations may require different permissions.

Do not accidentally block essential health checks or legitimate local development workflows.

Ensure unauthorized users cannot bypass protections by calling APIs directly.

If tenant or institution-level isolation is not implemented, do not pretend it is. Document the limitation and avoid introducing misleading security claims.

## 11. AUDIT EVENTS

Use the existing audit-event system to record relevant security events, such as:

* Successful login.
* Failed login, where appropriate.
* Logout.
* Password changes.
* User activation or deactivation.
* Role changes.
* Denied sensitive operations, where appropriate.

Do not store plaintext passwords, raw authentication tokens, or other secrets in audit events.

Use consistent timestamps and the project's existing database conventions.

## 12. TESTING — MANDATORY

Add comprehensive tests for:

* Valid login.
* Invalid credentials.
* Missing credentials.
* Expired tokens.
* Malformed tokens.
* Logout and revoked sessions.
* Disabled users.
* Password hashing and verification.
* Password changes.
* CSRF enforcement.
* CORS restrictions.
* Role-based permissions.
* Unauthorized and forbidden API access.
* Protected document preview and download.
* Protected validation and anomaly-review actions.
* User-management authorization.
* Audit-event creation.
* Existing API regressions.
* Database migration behavior.

Verify that a user cannot gain administrator privileges by modifying a request.

Verify that the frontend production build succeeds.

Run the complete backend test suite and frontend build. Fix implementation-related failures before declaring completion.

Report actual test results only.

## 13. DOCUMENTATION AND GIT

Update:

* `docs/PROJECT_STATUS.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/ARCHITECTURE.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`

Document:

* Authentication design.
* Cookie and CSRF behavior.
* Role-permission matrix.
* Local demo-user provisioning.
* Environment variables.
* Session invalidation.
* Security limitations.
* Test results.

Follow `AGENTS.md` for Git requirements. Preserve existing history and user changes. Create a focused milestone commit only when permitted and after the relevant tests and build pass.

## 14. DEFINITION OF DONE

Phase 7 is complete only when:

1. Login and logout work end-to-end.
2. Protected backend endpoints enforce authentication.
3. Role-based permissions are enforced on the backend.
4. Browser sessions use the documented secure cookie strategy.
5. CSRF and CORS controls are appropriately configured.
6. The frontend handles protected routes and expired sessions.
7. User-management operations are appropriately restricted.
8. Security-sensitive events are auditable.
9. Existing document, application, validation, and analysis functionality remains operational.
10. Database migrations, backend tests, and frontend build succeed.
11. Documentation is updated.
12. A Git checkpoint is created if permitted.

## 15. FINAL REPORT

Report:

* Features implemented.
* Authentication and session design.
* Roles and permissions.
* Database migrations.
* API endpoints.
* Frontend changes.
* Actual backend test results.
* Frontend build result.
* Git commit hash, if created.
* Remaining security limitations or incomplete work.

Begin by inspecting the repository. Complete any necessary prerequisites, implement Phase 7, and verify it end-to-end.





# PHASE 8 — END-TO-END WORKFLOW ORCHESTRATION

## Project: VerityAI / EntityLocker — SIH 2026

Act as a senior software architect, backend engineer, workflow automation specialist, and frontend developer.

Implement Phase 8 end-to-end in the existing repository. Inspect the actual codebase, integrate the existing modules, run the full test suite, fix regressions, update documentation, and create a Git checkpoint if permitted.

Work autonomously on routine tasks. Do not stop after producing a plan. Do not claim that a feature works without verifying it.

## 1. INSPECT THE PROJECT FIRST

Read:

* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/IMPLEMENTATION_PLAN.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/PROJECT_STATUS.md`

Inspect the actual implementation of Phases 1–7, including application ingestion, secure document storage, OCR, validation, anomaly detection, authentication, authorization, and audit logging.

Do not assume every previous phase is complete simply because a report says it is. Verify the repository and tests.

If prerequisites are missing, complete the minimum necessary prerequisite work before proceeding. Reuse existing functionality rather than rebuilding it.

Preserve user changes, migrations, API contracts, and Git history.

## 2. OBJECTIVE

Create one integrated institutional application scrutiny workflow.

The intended lifecycle is:

1. Application is created or submitted.
2. Required supporting documents are uploaded.
3. Documents are securely stored and processed.
4. Text extraction and OCR results become available.
5. Document-processing completeness is assessed.
6. Deterministic validation rules execute.
7. AI-assisted analysis and anomaly detection execute where available.
8. Findings and supporting evidence are consolidated.
9. The application enters the appropriate scrutiny queue.
10. An authorized reviewer examines the evidence and findings.
11. The reviewer records a decision or requests further information, where supported.
12. The system records the action in the audit trail.
13. The application status and outstanding work are updated consistently.

**Do not invent workflow states or bypass missing prerequisites.** Reuse existing enums, transitions, data models, and API contracts wherever possible.

## 3. WORKFLOW STATE MACHINE

Inspect the existing application status model before changing it.

Implement a documented state machine with valid transitions between the states already supported by the project.

Potential stages include:

* Draft.
* Submitted.
* Documents pending.
* Processing.
* Ready for scrutiny.
* Under review.
* Additional information required.
* Review completed.

Use the existing status vocabulary if it already represents these concepts.

Requirements:

* Define permitted transitions explicitly.
* Reject invalid transitions with appropriate API errors.
* Record who initiated a transition when authenticated identity is available.
* Record timestamps and meaningful transition reasons.
* Prevent concurrent requests from silently overwriting newer state.
* Avoid marking an application ready while required documents are still processing.
* Do not equate successful OCR with regulatory compliance.
* Do not equate the absence of anomalies with proof of authenticity.
* Do not automatically approve or reject an application solely because of automated findings.

Any final regulatory decision must remain an explicit authorized human action unless the documented project requirements specify otherwise.

## 4. ORCHESTRATE EXISTING PROCESSING SERVICES

Create a dedicated workflow orchestration service that coordinates existing modules.

Integrate:

* Application records.
* Required-document checks.
* Secure document uploads.
* Document-processing runs.
* OCR and extracted page text.
* Phase 5 validation results.
* Phase 6 anomaly findings.
* Phase 7 authentication and permissions.
* Audit events.

The orchestration layer must invoke existing services through defined interfaces rather than duplicate their business logic.

Requirements:

* Identify prerequisites before starting each stage.
* Execute only the operations needed for the current application state.
* Make repeated requests safe and idempotent where practical.
* Persist stage outcomes.
* Distinguish pending, successful, partially completed, failed, and review-required operations.
* Preserve previous results and audit history appropriately.
* Provide actionable errors when a prerequisite is missing.
* Avoid marking an entire workflow successful when one or more mandatory stages failed.

Do not introduce external workflow infrastructure unless the existing architecture genuinely requires it.

For the current prototype, prefer a maintainable orchestration service compatible with the existing FastAPI and SQLAlchemy architecture.

## 5. PROCESSING AND RETRY BEHAVIOR

Inspect the current document-processing implementation.

Implement safe retry and recovery behavior where necessary.

Requirements:

* Retry only operations that are safe to retry.
* Avoid duplicate document records, findings, and audit events caused by repeated requests.
* Record attempt counts and failure reasons where appropriate.
* Avoid infinite retry loops.
* Handle interrupted or stale processing states.
* Do not silently convert failures into success.
* Do not retry permanent validation errors indefinitely.
* Preserve the original document and relevant processing history.
* Provide a controlled mechanism to reprocess failed documents where supported.

If background processing is not implemented, assess whether it is necessary for the prototype. Do not introduce Redis, Celery, or other infrastructure without a clear need and a documented implementation strategy.

If asynchronous processing is implemented, ensure the frontend can retrieve truthful persisted status.

## 6. APPLICATION READINESS AND SCRUTINY QUEUE

Create or refine a backend service that determines application readiness using actual stored records.

Consider:

* Required documents.
* Document-processing completion.
* Required extracted fields.
* Validation outcomes.
* Unresolved anomalies.
* Existing application status.
* Outstanding human-review tasks.

Represent these dimensions separately rather than collapsing them into an unexplained score.

For example, an application may have:

* Document processing complete.
* Validation completed with failures.
* An anomaly requiring human review.
* Overall scrutiny still pending.

These conditions must remain distinguishable.

The scrutiny queue must use actual backend data and allow authorized reviewers to identify:

* Applications ready for scrutiny.
* Applications awaiting document processing.
* Applications requiring additional information.
* Applications with unresolved validation findings.
* Applications with unresolved anomaly findings.
* Applications already under review.

Do not invent priority scores or risk percentages.

If prioritization is implemented, use transparent, documented criteria.

## 7. REVIEWER WORKSPACE

Integrate the existing `ApplicationDetailWorkspace.tsx` with the complete workflow.

A reviewer should be able to inspect:

* Application metadata.
* Required-document completeness.
* Uploaded documents.
* Page-level extracted text.
* Document-processing status.
* Deterministic validation results.
* Evidence behind validation findings.
* AI-assisted analysis results, if configured.
* Anomaly findings and their review status.
* Application status and transition history.
* Audit events.
* Available authorized actions.

Provide clear links between a finding and its source document/page.

Ensure the reviewer can distinguish:

* A confirmed rule failure.
* A processing error.
* Missing evidence.
* An unresolved anomaly.
* A finding already reviewed.
* A completed human decision.

Do not display unsupported features or pretend that optional AI services are active.

## 8. AUTHENTICATION AND AUTHORIZATION

If Phase 7 has been implemented, enforce its authentication and role-based authorization throughout the workflow.

At minimum:

* Only authorized users can trigger protected processing actions.
* Only authorized reviewers can record review decisions.
* Only appropriately privileged users can change protected workflow states.
* Only authorized administrators can manage system-level configuration.
* Read and write permissions are enforced by the backend.
* Direct API calls cannot bypass frontend restrictions.

If authentication is incomplete, identify and document the limitation rather than pretending that identity and permissions are securely enforced.

Do not create a parallel authentication system.

## 9. API DESIGN

Follow `docs/DATA_MODEL_AND_API.md` and existing route conventions.

Use `/api/v1/` consistently.

Implement or refine the endpoints needed for:

* Starting or resuming an application workflow.
* Retrieving workflow status.
* Retrieving application readiness.
* Retrieving pending scrutiny tasks.
* Triggering validation and analysis when prerequisites are met.
* Recording supported reviewer actions.
* Retrieving workflow and transition history.

Suggested endpoint shapes, only if compatible with the existing contract:

* `POST /api/v1/applications/{application_id}/workflow/start`
* `GET /api/v1/applications/{application_id}/workflow`
* `GET /api/v1/applications/{application_id}/readiness`
* `GET /api/v1/scrutiny-queue`
* `POST /api/v1/applications/{application_id}/workflow/transitions`

Do not create duplicate endpoints for functionality that already exists.

Use Pydantic v2 schemas, pagination, input validation, consistent error responses, and appropriate HTTP status codes.

Do not expose internal filesystem paths or sensitive information.

## 10. FRONTEND EXPERIENCE

Integrate the workflow into the existing React, Vite, and TypeScript frontend.

Update the existing Overview, Applications, Scrutiny Queue, Documents, Validation Rules, Institutions, and Audit Trail views as needed.

Provide:

* Truthful workflow status.
* Processing-stage indicators.
* Clear pending-action states.
* Actionable error messages.
* Reviewer action confirmations.
* Evidence navigation.
* Refresh or query invalidation after state changes.
* Empty states and loading states.
* Responsive layouts.

Never show fabricated progress percentages.

If the system cannot calculate meaningful progress from persisted stages, display stage labels rather than a percentage.

### Visual direction

Preserve the established VerityAI design system:

* Lavender `#CBB3E8`.
* Pale purple `#F3EEFC` and `#FAF8FF`.
* Primary purple `#7450D8`.
* Tomato red `#F04438` and `#E34234`.
* Deep navy `#171B45`.
* Inter typography.

Reference images are visual inspiration only. Do not copy unrelated layouts or generic storage workflows.

## 11. AUDITABILITY

Use the existing audit-event architecture.

Record meaningful events such as:

* Workflow initiated.
* Processing stage completed or failed.
* Validation triggered or completed.
* Analysis triggered or completed.
* Application status changed.
* Reviewer decision recorded.
* Additional information requested.
* Retry initiated.
* Invalid transition rejected, where appropriate.

Use the authenticated actor where available.

Keep audit events consistent and useful for reconstruction of the workflow.

Avoid logging secrets or unnecessarily duplicating document contents.

## 12. DATA CONSISTENCY AND TRANSACTIONS

Inspect database transaction boundaries and concurrency behavior.

Ensure:

* Application state changes are persisted consistently.
* Related workflow events and audit records are not silently lost.
* Failed operations leave recoverable states.
* Concurrent transitions cannot overwrite each other without detection.
* Foreign keys remain valid.
* Existing migrations remain reversible where practical.
* Repeated API requests do not create duplicate records.

Use SQLAlchemy 2.x conventions and Alembic migrations where required.

Do not destructively recreate the database.

## 13. TESTING — MANDATORY

Add or extend automated tests for:

* A complete successful workflow.
* Missing required documents.
* Documents still processing.
* OCR failures.
* Validation failures.
* Unresolved anomaly findings.
* Partial workflow completion.
* Invalid state transitions.
* Repeated workflow-start requests.
* Safe retries.
* Interrupted processing recovery.
* Readiness calculations.
* Scrutiny queue filtering.
* Concurrent state changes.
* Authorization restrictions.
* Audit-event consistency.
* API error responses.
* Database migrations.
* Existing application, document, OCR, validation, and anomaly-detection functionality.

Use synthetic fixtures and temporary test databases.

Do not require external AI services or network access for the core tests.

Run the complete backend test suite and frontend production build. Fix implementation-related regressions before declaring success.

Report the actual results.

## 14. DOCUMENTATION AND GIT

Update:

* `docs/PROJECT_STATUS.md`
* `docs/ARCHITECTURE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/AI_PIPELINE.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`

Document:

* The implemented workflow.
* Supported states and transitions.
* Readiness criteria.
* Processing and retry behavior.
* API contracts.
* Authorization requirements.
* Recovery limitations.
* Actual test results.

Follow `AGENTS.md` for Git operations. Preserve user changes and history. Create a focused milestone commit only if permitted and after the relevant checks pass.

## 15. DEFINITION OF DONE

Phase 8 is complete only when:

1. Existing modules are integrated through a coherent orchestration service.
2. Application lifecycle transitions are validated.
3. Workflow readiness is calculated from actual persisted records.
4. Document processing, validation, and anomaly findings are connected correctly.
5. Reviewers can inspect evidence and perform authorized workflow actions.
6. Retries and repeated requests behave safely.
7. Failures and partial completion remain visible and recoverable.
8. Audit history reflects meaningful workflow actions.
9. The frontend presents truthful status without fabricated progress.
10. Existing authentication and authorization are enforced where implemented.
11. The complete backend test suite and frontend production build pass.
12. Documentation is updated and a Git checkpoint is created if permitted.

## 16. FINAL REPORT

Provide:

* Features implemented.
* Workflow states and transitions.
* Services and database changes.
* API endpoints.
* Frontend changes.
* Actual backend test results.
* Frontend build result.
* Git commit hash, if created.
* Remaining limitations.

Begin by inspecting the actual repository. Verify prerequisites, implement Phase 8 end-to-end, run the checks, and report the verified outcome.
   




# PHASE 9 — EXPLAINABLE AI, REVIEWER DECISION SUPPORT & REGULATORY EVIDENCE REPORTS

## Project: VerityAI / EntityLocker — SIH 2026

Act as a senior AI engineer, regulatory-compliance architect, backend developer, and frontend engineer.

Implement Phase 9 end-to-end in the existing VerityAI repository. Inspect the actual code, reuse existing services, implement the required functionality, run tests, fix regressions, update documentation, and create a Git checkpoint if permitted.

Work autonomously on routine implementation tasks. Do not stop after producing a plan. Do not claim success without verification.

## 1. INSPECT THE PROJECT FIRST

Read:

* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/IMPLEMENTATION_PLAN.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/PROJECT_STATUS.md`

Inspect the actual implementations of:

* Application ingestion.
* Document upload and OCR.
* Page-level extracted text.
* Phase 5 validation rules and results.
* Phase 6 anomaly detection and evidence.
* Phase 7 authentication and authorization.
* Phase 8 workflow orchestration.
* Existing audit events and reviewer actions.

Verify which features actually exist before integrating them. Complete any missing prerequisite that directly blocks Phase 9. Do not rebuild working modules.

Preserve existing user changes, Git history, API contracts, and database records.

## 2. OBJECTIVE

Build an explainable decision-support layer that helps authorized reviewers understand:

* What was checked.
* Which rules were applied.
* What evidence supports each result.
* Which documents and pages supplied the evidence.
* What inconsistencies were detected.
* What remains unresolved.
* Why human review is required.
* What actions are available next.

Generate a structured regulatory scrutiny report for each application using actual persisted data.

The system must support human decision-making without making unsupported claims about document authenticity, fraud, or regulatory compliance.

## 3. EXPLAINABLE VALIDATION RESULTS

Extend existing validation-result presentation and services where necessary.

For every applicable rule result, provide a human-readable explanation containing:

* Rule name and type.
* Purpose of the check.
* Expected condition.
* Observed value or condition.
* Result and its meaning.
* Evidence source.
* Source document and page, where available.
* Evaluation timestamp.
* Uncertainty or limitations.
* Recommended reviewer action, where appropriate.

Use the existing rule definitions and result vocabulary.

Do not generate explanations that contradict the stored validation result.

A failed rule must not automatically imply fraud. An unresolved result must not be presented as a confirmed failure.

## 4. EVIDENCE TRACEABILITY

Create a consistent evidence representation that reuses existing extraction, validation, and anomaly records.

Evidence references should identify, where applicable:

* Application ID.
* Rule-result ID.
* Finding ID.
* Document ID.
* Page number.
* Extracted text or field reference.
* Declared application value.
* Observed document value.
* Comparison performed.
* Timestamp and source.

Do not duplicate entire documents or unnecessarily copy sensitive data into reports.

Where exact source-page evidence is unavailable, state that explicitly rather than inventing a page number or quotation.

Allow reviewers to navigate from a finding or report entry to the corresponding document and extracted page when the existing application supports it.

## 5. REVIEWER DECISION SUPPORT

Implement a structured reviewer summary using actual application data.

Include:

* Application identity and category.
* Current workflow status.
* Required-document completeness.
* Document-processing status.
* Validation results.
* Unresolved findings.
* Reviewed findings.
* Missing or uncertain evidence.
* Outstanding reviewer actions.
* Relevant audit events.

Keep distinct:

* Automated rule results.
* AI-generated suggestions, if a real provider is configured.
* Human-confirmed findings.
* Formal reviewer decisions.

Do not collapse these into an unexplained risk score.

Do not automatically approve or reject an application.

Do not claim that a human has reviewed a result unless a persisted reviewer action confirms it.

## 6. RECOMMENDED ACTIONS

Provide actionable recommendations based on explicit conditions.

Examples:

* Wait for document processing to finish.
* Request a missing supporting document.
* Inspect the cited source page.
* Verify conflicting identifiers.
* Review an expired or uncertain date.
* Resolve a failed validation.
* Record a reviewer outcome.

Recommendations must be derived from actual findings and workflow state.

Do not recommend actions unsupported by the current workflow.

Clearly distinguish suggestions from executed actions. Display a success message only after the relevant action has actually completed.

## 7. REGULATORY SCRUTINY REPORT GENERATION

Generate a downloadable report for an individual application.

Use a maintainable server-side report-generation implementation compatible with the existing project.

PDF output is preferred for the formal report. Provide a structured JSON representation or other useful machine-readable format if consistent with the existing API.

The report should include:

1. Report title and generation timestamp.
2. Application reference and category.
3. Institution information available in the database.
4. Current application and workflow status.
5. Document inventory and processing outcomes.
6. Required-document assessment.
7. Validation rule results.
8. Anomaly findings.
9. Evidence references and page numbers.
10. Unresolved questions and missing evidence.
11. Human-review outcomes.
12. Audit history relevant to the scrutiny process.
13. Known limitations and appropriate disclaimers.

Report requirements:

* Use only actual persisted records.
* Distinguish unavailable data from empty results.
* Include the report-generation timestamp.
* Identify the report as generated by VerityAI.
* Make clear that the report is decision support, not an official AICTE approval or certification.
* Do not label an application compliant unless the applicable configured rules genuinely support that statement.
* Do not fabricate signatures, official seals, government branding, or approval certificates.
* Avoid unsupported conclusions about fraud or authenticity.
* Handle long reports, tables, special characters, and multiple pages correctly.
* Do not expose absolute storage paths, secrets, or unnecessary sensitive data.

If a PDF-generation library already exists, reuse it. Otherwise, select a maintained dependency compatible with the project and document it.

## 8. REPORT CONSISTENCY AND SNAPSHOTS

Ensure generated reports accurately represent the data used during generation.

Where practical:

* Record when the report was generated.
* Associate it with the application.
* Record relevant source-result timestamps or version references.
* Prevent accidental mixing of results from different applications.
* Make clear when source records changed after report generation.

Do not claim that a report is immutable or cryptographically signed unless that functionality is actually implemented.

If report snapshots are persisted, define appropriate access controls, retention behavior, and migration requirements.

## 9. API ENDPOINTS

Inspect the existing API contract before implementing endpoints.

Use `/api/v1/` consistently.

Suggested endpoints, only where compatible with the existing architecture:

* `GET /api/v1/applications/{application_id}/review-summary`
* `GET /api/v1/applications/{application_id}/evidence`
* `POST /api/v1/applications/{application_id}/reports`
* `GET /api/v1/applications/{application_id}/reports`
* `GET /api/v1/reports/{report_id}/download`

Add a structured JSON report endpoint if useful.

Requirements:

* Validate application and report identifiers.
* Enforce authentication and authorization where implemented.
* Restrict report access to permitted users.
* Use appropriate content types and safe download headers.
* Avoid exposing internal paths.
* Apply pagination to large evidence or history collections.
* Return consistent error responses.
* Do not create duplicate endpoints for existing functionality.

## 10. FRONTEND INTEGRATION

Extend the existing `ApplicationDetailWorkspace.tsx` with a reviewer-oriented summary.

Display:

* Validation explanations.
* Evidence links.
* Source-document/page references.
* Unresolved issues.
* Suggested next actions.
* Human-review outcomes.
* Report-generation and download controls.

Update the existing Validation Rules and Scrutiny Queue views only where necessary.

The report-generation interface must:

* Show a loading state while generating.
* Display a useful error if generation fails.
* Offer the file only after the backend successfully generates it.
* Prevent duplicate requests where appropriate.
* Refresh relevant data after state changes.

Do not use fabricated example findings in production UI states.

If the application has no findings, display a truthful empty state and clarify that no findings were recorded; do not imply guaranteed compliance.

## 11. SECURITY AND PRIVACY

Reuse existing authentication, authorization, and audit systems.

Ensure:

* Only authorized users can access sensitive reports.
* Users cannot download another application's report by manipulating identifiers.
* Report generation does not expose filesystem paths.
* Document contents and personal data are included only when necessary.
* Untrusted extracted text is escaped or rendered safely.
* Reports cannot execute embedded document content.
* Temporary report files are cleaned up appropriately.
* Sensitive report data is not unnecessarily written to logs.

Document any access-control limitations that remain.

## 12. AUDITABILITY

Record meaningful events such as:

* Review summary accessed, where policy requires it.
* Report generation requested.
* Report generation completed.
* Report generation failed.
* Report downloaded, where supported.
* Human reviewer decision recorded.

Reuse the existing audit-event architecture.

Do not log entire report contents or secrets.

## 13. TESTING — MANDATORY

Add tests for:

* Review summaries with complete data.
* Applications without validation results.
* Missing documents and incomplete processing.
* Passed and failed validation rules.
* Unresolved and reviewed anomaly findings.
* Missing evidence references.
* Correct document/page linking.
* Accurate report contents.
* Multi-page PDF generation.
* Special characters and long text.
* Missing application and report identifiers.
* Unauthorized report access.
* Cross-application access attempts.
* Correct MIME type and download headers.
* Report-generation failures and cleanup.
* Consistency between stored records and generated output.
* Audit-event creation.
* Existing application, upload, OCR, validation, analysis, and workflow regressions.

Use synthetic data and temporary test databases.

Run the complete backend test suite and frontend production build. Fix implementation-related failures before declaring completion.

Report actual test results only.

## 14. DOCUMENTATION AND GIT

Update:

* `docs/PROJECT_STATUS.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/ARCHITECTURE.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`

Update other documentation where necessary.

Document:

* Report format and contents.
* Evidence-traceability behavior.
* Review-summary logic.
* API contracts.
* Authorization requirements.
* Report retention or snapshot behavior, if implemented.
* Known limitations.
* Actual test results.

Follow `AGENTS.md` for Git requirements. Preserve existing user changes and history. Create a focused milestone commit only if permitted and after the relevant checks pass.

## 15. DEFINITION OF DONE

Phase 9 is complete only when:

1. Review summaries are generated from real application data.
2. Validation results include meaningful explanations.
3. Findings link to available supporting evidence.
4. Missing or uncertain evidence is clearly identified.
5. Reviewer recommendations are grounded in actual findings.
6. A downloadable scrutiny report is generated successfully.
7. Report contents accurately reflect persisted records.
8. Report access is appropriately protected.
9. The frontend supports summary inspection and report downloads.
10. Auditability and privacy protections are maintained.
11. Existing functionality remains operational.
12. Database migrations, backend tests, and frontend production build pass.
13. Documentation is updated.
14. A Git checkpoint is created if permitted.

## 16. FINAL REPORT

Provide:

* Features implemented.
* Report formats and contents.
* Evidence-traceability behavior.
* API endpoints.
* Database changes.
* Frontend changes.
* Actual backend test results.
* Frontend build result.
* Git commit hash, if created.
* Remaining limitations.

Begin by inspecting the actual repository, verify prerequisites, implement Phase 9 end-to-end, and report only verified outcomes.






# PHASE 10 — SECURITY HARDENING, PERFORMANCE & PRODUCTION READINESS

## Project: VerityAI / EntityLocker — SIH 2026

Act as a senior application-security engineer, DevSecOps engineer, backend architect, database engineer, and frontend performance specialist.

Your task is to audit, harden, optimize, and prepare the existing VerityAI application for a reliable demonstration and controlled deployment.

**Do not rebuild the application.** Inspect the existing implementation, identify real issues, implement appropriate fixes, run the relevant tests, and update documentation.

Work autonomously on routine tasks. Do not stop after creating a plan. Never claim that a security control, test, or deployment works unless you have verified it.

---

## 1. INSPECT THE ENTIRE PROJECT

Read and follow:

* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/IMPLEMENTATION_PLAN.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/PROJECT_STATUS.md`

Inspect the actual implementations of Phases 1–9.

Verify the existence and completeness of:

* Application ingestion.
* Secure document storage and upload.
* PDF extraction and OCR.
* Deterministic validation.
* AI-assisted analysis and anomaly detection.
* Authentication and role-based authorization.
* Workflow orchestration.
* Evidence traceability and report generation.
* Audit events.
* Database migrations.
* Frontend routing and API integration.

If an earlier phase is incomplete, fix critical prerequisites before continuing. Do not assume a feature exists merely because a previous report claims it does.

Preserve user changes, existing Git history, and working functionality.

## 2. SECURITY AUDIT

Perform a systematic security review of the application.

Inspect for:

* Broken authentication.
* Broken authorization.
* Insecure direct object references.
* Cross-application data exposure.
* Path traversal.
* Unsafe file uploads.
* Unsafe file downloads.
* SQL injection risks.
* Cross-site scripting.
* CSRF weaknesses.
* Insecure CORS configuration.
* Secret leakage.
* Sensitive information in logs.
* Unrestricted resource consumption.
* Unsafe error messages.
* Insecure session handling.
* Missing security headers.
* Dependency vulnerabilities.
* Unsafe handling of untrusted extracted document text.

Create a prioritized list of findings based on actual evidence.

Fix verified issues within the project scope. Do not merely generate a report while leaving straightforward critical vulnerabilities unresolved.

Never claim that the application has undergone a formal penetration test unless one was actually performed.

## 3. AUTHENTICATION AND AUTHORIZATION HARDENING

Verify the existing authentication implementation.

Ensure:

* Protected APIs require authentication.
* Backend permissions are enforced independently of frontend controls.
* Users cannot elevate their own roles.
* Disabled users cannot continue using invalidated sessions.
* Sensitive document and report endpoints enforce application-level authorization.
* Session expiration and logout behave correctly.
* Cookies use appropriate security attributes.
* CSRF protections are effective for cookie-authenticated requests.
* CORS allows only explicitly configured trusted origins.
* Secrets are loaded through appropriate configuration.
* Production configuration fails safely when essential secrets are missing.

If authentication or RBAC remains incomplete, implement the necessary missing controls without creating a second authentication system.

Do not expose tokens or session secrets in browser storage, logs, or API responses unnecessarily.

## 4. FILE UPLOAD AND DOCUMENT SECURITY

Review the complete upload-to-preview lifecycle.

Verify:

* Upload size limits.
* Actual file-content validation.
* Extension and MIME consistency.
* Empty and malformed file handling.
* Safe storage outside publicly accessible directories.
* Generated storage keys.
* Path traversal protections.
* Safe file downloads.
* Content-Disposition handling.
* Appropriate content types and `X-Content-Type-Options`.
* Duplicate-document handling.
* Cleanup after failed uploads.
* Access control on every document endpoint.
* Safe handling of encrypted or malformed PDFs.
* Resource limits for OCR and PDF processing.

Do not trust filenames, client-provided MIME types, or extracted document content.

Ensure that a user cannot access another application's documents simply by changing a document ID.

Keep the existing supported file types unless a documented requirement justifies a change.

## 5. DATA PRIVACY AND AUDITABILITY

Review the handling of institutional information and document contents.

Ensure:

* Sensitive information is not unnecessarily exposed.
* API responses return only required fields.
* Passwords, tokens, and secrets never appear in logs.
* Errors do not reveal absolute paths or internal configuration.
* Audit events do not unnecessarily duplicate document contents.
* Report generation respects authorization.
* Uploaded documents are not sent to external AI services unless explicitly configured and permitted.
* Synthetic demo data is distinguishable from real institutional data.

Document data retention and deletion behavior where supported.

Do not claim legal or regulatory compliance without the necessary evidence and review.

## 6. DATABASE AND MIGRATION RELIABILITY

Inspect SQLAlchemy transactions, SQLite configuration, foreign keys, migrations, and query patterns.

Verify:

* Foreign-key enforcement.
* Transaction rollback behavior.
* Referential integrity.
* Migration ordering.
* Migration upgrade behavior.
* Reversibility where practical.
* Safe initialization of a fresh database.
* Idempotent seed operations.
* Concurrent-write behavior.
* Consistency of workflow, validation, analysis, and audit records.

Add missing indexes where justified by real query patterns.

Do not destructively recreate a database containing user data.

Do not introduce a new database engine merely for theoretical scalability.

Document SQLite limitations relevant to concurrent workloads and deployment.

## 7. PERFORMANCE OPTIMIZATION

Profile or inspect actual bottlenecks before optimizing.

Focus on:

* Slow API endpoints.
* Repeated database queries.
* Unnecessary document reads.
* Repeated OCR execution.
* Duplicate validation or anomaly-analysis work.
* Large API responses.
* Unbounded audit-history queries.
* Frontend bundle size.
* Unnecessary component re-rendering.
* Excessive polling or redundant API requests.

Apply targeted improvements such as:

* Appropriate database indexes.
* Pagination.
* Avoiding N+1 query patterns.
* Reusing valid extraction results.
* Efficient document streaming.
* Frontend query caching.
* Appropriate loading states.
* Avoiding duplicate processing requests.

Do not add caching that could return stale security-sensitive or validation data without a clear invalidation strategy.

Do not invent performance benchmarks. Measure performance where practical and report the methodology and actual results.

## 8. CONFIGURATION AND DEPLOYMENT

Review the existing deployment architecture.

Create or refine environment-based configuration for:

* Application environment.
* Database location.
* Private upload-storage location.
* Authentication secrets.
* Trusted frontend origins.
* File-size limits.
* Processing limits.
* Logging levels.
* Optional AI-provider settings.

Requirements:

* Provide a safe example environment file containing placeholders only.
* Never commit actual credentials or production secrets.
* Verify `.gitignore` excludes local secrets, virtual environments, uploaded files, databases, and build artifacts as appropriate.
* Keep development defaults convenient without weakening production security.
* Provide clear startup and deployment documentation.
* Ensure frontend API configuration works in the intended deployment.
* Avoid unnecessary infrastructure.

If containerization is appropriate for the existing architecture, implement it only when it materially improves reproducibility. Do not introduce Docker or orchestration solely for appearance.

Do not deploy publicly, purchase services, create external accounts, or expose sensitive endpoints without explicit authorization.

## 9. ERROR HANDLING AND OBSERVABILITY

Implement consistent error handling across backend services.

Ensure:

* Expected validation errors produce useful responses.
* Unexpected exceptions are logged safely.
* Internal stack traces are not returned to ordinary clients in production.
* Processing failures remain visible.
* Health checks distinguish basic API availability from database readiness where appropriate.
* Logs include useful context without unnecessary sensitive information.
* Workflow and processing failures can be diagnosed.

Do not report a service as healthy if a required dependency is unavailable.

Avoid logging full documents, passwords, authentication tokens, or unnecessary personal information.

## 10. FRONTEND RELIABILITY

Inspect the React, Vite, and TypeScript frontend.

Fix:

* Broken navigation.
* Missing loading states.
* Unhandled API errors.
* Incorrect authentication redirects.
* Broken document previews.
* Failed report downloads.
* Stale data after mutations.
* Unresponsive layouts.
* Inaccessible form controls.
* Misleading empty states.
* Unsupported or fabricated metrics.

Preserve the VerityAI design system:

* Lavender `#CBB3E8`.
* Pale purple `#F3EEFC` and `#FAF8FF`.
* Primary purple `#7450D8`.
* Tomato red `#F04438` and `#E34234`.
* Deep navy `#171B45`.
* Inter typography.

Reference images remain visual inspiration only. Do not replace the institutional scrutiny architecture with generic cloud-storage workflows.

## 11. DEPENDENCY AND CODE QUALITY REVIEW

Inspect backend and frontend dependencies.

* Identify outdated or vulnerable packages.
* Use supported, compatible versions.
* Remove dependencies that are genuinely unused and safe to remove.
* Avoid unnecessary upgrades that break working integrations.
* Resolve linting, type-checking, and static-analysis failures where suitable tools already exist.
* Add lightweight checks only where they provide real value.
* Avoid installing redundant libraries for functionality already available in the project.

Do not claim that all dependencies are vulnerability-free unless the checks support that conclusion.

## 12. TESTING — MANDATORY

Expand automated coverage for security-critical behavior.

Test:

* Authentication and authorization.
* Role escalation attempts.
* Cross-application document access.
* Unauthorized report downloads.
* CSRF and CORS behavior.
* Invalid uploads.
* Oversized uploads.
* Malformed documents.
* Path traversal attempts.
* Unsafe download headers.
* Input validation.
* Error handling.
* Database integrity.
* Migration behavior.
* Repeated workflow requests.
* Validation and anomaly-processing failures.
* Sensitive information exposure.
* Frontend production build.
* Existing end-to-end workflows.

Use synthetic fixtures and isolated test databases.

Do not use destructive operations against user data or production systems.

Run the full existing backend test suite and frontend production build. Run additional security or static-analysis checks when suitable tools are available.

Fix regressions introduced by the changes.

Report exactly which checks ran, which passed, and which remain unavailable.

## 13. DEMONSTRATION READINESS

Prepare a reliable SIH 2026 demonstration workflow.

Ensure the application can demonstrate, using synthetic data:

1. User authentication, where implemented.
2. Institutional application creation.
3. Supporting-document upload.
4. Text extraction and OCR.
5. Deterministic validation.
6. Anomaly detection.
7. Evidence inspection.
8. Human-review actions.
9. Workflow status changes.
10. Scrutiny report generation.
11. Audit-trail inspection.

Provide or update a repeatable demo-data setup that does not overwrite existing user data.

Ensure the demo does not depend on an external AI provider unless one is genuinely configured.

Clearly identify synthetic records and any simulated integrations.

Do not create fake validation outcomes to make the demonstration appear successful.

## 14. DOCUMENTATION AND GIT

Update:

* `docs/PROJECT_STATUS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`

Add or update deployment and troubleshooting documentation as needed.

Document:

* Security findings and fixes.
* Remaining risks.
* Configuration requirements.
* Deployment assumptions.
* Database limitations.
* Performance changes and measured results.
* Demo setup and workflow.
* Tests actually executed.

Follow `AGENTS.md` for Git operations.

Preserve user changes and existing history. Create a focused milestone commit only if permitted and after the relevant checks pass.

## 15. DEFINITION OF DONE

Phase 10 is complete only when:

1. A documented security review has been performed.
2. Verified critical and high-priority issues within scope have been addressed or explicitly documented with justified blockers.
3. Authentication and authorization controls have been tested.
4. File-storage and document-access protections have been tested.
5. Database integrity and migration behavior have been verified.
6. Performance improvements are evidence-based.
7. Configuration and deployment instructions are documented.
8. Error handling and health checks behave correctly.
9. The core demonstration workflow operates using synthetic data.
10. Existing application functionality remains operational.
11. The backend test suite and frontend production build pass.
12. Remaining risks and unverified areas are clearly disclosed.
13. Documentation is updated.
14. A Git checkpoint is created if permitted.

## 16. FINAL REPORT

Provide:

* Security findings identified.
* Fixes implemented.
* Remaining risks.
* Performance improvements and actual measurements, if obtained.
* Configuration and deployment changes.
* Database changes.
* Tests and their exact results.
* Frontend build result.
* Demo workflow verification.
* Git commit hash, if created.

Begin by inspecting the actual repository. Verify prerequisites, implement Phase 10, run the checks, and report only verified outcomes.
