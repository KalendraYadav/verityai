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




# PHASE 11 — EXTENDED VERIFICATION & REGISTRY INTEGRATION

## Project: VerityAI / EntityLocker — SIH 2026

Act as a senior integration architect, regulatory-data engineer, backend developer, security engineer, and React/TypeScript developer.

Implement Phase 11 end-to-end in the existing VerityAI repository. Inspect the actual project, reuse existing functionality, implement the required features, run the tests, fix regressions, update documentation, and create a Git checkpoint if permitted.

Work autonomously on routine tasks. Do not stop after creating a plan. Never claim an external integration works unless it has genuinely been configured and tested.

## 1. INSPECT THE PROJECT

Read:

* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/PROJECT_STATUS.md`
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Inspect the actual models, migrations, application workflow, validation engine, extracted fields, anomaly detection, authentication, audit logging, and report-generation implementation.

The latest reported checkpoint is `7f5b2f1`, with 92 backend tests passing and the frontend production build succeeding. Verify the current repository rather than assuming this report is current.

The project currently uses SQLite and local document storage. It is a prototype and is not connected to production AICTE databases or state revenue portals.

Preserve user changes, existing data, API contracts, and Git history.

## 2. OBJECTIVE

Implement an extensible registry-verification layer that compares institution and application information against configurable reference records.

The system should support:

* Institution identity checks.
* AISHE or other configured identifier comparisons.
* Institution-name comparisons.
* Location and jurisdiction comparisons where relevant.
* Application reference verification when corresponding reference data exists.
* Registration and affiliation identifier checks where supported.
* Registry-record provenance and freshness.
* Explainable discrepancies with evidence.
* Human review of uncertain or conflicting results.

Do not invent registry records or claim official verification when using synthetic data.

## 3. REGISTRY ADAPTER ARCHITECTURE

Create a registry-provider interface that separates verification logic from any particular data source.

Support the following provider capabilities where appropriate:

* Search by institution identifier.
* Search by normalized institution name.
* Retrieve a reference record.
* Return source metadata and retrieval timestamps.
* Report unavailable or incomplete reference data.

Implement a local synthetic registry provider for the prototype.

Use explicit provider configuration and a consistent result schema.

A future authorized official provider should be addable without rewriting the core verification engine.

Do not scrape restricted portals, bypass access controls, or invent unofficial APIs.

Do not require network access for the local registry provider.

## 4. REFERENCE RECORD MODEL

Inspect the existing schema before adding models.

Implement appropriate records for:

* Registry provider.
* Registry reference record.
* Record source and provenance.
* Retrieval or import timestamp.
* External reference identifier.
* Verification execution.
* Verification result.
* Evidence and discrepancy details.

Use SQLAlchemy 2.x and Alembic migrations.

Avoid storing duplicate institution data unnecessarily.

Track source and freshness so a reviewer can distinguish current reference data from stale or unverified data.

Preserve historical verification outcomes where appropriate.

Do not destructively recreate existing database tables.

## 5. REGISTRY DATA IMPORT

Implement a safe import mechanism for authorized registry datasets.

Support a documented CSV or JSON format where appropriate.

Requirements:

* Validate the file structure and required fields.
* Validate identifier formats.
* Reject malformed records with actionable errors.
* Detect duplicate identifiers.
* Report import counts and rejected records.
* Prevent partial imports from leaving inconsistent state.
* Support safe repeat imports.
* Track source, import timestamp, and dataset version.
* Avoid logging sensitive record contents unnecessarily.

Use only synthetic data for the default demonstration.

Do not download or claim to possess official institutional datasets unless they are actually available and authorized.

## 6. VERIFICATION ENGINE

Implement deterministic comparisons using explicit normalization and matching rules.

Support:

* Exact identifier matches.
* Carefully normalized institution-name comparisons.
* Location comparisons where source data supports them.
* Missing reference records.
* Conflicting reference records.
* Stale reference data.
* Incomplete source records.
* Ambiguous matches requiring human review.

Use a consistent result vocabulary, such as:

* `MATCH`
* `MISMATCH`
* `NOT_FOUND`
* `AMBIGUOUS`
* `STALE_REFERENCE`
* `INSUFFICIENT_DATA`
* `PROVIDER_UNAVAILABLE`

Reuse the project's established vocabulary if equivalent states already exist.

Every result must explain:

* What was compared.
* Which source record was used.
* Which values matched or differed.
* When the source data was last updated.
* Why the result received its status.
* Whether further human verification is necessary.

Do not treat a missing reference record as proof of fraud.

Do not automatically reject an application because of a mismatch.

## 7. EVIDENCE AND AUDITABILITY

Connect registry-verification results to:

* The relevant application.
* The institution record.
* The compared extracted or declared fields.
* The registry provider and reference record.
* Existing validation results and anomalies, where relevant.

Record meaningful audit events for:

* Registry imports.
* Verification execution.
* Verification failure.
* Reference-data updates.
* Reviewer resolution of discrepancies.

Avoid duplicating full documents or unnecessary personal data.

Preserve enough provenance to reproduce and explain a verification result.

## 8. API ENDPOINTS

Follow the existing API conventions and use `/api/v1/`.

Implement equivalent endpoints where needed for:

* Listing available registry providers.
* Importing an authorized reference dataset.
* Searching registry records.
* Triggering application registry verification.
* Retrieving verification results.
* Retrieving discrepancy details.
* Reviewing and resolving a discrepancy.

Possible route patterns include:

* `GET /api/v1/registry/providers`
* `POST /api/v1/registry/imports`
* `GET /api/v1/registry/records`
* `POST /api/v1/applications/{application_id}/registry-verification`
* `GET /api/v1/applications/{application_id}/registry-verification`
* `GET /api/v1/registry-verification/{result_id}`

Adapt these routes to the actual existing contract. Do not create duplicate endpoints.

Enforce authentication and role-based authorization for sensitive operations.

Validate inputs, paginate large results, and return consistent errors.

## 9. FRONTEND INTEGRATION

Integrate registry verification into the existing VerityAI application.

Extend the application scrutiny workspace to show:

* Verification status.
* Reference source.
* Identifier and name comparisons.
* Data freshness.
* Discrepancies.
* Uncertain matches.
* Evidence and source timestamps.
* Required reviewer actions.

Add registry administration or import controls only where authorized.

Clearly label synthetic registry data as demonstration data.

Show an explicit unavailable state when an official provider is not configured.

Do not use fabricated success results or claim that an institution has been verified by AICTE.

Preserve the existing lavender, pale-purple, tomato-red, deep-navy, white, and Inter design system.

## 10. SECURITY

Protect registry import and administration endpoints.

Prevent:

* Unauthorized reference-data modification.
* Unsafe file parsing.
* Injection through imported records.
* Cross-application data exposure.
* Leakage of sensitive data in errors or logs.
* Unrestricted external requests.

Do not create arbitrary outbound network connections to registry URLs supplied by users.

If an external provider is implemented in the future, require explicit trusted configuration, timeouts, TLS verification, response-size limits, and appropriate access controls.

## 11. TESTING

Add tests for:

* Exact identifier matches.
* Name normalization.
* Identifier mismatches.
* Missing reference records.
* Ambiguous matches.
* Stale reference data.
* Incomplete records.
* Provider unavailability.
* Invalid CSV and JSON imports.
* Duplicate identifiers.
* Safe repeat imports.
* Transaction rollback on failed imports.
* Evidence provenance.
* Authorization restrictions.
* Audit-event creation.
* API error handling.
* Database migrations.
* Regression coverage for existing validation, workflow, and report generation.

Use synthetic fixtures and temporary databases.

Do not require access to official portals or external networks for the core tests.

Run the full backend test suite and frontend production build. Fix implementation-related failures before declaring completion.

## 12. DOCUMENTATION AND GIT

Update:

* `docs/PROJECT_STATUS.md`
* `docs/ARCHITECTURE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Document:

* Provider architecture.
* Import format.
* Reference-data provenance.
* Matching rules.
* Verification result semantics.
* Security constraints.
* Synthetic-data limitations.
* Actual test results.

Follow `AGENTS.md` for Git operations. Preserve existing history and user changes. Create a focused commit only if permitted and after relevant checks pass.

## 13. DEFINITION OF DONE

Phase 11 is complete only when:

1. A registry-provider interface exists.
2. The local synthetic provider works end-to-end.
3. Reference data can be imported and validated safely.
4. Registry comparisons use actual stored data.
5. Results include source provenance and explanations.
6. Ambiguous and unavailable cases are represented honestly.
7. Verification results are accessible through the API and frontend.
8. Sensitive operations enforce authorization where supported.
9. Audit events are recorded.
10. Existing functionality remains operational.
11. Backend tests and frontend production build pass.
12. Documentation is updated.
13. The execution ledger reflects the verified outcome.

## 14. FINAL REPORT

Report:

* Features implemented.
* Registry-provider architecture.
* Import format and safeguards.
* Database migrations.
* API endpoints.
* Frontend changes.
* Actual test results.
* Build result.
* Git commit hash, if created.
* Remaining limitations.

Begin by inspecting the repository and implementing Phase 11 end-to-end.





# PHASE 12 — ADVANCED MULTILINGUAL DOCUMENT SCRUTINY

## Project: VerityAI / EntityLocker — SIH 2026

Act as a senior document-AI engineer, multilingual NLP specialist, OCR architect, Python backend developer, and React/TypeScript engineer.

Implement Phase 12 end-to-end in the existing VerityAI repository. Inspect the actual code, reuse existing services, implement the required functionality, run tests, fix regressions, update documentation, and create a Git checkpoint if permitted.

Work autonomously on routine implementation tasks. Do not stop after writing a plan. Never claim a language, OCR engine, or translation provider works unless its functionality has been genuinely tested.

## 1. INSPECT THE PROJECT FIRST

Read:

* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/PROJECT_STATUS.md`
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Inspect the existing document-processing pipeline, PyMuPDF extraction, RapidOCR integration, page-level evidence storage, candidate field extraction, validation engine, anomaly detection, registry verification, reports, authentication, and frontend document viewer.

Verify which features actually exist. Complete missing prerequisites where necessary without rebuilding working functionality.

Preserve existing data, migrations, API contracts, and user changes.

## 2. OBJECTIVE

Extend VerityAI to support multilingual institutional documents commonly encountered in Indian regulatory workflows.

The system should help reviewers process documents containing English and supported Indian languages, including mixed-language documents.

Prioritize practical prototype support for:

* English.
* Hindi.
* Other Indian languages only when a compatible, tested OCR or language-processing capability is available.

Do not claim universal support for every Indian language.

Support language detection, multilingual text extraction, normalized candidate fields, source-linked evidence, and reviewer-friendly presentation.

**Preserve the original document text. Translation or normalization must never silently replace the original evidence.**

## 3. LANGUAGE DETECTION

Implement a language-identification service that can classify extracted text at document or page level when sufficient evidence exists.

Requirements:

* Distinguish detected language from configured document expectations.
* Support mixed-language pages where practical.
* Return an explicit unknown or uncertain state when the available text is insufficient.
* Avoid treating a few names, identifiers, numbers, or short fragments as reliable language evidence.
* Record the detection method and relevant metadata.
* Keep the service modular so additional language detectors can be added later.

Do not fabricate language confidence scores.

If a genuine confidence score is unavailable, omit it or explicitly mark it unavailable.

## 4. MULTILINGUAL OCR AND TEXT EXTRACTION

Extend the existing extraction architecture without breaking its current digital-PDF and OCR fallback behavior.

Requirements:

* Continue using PyMuPDF for digital PDF text extraction where appropriate.
* Reuse the existing OCR engine when it genuinely supports the target script.
* Inspect the installed OCR engine and available language models before enabling a language.
* Support scanned PDFs and images in supported languages.
* Handle mixed-script pages where feasible.
* Preserve page order and page-level text.
* Store extraction method and processing status.
* Handle unsupported scripts, malformed files, empty pages, and OCR failures safely.
* Avoid repeated OCR when valid extraction results already exist.

If the current RapidOCR configuration cannot reliably process a target language, implement an appropriate optional OCR adapter or report that language as unsupported.

Do not label a language as supported merely because its text can be uploaded.

Do not download large models or add expensive dependencies without evaluating compatibility and resource requirements.

## 5. ORIGINAL TEXT AND NORMALIZED TEXT

Preserve distinct representations for:

1. Original extracted text.
2. Normalized text used for matching.
3. Candidate structured field values.
4. Optional translated text.
5. Human-reviewed corrections.

Normalization must be language-aware where necessary.

Handle:

* Unicode normalization.
* Devanagari and other supported scripts.
* Whitespace and line breaks.
* Common OCR character confusions.
* Numeral normalization where safe.
* Mixed Latin and native-script identifiers.
* Punctuation and separators.

Do not discard diacritics, meaningful characters, or identifier distinctions without an explicit reason.

Preserve original values for evidence and auditability.

Do not automatically replace ambiguous OCR characters with guessed values.

## 6. MULTILINGUAL FIELD EXTRACTION

Extend the existing candidate-field extraction pipeline.

Support configured multilingual aliases for applicable fields, such as:

* Institution name.
* Institution identifier.
* Application reference.
* Academic year.
* Intake or capacity.
* Dates.
* Registration identifiers.
* Issuing authority.

Use explicit dictionaries, configurable patterns, and language-specific parsers where practical.

Do not assume that a particular translated label is universally used across Indian institutions.

Allow aliases to be configured and tested.

Each candidate field must retain:

* Original extracted value.
* Normalized value, if available.
* Language metadata, if known.
* Source document ID.
* Page number.
* Extraction method.
* Confidence only when genuinely available.
* Review status where applicable.

Do not invent missing field values.

## 7. OPTIONAL TRANSLATION ADAPTER

Create a modular translation interface only if it materially helps reviewer comprehension.

The core application must continue working without an external translation provider.

Requirements:

* Preserve the original text.
* Mark translated content clearly as a translation.
* Identify the provider and translation timestamp when available.
* Handle unavailable providers and translation failures.
* Never treat translated text as the authoritative source.
* Never silently overwrite extracted evidence.
* Avoid sending sensitive documents to external providers unless explicitly configured and permitted.
* Treat extracted document contents as untrusted input.
* Do not fabricate translation quality or confidence metrics.

If no real translation provider is configured, display the translation capability as unavailable or not configured.

Do not build a fake translation feature that simply copies the original text and labels it translated.

## 8. VALIDATION AND ANOMALY DETECTION INTEGRATION

Integrate multilingual candidate fields with the existing deterministic validation and anomaly-detection services.

Requirements:

* Preserve the existing rule engine.
* Use explicit, tested normalization before comparisons.
* Compare identifiers carefully across scripts and numeral systems.
* Avoid declaring mismatches solely because equivalent text uses different scripts or harmless formatting.
* Do not perform unsafe transliteration that changes identifier meaning.
* Distinguish a genuine mismatch from uncertain OCR.
* Flag ambiguous comparisons for human review.
* Preserve source document and page evidence.

For institution-name comparisons, use transparent normalization and, if justified, a configurable similarity strategy.

Do not treat a fuzzy name match as definitive proof of institutional identity.

Do not automatically approve or reject an application because of multilingual processing results.

## 9. DATA MODEL AND MIGRATIONS

Inspect the existing schema before changing it.

Add only the metadata required to represent:

* Detected language.
* Extraction language or script configuration.
* Language-processing method.
* Optional translation records.
* Normalization metadata.
* Processing warnings.
* Reviewer corrections, where appropriate.

Reuse existing page and processing-run records whenever possible.

Use SQLAlchemy 2.x and Alembic.

Preserve historical extraction evidence where appropriate.

Do not destructively recreate existing tables or erase previously extracted text.

## 10. API ENDPOINTS

Follow `docs/DATA_MODEL_AND_API.md` and existing API conventions.

Use `/api/v1/`.

Implement equivalent endpoints where necessary for:

* Retrieving language metadata.
* Retrieving multilingual extraction details.
* Requesting supported-language reprocessing.
* Retrieving normalized candidate fields.
* Requesting optional translation.
* Recording authorized human corrections.

Suggested endpoint shapes:

* `GET /api/v1/documents/{document_id}/languages`
* `GET /api/v1/documents/{document_id}/extracted-fields`
* `POST /api/v1/documents/{document_id}/reprocess`
* `POST /api/v1/documents/{document_id}/translate`

Adapt these to the existing API contract. Do not duplicate existing endpoints.

Validate supported languages, request sizes, identifiers, and permissions.

Return honest errors when a requested language or provider is unsupported.

Protect document content using existing authentication and authorization.

## 11. FRONTEND INTEGRATION

Extend the existing document viewer and application scrutiny workspace.

Provide:

* Detected language labels.
* Page-level original extracted text.
* Script-aware text rendering.
* Clear extraction warnings.
* Normalized candidate-field views.
* Optional translated text, when genuinely available.
* A visible distinction between original and translated content.
* Links to source documents and pages.
* Review indicators for uncertain extraction.
* A clear unsupported-language state.

Ensure appropriate Unicode font support and readable rendering for Hindi and other enabled scripts.

Use responsive layouts and accessible controls.

Preserve the existing VerityAI visual design:

* Lavender `#CBB3E8`.
* Pale purple `#F3EEFC` and `#FAF8FF`.
* Primary purple `#7450D8`.
* Tomato red `#F04438` and `#E34234`.
* Deep navy `#171B45`.
* Inter typography.

Do not invent translation results, language confidence scores, or OCR accuracy percentages.

## 12. SECURITY, PERFORMANCE, AND PRIVACY

Ensure:

* Document access remains protected.
* Uploaded content is treated as untrusted.
* OCR and processing have appropriate resource limits.
* Large PDFs cannot cause unbounded processing.
* Optional providers use timeouts and bounded requests.
* Sensitive document content is not sent externally without explicit configuration and permission.
* Language metadata and translations do not leak data across applications.
* Temporary files are cleaned up.
* Logs do not unnecessarily expose document contents.

Do not add external network dependencies to the core processing path.

## 13. TESTING — MANDATORY

Add tests for:

* English digital PDFs.
* Hindi digital PDFs where supported.
* Scanned documents in genuinely supported languages.
* Mixed-script documents.
* Unicode normalization.
* Native-script numerals.
* Identifiers containing Latin and native-script characters.
* Unknown language detection.
* Insufficient text for language identification.
* Unsupported languages.
* Malformed documents.
* Empty and low-quality OCR output.
* Multilingual candidate-field extraction.
* Cross-language field comparison.
* False mismatch prevention.
* Uncertain extraction requiring review.
* Translation-provider unavailability.
* Prevention of false translation output.
* Access-control enforcement.
* Processing idempotency.
* Database migration behavior.
* Existing extraction, validation, anomaly, and report regressions.

Use synthetic documents and fixtures.

Tests must not depend on external translation APIs or paid AI services.

Run the complete backend test suite and frontend production build. Fix regressions introduced by this phase.

Report actual results only.

## 14. DOCUMENTATION AND GIT

Update:

* `docs/PROJECT_STATUS.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/ARCHITECTURE.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Document:

* Languages genuinely supported.
* OCR engine and model limitations.
* Detection and normalization behavior.
* Translation-provider configuration.
* Privacy safeguards.
* API changes.
* Database migrations.
* Test results.
* Known limitations.

Follow `AGENTS.md` for Git operations. Preserve existing history and user changes. Create a focused milestone commit only if permitted and after the relevant checks pass.

## 15. DEFINITION OF DONE

Phase 12 is complete only when:

1. Language detection behaves correctly for supported inputs.
2. Supported multilingual documents can be processed using genuine compatible extraction capabilities.
3. Original extracted text is preserved.
4. Normalized fields remain traceable to their source pages.
5. Existing validation and anomaly detection can use multilingual fields safely.
6. Unsupported languages and uncertain OCR are represented honestly.
7. Optional translation works only when a genuine provider is available.
8. The frontend presents multilingual evidence clearly.
9. Security, privacy, and processing limits are maintained.
10. Existing functionality remains operational.
11. Backend tests and frontend production build pass.
12. Documentation and the execution ledger are updated.
13. A Git checkpoint is created if permitted.

## 16. FINAL REPORT

Report:

* Languages actually supported and tested.
* OCR engines and adapters used.
* Normalization and field-extraction features implemented.
* Translation-provider status.
* Database and API changes.
* Frontend changes.
* Actual test results.
* Frontend build result.
* Git commit hash, if created.
* Remaining limitations.

Begin by inspecting the actual repository. Implement Phase 12 end-to-end, verify every supported language honestly, and report only confirmed results.







# PHASE 13 — INSTITUTIONAL DOSSIER HISTORY & VERSIONING

## Project: VerityAI / EntityLocker — SIH 2026

Act as a senior software architect, database engineer, document-management specialist, auditability engineer, and React/TypeScript developer.

Implement Phase 13 end-to-end in the existing VerityAI repository. Inspect the actual code, reuse existing functionality, implement the required features, run tests, fix regressions, update documentation, and create a Git checkpoint if permitted.

Work autonomously on routine tasks. Do not stop after producing a plan. Never claim historical records are immutable or tamper-proof unless the implementation genuinely provides those guarantees.

## 1. INSPECT THE PROJECT FIRST

Read:

* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/PROJECT_STATUS.md`
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Inspect the actual implementations of:

* Application and institution records.
* Document storage and upload.
* Document extraction and page-level evidence.
* Validation rules and results.
* Anomaly findings and review outcomes.
* Registry verification, if implemented.
* Workflow state transitions.
* Authentication and authorization.
* Audit events.
* Scrutiny report generation.
* Multilingual extraction, if implemented.

Verify the actual repository state. Complete any missing prerequisite that directly blocks this phase without rebuilding completed functionality.

Preserve existing data, migrations, API contracts, Git history, and user changes.

## 2. OBJECTIVE

Implement a traceable version-history system for institutional applications and their supporting scrutiny evidence.

Authorized users should be able to determine:

* What changed.
* When it changed.
* Who performed the change, when authenticated identity is available.
* Which application or document version was affected.
* Which validation results and findings correspond to a particular version.
* Whether a previous scrutiny report is outdated.
* How the application evolved throughout its review lifecycle.

The goal is **reliable historical traceability**, not an unsupported claim of legal-grade immutability.

## 3. APPLICATION VERSIONING

Inspect the current application model and update operations.

Implement version tracking for meaningful application changes, such as:

* Institution metadata.
* Application category and academic year.
* Declared intake and other relevant declared fields.
* Supporting-document associations.
* Submission and workflow transitions.
* Deficiency responses and corrections.
* Reviewer decisions.

Requirements:

* Assign a monotonically increasing version number per application, or use an equally clear documented versioning strategy.
* Capture the relevant changed fields.
* Record the timestamp.
* Record the actor where available.
* Associate the change with the relevant application.
* Preserve previous versions.
* Avoid creating duplicate versions for unchanged data.
* Ensure concurrent updates cannot silently overwrite each other.
* Use database transactions for consistent version creation.

Do not version every read request.

Do not fabricate historical records for changes that were never recorded.

## 4. DOCUMENT VERSIONING

Extend the existing secure document workflow to support document revisions.

Requirements:

* Preserve the original uploaded document.
* Allow a new revision to be associated with an existing logical document where appropriate.
* Preserve the relationship between an application, logical document, and individual revisions.
* Record content hashes, upload timestamps, and the authenticated uploader where available.
* Maintain the existing upload size, MIME, magic-byte, and storage-path protections.
* Avoid overwriting the original file during revision uploads.
* Distinguish a new revision from an unrelated document.
* Preserve the extraction and processing history associated with each revision.

Use SHA-256 hashes or the existing content-hash mechanism to identify identical file contents.

Identical content should not automatically create unnecessary duplicate revisions.

Document how revision numbering and the current revision are determined.

## 5. VERSION-SPECIFIC VALIDATION AND FINDINGS

Ensure historical validation results and anomaly findings remain associated with the correct source versions.

When an application or supporting document changes:

* Identify which previous results may be stale.
* Mark affected current results as requiring reevaluation where appropriate.
* Preserve historical results.
* Do not silently rewrite historical evidence.
* Do not treat a result calculated against an older document revision as a result for the latest revision.
* Record the source application version and document revision when supported by the architecture.

Reevaluation must use the existing validation and analysis services.

Do not duplicate their business logic.

Clearly distinguish:

* Current results.
* Historical results.
* Superseded results.
* Results requiring reevaluation.

## 6. REPORT VERSIONING

Integrate versioning with the existing scrutiny dossier report generator.

Requirements:

* Associate each generated report with the application version and relevant document revisions used to produce it.
* Record the report-generation timestamp.
* Preserve previously generated reports where retention policy allows.
* Identify whether a report reflects the latest application and evidence versions.
* Clearly label historical reports.
* Avoid silently replacing a previously generated report with a new one.
* Ensure report downloads respect existing access controls.

If a report references source records that have since changed, make its historical status clear.

Do not claim that a report is a signed or immutable official certificate.

## 7. HISTORY AND COMPARISON SERVICE

Implement a dedicated service for retrieving version history and comparing versions.

Provide:

* Chronological application history.
* Document revision history.
* Field-level application differences.
* Document additions and removals.
* Workflow-state changes.
* Validation-result changes.
* Anomaly-status changes.
* Reviewer-decision history.
* Report-generation history.

Comparison output should identify:

* Previous value.
* Current value.
* Change timestamp.
* Actor, when available.
* Relevant version identifiers.
* Associated evidence or event references.

Avoid exposing unnecessary personal information.

For binary documents, compare content hashes and metadata rather than attempting to display meaningless binary diffs.

## 8. DATABASE DESIGN AND MIGRATIONS

Inspect the current schema before introducing new tables.

Reuse the existing audit-event and processing-history models wherever appropriate.

Add the minimum required structures for:

* Application versions.
* Document revisions.
* Version relationships.
* Source-version references on validation or analysis results, where needed.
* Report-version metadata.
* Change summaries.

Use SQLAlchemy 2.x and Alembic.

Requirements:

* Preserve existing records.
* Maintain foreign-key integrity.
* Use appropriate indexes.
* Support transactional version creation.
* Handle migration upgrades safely.
* Provide reversibility where practical.
* Avoid storing duplicate full documents or extracted text unnecessarily.

Do not destructively recreate existing database tables.

Do not pretend that preexisting records have a complete historical version history if they were never versioned.

Document the baseline-version strategy for records created before this feature.

## 9. API ENDPOINTS

Follow `docs/DATA_MODEL_AND_API.md` and existing route conventions.

Use `/api/v1/`.

Implement equivalent functionality where needed for:

* Application version history.
* Application version details.
* Version-to-version comparisons.
* Document revision history.
* Document revision metadata.
* Historical validation results.
* Historical anomaly findings.
* Report history.
* Historical report downloads.

Suggested route patterns:

* `GET /api/v1/applications/{application_id}/versions`
* `GET /api/v1/applications/{application_id}/versions/{version_number}`
* `GET /api/v1/applications/{application_id}/versions/compare`
* `GET /api/v1/documents/{document_id}/versions`
* `GET /api/v1/applications/{application_id}/reports`

Adapt routes to the existing contract and avoid duplicate endpoints.

Requirements:

* Validate all identifiers.
* Apply authentication and authorization.
* Restrict access to records the current user may view.
* Use pagination for large histories.
* Return consistent errors.
* Do not expose internal storage paths or secrets.

## 10. FRONTEND INTEGRATION

Extend the existing application scrutiny workspace with a History and Versions experience.

Display:

* Application version number.
* Version timestamp.
* Actor where available.
* Changed fields.
* Document revisions.
* Workflow transitions.
* Validation and anomaly history.
* Reviewer decisions.
* Historical scrutiny reports.
* Indicators that previous results are stale or superseded.

Allow authorized reviewers to compare two application versions.

Use readable field-level differences rather than dumping raw JSON.

Make it clear which information is current and which belongs to a previous version.

Add revision history to the document inspection experience where appropriate.

Preserve the existing VerityAI design system:

* Lavender `#CBB3E8`.
* Pale purple `#F3EEFC` and `#FAF8FF`.
* Primary purple `#7450D8`.
* Tomato red `#F04438` and `#E34234`.
* Deep navy `#171B45`.
* Inter typography.

Do not introduce fabricated historical events or pretend that unrecorded changes can be reconstructed.

## 11. SECURITY AND INTEGRITY

Ensure:

* Only authorized users can access version history.
* Historical documents retain existing access controls.
* Users cannot modify historical records through ordinary update endpoints.
* Revision uploads cannot overwrite previous files.
* Version comparisons do not expose other applications' data.
* Historical reports are protected.
* Audit logs do not expose unnecessary sensitive content.

Where the existing audit architecture permits, make recorded history append-only through normal application operations.

If administrative database access could modify historical records, do not claim the records are tamper-proof.

Do not introduce complex cryptographic integrity infrastructure unless justified by the actual requirements.

## 12. TESTING — MANDATORY

Add tests for:

* Initial application version creation.
* Version increment after meaningful changes.
* No duplicate version for unchanged data.
* Field-level change history.
* Concurrent update handling.
* Document revision creation.
* Duplicate content detection.
* Preservation of original uploaded files.
* Revision-specific extraction results.
* Historical validation and anomaly results.
* Stale-result detection after source changes.
* Historical report generation and retrieval.
* Report freshness indicators.
* Version comparison correctness.
* Unauthorized history access.
* Cross-application access prevention.
* Database migration behavior.
* Existing upload, validation, workflow, report, and authentication regressions.

Use synthetic fixtures and temporary test databases.

Run the complete backend test suite and frontend production build. Fix regressions introduced by the implementation.

Report actual results only.

## 13. DOCUMENTATION AND GIT

Update:

* `docs/PROJECT_STATUS.md`
* `docs/ARCHITECTURE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Document:

* Application versioning strategy.
* Document revision semantics.
* Historical result handling.
* Report-version relationships.
* Baseline behavior for existing records.
* API changes.
* Access-control behavior.
* Test results.
* Known limitations.

Follow `AGENTS.md` for Git operations.

Preserve existing history and user changes. Create a focused milestone commit only if permitted and after relevant checks pass.

## 14. DEFINITION OF DONE

Phase 13 is complete only when:

1. Meaningful application changes produce traceable versions.
2. Document revisions preserve previous files and metadata.
3. Validation and anomaly results reference the correct source versions where supported.
4. Stale results are identified appropriately.
5. Historical scrutiny reports can be retrieved securely.
6. Version comparison provides accurate field-level differences.
7. The frontend presents current and historical information clearly.
8. Access controls prevent unauthorized history access.
9. Existing records are preserved without fabricated historical data.
10. Backend tests and frontend production build pass.
11. Documentation and the execution ledger are updated.
12. A Git checkpoint is created if permitted.

## 15. FINAL REPORT

Report:

* Application versioning implemented.
* Document revision behavior.
* Historical validation and anomaly handling.
* Report-version integration.
* Database migrations.
* API endpoints.
* Frontend changes.
* Actual test results.
* Frontend build result.
* Git commit hash, if created.
* Remaining limitations.

Begin by inspecting the actual repository. Implement Phase 13 end-to-end and report only verified outcomes.




# PHASE 14 — EXTERNAL REGULATORY PORTAL INTEROPERABILITY

## Project: VerityAI / EntityLocker — SIH 2026

Act as a senior integration architect, API security engineer, regulatory-systems specialist, backend developer, and React/TypeScript engineer.

Implement Phase 14 end-to-end in the existing VerityAI repository. Inspect the actual code, reuse existing functionality, implement required features, run tests, fix regressions, update documentation, and create a Git checkpoint if permitted.

Work autonomously on routine tasks. Do not stop after creating a plan. Never claim that an external portal is integrated unless the integration has genuinely been configured and verified.

## 1. INSPECT THE PROJECT FIRST

Read:

* `AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/PROJECT_STATUS.md`
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Inspect the current registry-provider architecture, registry verification, application workflow, authentication, authorization, document processing, validation, anomaly detection, version history, reports, and audit logging.

Verify which previous-phase features actually exist. Complete necessary prerequisites without rebuilding working functionality.

Preserve existing data, migrations, API contracts, Git history, and user changes.

## 2. OBJECTIVE

Implement a secure, extensible interoperability layer that enables VerityAI to exchange authorized data with external regulatory or institutional systems.

The architecture should support future integrations with relevant systems, potentially including:

* AICTE-related institutional systems.
* Authorized institutional registries.
* State-level institutional or land-record systems, where access is permitted.
* Other approved verification providers.

**The current prototype is not assumed to have access to any official portal, production API, credentials, or institutional dataset.**

Do not bypass authentication, scrape restricted systems, reverse-engineer protected APIs, or claim access that does not exist.

The implementation must provide a functional integration architecture and a testable local demonstration without requiring production credentials.

## 3. PROVIDER ADAPTER ARCHITECTURE

Create or extend a provider-adapter architecture compatible with the registry functionality implemented in Phase 11.

Each provider should implement a documented interface appropriate to its capabilities.

Support:

* Provider identification.
* Capability discovery.
* Request and response validation.
* Institution or application lookup.
* Reference-record retrieval.
* Verification-result normalization.
* Source provenance.
* Retrieval timestamps.
* Provider health or availability status.
* Structured error handling.
* Timeouts and bounded retries.

Reuse the existing registry-provider abstractions if present.

Do not create a competing integration framework that duplicates Phase 11.

Separate provider-specific request formats from VerityAI's internal data model.

## 4. PROVIDER TYPES

Support three clearly distinguished provider categories.

### A. Local demonstration provider

Implement or reuse a synthetic local provider that works without external network access.

It must support realistic test scenarios:

* Successful match.
* Mismatch.
* Missing record.
* Ambiguous result.
* Provider error.
* Incomplete reference data.

Clearly label its records and results as synthetic demonstration data.

### B. Configurable external API provider

Implement a generic external REST API adapter where the project architecture supports it.

Requirements:

* Configurable base URL from trusted application configuration.
* HTTPS required for production integrations.
* TLS certificate verification enabled.
* Connection and response timeouts.
* Bounded response sizes.
* Input and output schema validation.
* Safe authentication configuration.
* Redacted request and response logging.
* Structured provider errors.
* Explicit capability configuration.

Do not permit ordinary users to supply arbitrary URLs that the backend fetches.

Prevent server-side request forgery by restricting outbound destinations to explicitly configured, trusted endpoints. Reject loopback, private, link-local, and metadata-service destinations for public external providers unless an explicitly trusted internal deployment configuration authorizes the intended destination.

Validate redirects and DNS resolution as appropriate to the deployment environment.

Never disable TLS verification to make an integration work.

### C. Future official-provider adapter

Define clear interfaces and configuration requirements for future authorized official integrations.

Do not invent official API endpoints, authentication schemes, response formats, or credentials.

If the actual official API specification is unavailable, implement the adapter interface and document the exact missing requirements.

Do not report this provider as connected.

## 5. CONFIGURATION AND SECRET MANAGEMENT

Implement environment-based configuration for external providers.

Requirements:

* No secrets in source code.
* No production credentials in committed files.
* No credentials in frontend bundles.
* No credentials returned through APIs.
* No credentials in logs or audit messages.
* Clear example configuration containing placeholders only.
* Explicit provider enablement.
* Explicit trusted endpoint configuration.
* Fail-safe behavior when configuration is incomplete.

Do not create external accounts, request paid services, or expose the application publicly.

The system must continue working when every external provider is disabled.

## 6. REQUEST AND RESPONSE NORMALIZATION

Create a normalized internal representation for external verification responses.

Capture relevant information such as:

* Provider identifier.
* Provider record identifier.
* Verification status.
* Returned institution identifiers.
* Institution name and supported metadata.
* Source timestamp.
* Retrieval timestamp.
* Provenance.
* Error or unresolved reason.
* Relevant evidence references.

Reuse existing registry-verification models wherever appropriate.

Distinguish:

* Verified response from an authenticated configured provider.
* Synthetic demonstration result.
* Cached result.
* Stale result.
* Incomplete response.
* Provider unavailable.
* Unverified external assertion.

Do not treat receiving a response from an external endpoint as proof that its contents are authoritative.

Document how the trustworthiness of a provider is established and configured.

## 7. SYNCHRONIZATION AND DATA FRESHNESS

Implement controlled synchronization or lookup workflows appropriate to the existing architecture.

Requirements:

* Avoid unnecessary repeated requests.
* Record when data was retrieved.
* Distinguish fresh data from stale cached data.
* Make cache freshness configurable if caching is implemented.
* Avoid presenting stale results as current verification.
* Handle rate limiting.
* Handle provider timeouts and temporary failures.
* Avoid unbounded retry loops.
* Preserve historical results where required by the versioning architecture.

Do not introduce a complex distributed queue unless actual workload requirements justify it.

If asynchronous synchronization is needed, use a maintainable mechanism compatible with the existing project.

## 8. REGISTRY AND APPLICATION WORKFLOW INTEGRATION

Connect external-provider results to the existing:

* Application records.
* Institution records.
* Registry-verification results.
* Deterministic validation engine.
* Anomaly findings.
* Workflow orchestration.
* Evidence traceability.
* Application version history.
* Scrutiny reports.
* Audit events.

Reuse existing services rather than duplicating verification logic.

When an external result conflicts with an application declaration:

* Preserve both values.
* Record the source and retrieval timestamp.
* Explain the discrepancy.
* Mark uncertain cases for human review.
* Do not automatically reject the application.

When a provider is unavailable, distinguish that condition from a genuine verification mismatch.

Do not allow an external response to silently override declared application data or historical evidence.

## 9. API ENDPOINTS

Follow `docs/DATA_MODEL_AND_API.md` and existing conventions.

Use `/api/v1/`.

Implement equivalent endpoints where needed for:

* Listing configured providers.
* Retrieving provider status.
* Triggering an authorized lookup.
* Retrieving external verification results.
* Viewing synchronization history.
* Inspecting provider capability metadata.

Suggested route patterns:

* `GET /api/v1/integrations/providers`
* `GET /api/v1/integrations/providers/{provider_id}`
* `GET /api/v1/integrations/providers/{provider_id}/status`
* `POST /api/v1/applications/{application_id}/external-verification`
* `GET /api/v1/applications/{application_id}/external-verification`
* `GET /api/v1/integrations/history`

Adapt the routes to the actual project contract.

Do not expose credentials, internal network details, or secret configuration.

Enforce authentication and role-based permissions for administrative and verification actions.

Avoid duplicate endpoints.

## 10. FRONTEND INTEGRATION

Integrate provider status and external verification into the existing VerityAI interface.

Within the application scrutiny workspace, display:

* Provider name.
* Provider type.
* Verification status.
* Retrieval timestamp.
* Source provenance.
* Freshness information.
* Returned identifiers and values.
* Differences from declared information.
* Provider errors.
* Required reviewer actions.

For unavailable or unconfigured providers, display an honest status.

For synthetic providers, display a clear demonstration-data label.

Add provider administration controls only for authorized users and only for functionality that genuinely exists.

Never display a green success state merely because an external request was initiated.

Preserve the existing lavender, pale-purple, tomato-red, deep-navy, white, and Inter design system.

## 11. SECURITY AND AUDITABILITY

Implement appropriate protections for outbound integration requests.

Ensure:

* Trusted endpoints are explicitly configured.
* Production integrations require HTTPS.
* TLS verification remains enabled.
* SSRF protections are applied.
* Response sizes are bounded.
* Timeouts and retries are limited.
* Credentials are redacted.
* External content is treated as untrusted input.
* External responses cannot inject executable content.
* Provider errors do not expose internal infrastructure.
* Users cannot access another application's verification results.

Record meaningful events for:

* Verification initiated.
* Verification completed.
* Provider unavailable.
* Synchronization failed.
* Provider configuration changed.
* Reference data updated.

Do not store complete sensitive external responses in audit logs unnecessarily.

## 12. TESTING — MANDATORY

Add tests covering:

* Local synthetic provider.
* Successful external-provider mock response.
* Mismatch and missing record.
* Ambiguous response.
* Malformed response.
* Timeout.
* Connection failure.
* HTTP error.
* Rate limiting.
* Oversized response.
* Invalid endpoint configuration.
* SSRF rejection.
* Redirect handling.
* TLS configuration requirements.
* Credential redaction.
* Stale and cached results.
* Provider disabled.
* Missing credentials.
* Authentication and authorization.
* Cross-application access restrictions.
* Audit-event creation.
* Historical result preservation.
* Database migrations.
* Existing registry, validation, workflow, and report regressions.

Use mock HTTP servers, mocked transports, or deterministic fixtures.

The core test suite must not depend on external regulatory portals or production credentials.

Run the complete backend test suite and frontend production build. Fix regressions introduced by the implementation.

Report actual results only.

## 13. DOCUMENTATION AND GIT

Update:

* `docs/PROJECT_STATUS.md`
* `docs/ARCHITECTURE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Document:

* Provider architecture.
* Supported capabilities.
* Configuration variables.
* Authentication requirements.
* Security restrictions.
* Data-freshness semantics.
* Synthetic-provider limitations.
* Official integration prerequisites.
* Actual tests and results.

Follow `AGENTS.md` for Git operations. Preserve existing history and user changes. Create a focused milestone commit only if permitted and after relevant checks pass.

## 14. DEFINITION OF DONE

Phase 14 is complete only when:

1. The existing registry architecture supports the interoperability layer.
2. The local demonstration provider works end-to-end.
3. The generic external-provider adapter is implemented and testable where appropriate.
4. External endpoints are securely configured.
5. Responses are validated and normalized.
6. Provider failures and stale data are represented honestly.
7. Results integrate with the existing scrutiny workflow.
8. Sensitive operations enforce authorization.
9. Audit events and provenance are preserved.
10. The application works when external providers are disabled.
11. Backend tests and frontend production build pass.
12. Documentation and the execution ledger are updated.
13. A Git checkpoint is created if permitted.

## 15. FINAL REPORT

Report:

* Integration architecture.
* Providers actually implemented.
* Whether external connectivity was genuinely tested.
* Configuration requirements.
* Security controls implemented.
* Database and API changes.
* Frontend changes.
* Actual test results.
* Frontend build result.
* Git commit hash, if created.
* Remaining official-integration prerequisites.

Begin by inspecting the repository. Implement Phase 14 end-to-end and report only verified outcomes.






# PHASE 15 — FINAL PILOT DEMONSTRATION & EVALUATION PACKAGE

## Project: VerityAI / EntityLocker — Smart India Hackathon 2026

Act as a senior software architect, QA lead, DevOps engineer, UX reviewer, technical writer, and hackathon demonstration specialist.

Your mission is to prepare the existing VerityAI project for a reliable, professional, evidence-backed SIH 2026 demonstration.

**This is the final planned implementation phase.** Inspect the actual repository, validate existing functionality, resolve remaining issues within scope, prepare a repeatable demonstration, generate the required documentation and evaluation artifacts, and perform a final integration audit.

Work autonomously on routine tasks. Do not stop after creating a plan. Do not claim features, tests, integrations, or deployment capabilities that have not been verified.

Do not rebuild the application from scratch.

---

## 1. INSPECT THE COMPLETE PROJECT

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
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Inspect:

* The complete source tree.
* Backend routes, services, models, and migrations.
* Frontend routes, pages, components, and API integration.
* Authentication and authorization.
* Document upload, extraction, and OCR.
* Deterministic validation.
* Anomaly detection.
* Registry verification and external-provider adapters, if implemented.
* Multilingual processing, if implemented.
* Application and document versioning, if implemented.
* Workflow orchestration.
* Scrutiny reports.
* Audit events.
* Automated tests.
* Environment configuration.
* Git status and history.

Verify actual capabilities rather than relying on historical reports.

If earlier phases are incomplete, identify and prioritize the missing requirements that materially affect the final demonstration.

Preserve existing user changes, database records, API contracts, and Git history.

---

## 2. FINAL INTEGRATION AUDIT

Verify that the complete application operates as one coherent system.

The intended demonstration workflow is:

1. An authorized user signs in, if authentication is implemented.
2. An institution or authorized operator creates an application.
3. Supporting documents are uploaded.
4. Documents are stored securely.
5. Digital text extraction or OCR processes the documents.
6. Extracted text and candidate fields become available for inspection.
7. Deterministic validation evaluates applicable configured rules.
8. Anomaly detection identifies supported inconsistencies.
9. Registry verification runs against the configured provider, if available.
10. The application enters the appropriate scrutiny workflow.
11. A reviewer inspects evidence and unresolved findings.
12. The reviewer records an authorized action.
13. The system records the action in the audit trail.
14. A scrutiny report is generated and downloaded.
15. Historical versions and report freshness are displayed where implemented.

Verify every applicable step.

Do not pretend that an optional feature works if it has not been implemented or configured.

If a feature is not available, document it and ensure the rest of the demonstration still works.

---

## 3. FIX CRITICAL AND HIGH-PRIORITY DEFECTS

Perform a targeted final review for:

* Broken application startup.
* Broken frontend navigation.
* Failed API requests.
* Database migration failures.
* Authentication or authorization bypasses.
* Upload and document-preview failures.
* OCR or processing failures.
* Incorrect validation results.
* Broken anomaly review.
* Invalid workflow transitions.
* Failed report downloads.
* Missing audit events.
* Cross-application data exposure.
* Missing configuration.
* Unhandled errors.
* Misleading UI states.
* Existing tests that fail because of implementation defects.

Prioritize defects that would prevent a reviewer or judge from completing the core demonstration.

Fix defects within scope and rerun relevant tests.

Do not hide errors, disable security controls, remove legitimate tests, or hardcode successful outcomes to make the demonstration look complete.

If a defect cannot be resolved safely, document the exact blocker and its impact.

---

## 4. REPEATABLE SYNTHETIC DEMONSTRATION DATA

Prepare a reproducible demo-data setup using synthetic institutional records and documents.

The demonstration should cover realistic scenarios, including:

* An application with complete supporting documents.
* An application with a missing required document.
* A document that needs OCR processing.
* A validation failure supported by actual evidence.
* An ambiguous or inconsistent field requiring human review.
* A document-processing failure or unsupported file, where appropriate.
* A registry mismatch or unavailable-provider scenario, if registry verification exists.
* A completed reviewer action.
* A generated scrutiny report.

Use realistic but fictional institutions, identifiers, and documents.

Clearly label synthetic records as demonstration data.

Requirements:

* Use the existing seed and fixture conventions where possible.
* Make demo-data setup repeatable.
* Avoid creating duplicate records on repeated runs.
* Never overwrite or delete existing user data.
* Use isolated databases or explicitly safe demo environments.
* Keep credentials out of source control.
* Do not fabricate validation results independently of the actual validation engine.

The demonstration scenarios must be produced by the same application logic used in ordinary operation.

---

## 5. DEMONSTRATION READINESS CHECK

Create an automated or repeatable readiness check appropriate to the existing architecture.

Verify:

* Required environment configuration.
* Backend startup.
* Database connectivity.
* Migration state.
* Frontend build.
* Health endpoints.
* Availability of demo records.
* Document-storage permissions.
* Processing prerequisites.
* Report-generation dependencies.
* Authentication setup, if implemented.
* Optional AI-provider configuration.
* Optional external registry-provider configuration.

Clearly distinguish:

* Required dependencies.
* Optional integrations.
* Configured capabilities.
* Unavailable capabilities.

Do not mark an optional provider as connected merely because configuration variables exist.

Do not expose secrets in readiness output.

A failed optional integration must not prevent core local functionality from working unless the architecture genuinely requires it.

---

## 6. JUDGE-FRIENDLY USER EXPERIENCE

Review the application from the perspective of a judge seeing it for the first time.

Ensure the interface makes the following clear:

* What VerityAI does.
* Which institutional problem it addresses.
* How documents enter the system.
* How OCR and extraction work.
* How validation rules are evaluated.
* How inconsistencies are identified.
* How reviewers inspect evidence.
* How human decisions are recorded.
* How reports support scrutiny.

Review the Overview, Applications, Scrutiny Queue, Documents, Validation Rules, Institutions, and Audit Trail views.

Improve confusing labels, broken navigation, empty states, error messages, and loading behavior.

Preserve the existing VerityAI design system:

* Lavender `#CBB3E8`.
* Pale purple `#F3EEFC` and `#FAF8FF`.
* Primary purple `#7450D8`.
* Tomato red `#F04438` and `#E34234`.
* Deep navy `#171B45`.
* Inter typography.

Keep the interface professional, responsive, accessible, and appropriate for an institutional scrutiny platform.

Reference screenshots remain visual inspiration only.

Do not add fake statistics, artificial compliance percentages, simulated successful integrations, or unsupported AI claims.

---

## 7. FINAL QUALITY ASSURANCE

Run the full available verification suite.

### Backend

* Execute the complete automated test suite.
* Verify application startup.
* Verify health endpoints.
* Verify database initialization and migrations.
* Verify document upload and extraction.
* Verify deterministic validation.
* Verify anomaly detection.
* Verify workflow transitions.
* Verify authentication and authorization.
* Verify report generation and downloads.
* Verify audit-event persistence.
* Verify regression-sensitive endpoints.

### Frontend

* Run TypeScript checks.
* Run the production build.
* Run available frontend tests.
* Verify important routes and API interactions.
* Check for console errors if browser automation is available.

### Security

* Verify unauthorized access is rejected.
* Verify document and report access restrictions.
* Verify secrets are not exposed.
* Verify upload and storage protections.
* Verify that synthetic data is clearly distinguished from official data.

### Database

* Verify migration consistency.
* Verify foreign-key integrity.
* Verify fresh database initialization.
* Verify safe repeat seeding.
* Verify that existing data is preserved.

Record exact results.

If a check is unavailable, state why and perform alternative verification where appropriate.

Never claim that a browser-based test, external integration, or security audit occurred unless it actually did.

---

## 8. PERFORMANCE AND RELIABILITY

Perform a targeted review of the most important user-facing workflows.

Where practical:

* Measure API response times.
* Identify slow or repeated database queries.
* Avoid unnecessary OCR reruns.
* Avoid duplicate validation and analysis requests.
* Ensure large documents are handled within configured limits.
* Ensure reports generate reliably.
* Verify error states are recoverable.
* Avoid unbounded polling and retries.

Do not invent performance benchmarks.

Do not introduce complex infrastructure without a demonstrated need.

Document any remaining performance limitations.

---

## 9. DOCUMENTATION PACKAGE

Ensure the project contains an accurate, organized documentation package.

Update:

* `README.md`
* `docs/PROJECT_STATUS.md`
* `docs/ARCHITECTURE.md`
* `docs/TECH_STACK.md`
* `docs/UI_UX_DESIGN.md`
* `docs/AI_PIPELINE.md`
* `docs/DATA_MODEL_AND_API.md`
* `docs/TESTING_SECURITY_AND_DEMO.md`
* `docs/AUTONOMOUS_EXECUTION_STATUS.md`, if present.

Add other documentation files only where they provide real value.

The README should explain:

* Project purpose.
* Problem being addressed.
* Core capabilities.
* Architecture.
* Technology stack.
* Prerequisites.
* Configuration.
* Development startup.
* Database setup and migrations.
* Demo-data setup.
* Test execution.
* Security considerations.
* Known limitations.

Do not include secrets or real institutional personal data.

Ensure setup instructions match the actual repository and can be followed by another developer.

---

## 10. FINAL DEMONSTRATION SCRIPT

Create:

`docs/DEMO_SCRIPT.md`

Write a concise, practical demonstration script that can be followed during the SIH presentation.

Include:

* Opening problem statement.
* Proposed solution.
* Application intake.
* Document upload.
* OCR/extraction demonstration.
* Deterministic validation.
* Anomaly detection.
* Evidence inspection.
* Human-review workflow.
* Report generation.
* Security and auditability highlights.
* Limitations and honest claims.
* Suggested closing statement.

For each demonstration step, specify:

* What the presenter should show.
* What action the application performs.
* What result should appear when the system behaves as expected.
* What to do if an optional integration is unavailable.

Keep the script aligned with features that genuinely exist.

Do not present synthetic registry data as official data or heuristic anomaly detection as proof of fraud.

---

## 11. FINAL EVALUATION PACKAGE

Create:

`docs/EVALUATION_PACKAGE.md`

Include:

1. Executive summary.
2. Problem statement.
3. Proposed solution.
4. Target users.
5. Key capabilities.
6. System architecture.
7. Technology stack.
8. AI and document-processing pipeline.
9. Deterministic validation approach.
10. Evidence traceability.
11. Security and access controls.
12. Human-review model.
13. Test methodology and actual results.
14. Demonstration scenarios.
15. Known limitations.
16. Future scope.

Distinguish implemented features from planned features.

Do not invent evaluation scores, judge feedback, deployment results, performance improvements, or external integrations.

If a result has not been measured, state that it has not been measured.

The package should help a technical evaluator understand what has actually been built and how it can be verified.

---

## 12. OPTIONAL PRESENTATION AND VIDEO MATERIALS

If the repository already contains presentation or video-generation tooling, use it where appropriate to prepare demonstration materials.

Otherwise, create useful source materials such as:

* A slide-by-slide presentation outline.
* A concise narration script.
* A feature-demonstration checklist.
* Suggested screenshots to capture.
* A list of evidence needed to support technical claims.

Do not claim that a video, slide deck, or screenshot was generated unless the artifact genuinely exists.

Do not add unnecessary dependencies merely to generate decorative materials.

Prioritize the working software, reproducible demonstration, and accurate technical documentation.

---

## 13. FINAL GIT AND REPOSITORY REVIEW

Follow `AGENTS.md`.

Inspect the final Git status.

Ensure:

* No secrets are committed.
* No uploaded private documents are committed.
* No local databases or generated artifacts are committed unless explicitly required.
* No user changes are discarded.
* Migrations and dependency files are consistent.
* Documentation reflects the actual implementation.
* Relevant changes are committed only if permitted.

Preserve all existing history.

Do not force-push, reset the repository, or perform destructive cleanup.

Create a final milestone commit only if permitted and after verification passes.

Record the final commit hash if created.

---

## 14. EXECUTION LEDGER

If `docs/AUTONOMOUS_EXECUTION_STATUS.md` exists, update it with the Phase 15 outcome and final integration-audit results.

If it does not exist, create it with the statuses of Phases 6–15.

For every phase, record:

* Phase title.
* Verified implementation status.
* Relevant tests.
* Git checkpoint.
* Remaining blockers.

Do not mark Phases 11–14 as complete merely because their prompts exist.

Verify their actual implementation before declaring completion.

If the autonomous execution ledger contains stale or contradictory statuses, reconcile it against the actual source code, test results, and Git history.

---

## 15. DEFINITION OF DONE

Phase 15 is complete only when:

1. The actual application has undergone a final integration review.
2. Critical demonstration-blocking defects have been addressed or documented.
3. A reproducible synthetic demonstration workflow exists.
4. Demo setup does not overwrite existing user data.
5. The backend test suite has been executed.
6. The frontend production build succeeds.
7. Important workflows have been verified to the extent supported by available tools.
8. Security and data-access behavior have been checked.
9. The README and project documentation reflect the actual implementation.
10. `docs/DEMO_SCRIPT.md` exists and matches the working product.
11. `docs/EVALUATION_PACKAGE.md` exists and contains evidence-backed information.
12. The execution ledger accurately records Phases 6–15.
13. Known limitations are explicitly documented.
14. The final Git status and commit state have been reviewed.
15. A final verification report has been produced.

Do not declare full project completion if any mandatory requirement remains unverified.

---

## 16. FINAL REPORT

After completing Phase 15, provide a concise but complete final report covering:

* Overall project status.
* Phase 6–15 completion status based on verified evidence.
* Core end-to-end capabilities.
* Backend test results.
* Frontend build results.
* Database and migration checks.
* Security verification.
* Demo-data readiness.
* Documentation files created or updated.
* Git commit hash, if created.
* Known limitations.
* Any external integrations that remain unconfigured.
* Any requirements that remain blocked or incomplete.

Distinguish actual results from assumptions.

Do not claim production readiness solely because the application builds and tests pass.

Begin by inspecting the actual repository and its authoritative instructions. Complete the final pilot-demonstration and evaluation package, verify the system, update the execution ledger, and report the verified outcome.

