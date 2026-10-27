# MASTER SYSTEM AUDIT AND BASELINE VERIFICATION REPORT (PHASE 0)
**Project:** VerityAI (Smart India Hackathon 2026 Prototype)  
**Date:** October 25, 2026  
**Auditor / Technical Lead:** Senior Application Security Engineer, Database Architect & QA Lead  
**Status:** PHASE 0 COMPLETED — BASELINE VERIFIED & PROTECTED  

---

## 1. Executive Summary & Objective

This report establishes the verified baseline of **VerityAI** in response to the *Master System Design and Implementation Directive*.

The objective is to extend VerityAI into an integration-ready institutional application and AI-powered scrutiny platform suitable for a rigorous, live **two-computer demonstration**:
* **Computer A (Institutional Applicant):** Authenticates via institutional credentials, creates institutional applications, uploads statutory supporting documents, submits for scrutiny, receives an official application reference number, tracks status, and is strictly restricted to its own tenant boundary.
* **Computer B (Regulatory Officer):** Authenticates via regulatory reviewer credentials, accesses the scrutiny inbox/queue, inspects submitted dossiers and documents, explicitly triggers VerityAI scrutiny, monitors processing state, examines evidence-linked findings, accesses official PDF/JSON reports, records review decisions, and reviews audit history.
* **Shared Backend & Database:** Both computers access the same deployed application and authoritative database; no localStorage spoofing, no separate databases, and no hardcoded AI results.

**Implementation Rule:** Under **PHASE 0**, **zero code, database schema, or runtime modifications have been made**. All findings below represent independent inspection of existing code and verified test executions.

---

## 2. Baseline Test & Build Verification

The existing application and test suites were executed directly against the local environment:

| Test / Check Suite | Target / Command | Actual Result | Verification Timestamp |
| :--- | :--- | :--- | :--- |
| **Backend Pytest Suite** | `backend/.venv/bin/pytest tests -v` (WSL Ubuntu-24.04) | **179 PASSED**, 17 warnings in 31.38s (100% pass rate) | 2026-10-25 02:11:24 |
| **End-to-End Verification** | `backend/.venv/bin/python scripts/verify_e2e.py` | **12/12 Workflows Verified** (100% operational health) | 2026-10-25 02:11:51 |
| **Frontend Code Quality** | `npm run lint` (in `frontend/`) | **0 Errors**, 28 informational warnings | 2026-10-25 02:11:59 |
| **Frontend Production Build** | `npm run build` (`tsc -b && vite build`) | **SUCCESS** (Compiled in 216ms; `index-TlcqpPh9.js` 607.19 kB) | 2026-10-25 02:12:07 |

### Baseline Observations:
1. The backend has **179 passing tests** covering RBAC authorization, document security, SSRF validation, cross-document anomalies, statutory norms, report generation, and workflow state transitions.
2. The core AI pipeline (RapidOCR, PyMuPDF extraction, validation rules, cross-document comparison) is fully operational in the local environment.
3. The frontend builds cleanly with zero TypeScript or packaging errors.

---

## 3. Authoritative Architecture & Repository Inventory

### 3.1 Backend Components (`backend/app/`)
* **Core API Framework:** FastAPI with CORS, security headers (`nosniff`, `frame-options`), and custom CSRF header validation (`X-Requested-With: VerityAI`).
* **Database & ORM:** SQLAlchemy 2.0 with SQLite database (`backend/var/verityai.db`) and Alembic migrations.
* **Authentication & Authorization (`api/deps.py`, `endpoints/auth.py`):**
  - Session management via HttpOnly, SameSite=Lax JWT cookie (`access_token`).
  - Role enforcement via `require_roles("ADMIN", "REVIEWER", "INSTITUTION_USER")`.
  - Roles defined: `ADMIN`, `REVIEWER`, `INSTITUTION_USER`.
  - Password hashing via Argon2id (`app.core.security`).
* **Document Processing Subsystem (`services/storage.py`, `services/extraction.py`):**
  - Secure storage key hashing and MIME/magic bytes validation.
  - Hybrid text extraction: PyMuPDF digital stream extraction with automatic fallback to RapidOCR (ONNX Runtime).
  - Decompression bomb safeguards (40 MP max) and table structure detection (`find_tables()`).
* **Deterministic Validation Engine (`services/validation.py`):**
  - 133 KB engine containing statutory checks (APH 2024–27 norms, faculty cadre ratios, land requirements, classroom capacities, TFW quotas, expiry dates, and required document rules).
* **AI Cross-Document Anomaly Engine (`services/anomaly.py`):**
  - Heuristic & NLP cross-document comparative analysis:
    * `ANM-XDOC-NAME`: Inconsistent institution names across documents.
    * `ANM-XDOC-INTAKE`: Conflicting approved student intake figures.
    * `ANM-XDOC-LAND`: Conflicting land area citations.
    * `ANM-DATE-SEQ`: Inverted chronological issuing/approval dates.
    * `ANM-DUP-CERT`: Certificate re-use across applications.
    * `ANM-SEAL-TAMPER`: Visual and structural tampering indicators.
  - Generates `Finding` records linked to `FindingEvidence` with page numbers, bounding boxes, raw and normalized values.
* **Audit Subsystem (`services/audit.py`, `models/audit.py`):**
  - Append-only audit trail logging actor ID, actor type, event type, entity ID, metadata, and timestamps.
* **Regulatory Gateway Integrations (`services/integration.py`):**
  - Outbound adapter architecture: `LocalSyntheticRegulatoryGatewayAdapter`, `ConfigurableExternalPortalAdapter`, `OfficialAictePortalStubAdapter`.
  - Strict SSRF protection blocking private CIDR blocks, loopback, and cloud metadata IPs (`169.254.169.254`).

### 3.2 Frontend Components (`frontend/src/`)
* **Framework:** React 19, TypeScript, Vite, Tailwind CSS, Lucide icons.
* **Routing:** Hash-based and URL-synchronized lightweight state router (`router/useAppRouter.ts`).
* **State & Shell:** `App.tsx`, `AppShell.tsx` with dynamic navigation groups per authenticated user role.
* **Core Views:**
  - `LandingPage.tsx`: Public portal introduction.
  - `LoginPage.tsx`: Role-aware authentication with quick-demo credentials.
  - `DashboardView.tsx`: Operational workspace overview.
  - `AdminDashboardView.tsx`: Administrative executive governance dashboard.
  - `ApplicationList.tsx`: Tabular register of applications with search and status filtering.
  - `ApplicationDetailWorkspace.tsx`: 173 KB comprehensive scrutiny dossier containing document viewer, validation results, anomaly findings, reviewer adjudication, and PDF report export.
  - `ScrutinyQueueView.tsx`: Prioritized queue of submitted applications.
  - `UsersView.tsx`: Admin-only user and role management.

---

## 4. Protected Asset: The Existing AI Scrutiny Pipeline

### 4.1 Authoritative Processing Call Chain
The existing AI scrutiny pipeline is a protected asset. Tracing the exact execution path:

```
[Officer clicks "Run Scrutiny Pipeline" in UI]
   │
   ▼
[HTTP POST /api/v1/applications/{application_id}/workflow/start]
   │
   ▼ (app.api.v1.endpoints.workflow.trigger_workflow_start)
   │  - Enforces require_roles("REVIEWER", "ADMIN")
   │
   ▼ (app.services.workflow.start_or_resume_workflow)
   │  1. Verifies application existence
   │  2. Records audit event: "WORKFLOW_INITIATED"
   │  3. Sets application.pipeline_status = "PROCESSING"
   │  4. Invokes Deterministic Validation Engine:
   │     └─► app.services.validation.run_application_validation(application_id, db, actor_id)
   │         - Evaluates statutory rules against extracted fields & document metadata
   │         - Populates RuleResult and ValidationRun
   │  5. Invokes AI Cross-Document Anomaly Engine:
   │     └─► app.services.anomaly.run_application_analysis(application_id, db, actor_id)
   │         - Extracts candidate fields from DocumentPage records
   │         - Executes cross-document comparison checks (NAME, INTAKE, LAND, DATES)
   │         - Populates Finding and FindingEvidence entities
   │  6. Computes overall status:
   │     - If validation failures > 0 ──► "VALIDATION_FAILED"
   │     - If needs_review > 0 or open anomalies > 0 ──► "NEEDS_REVIEW"
   │     - Else ──► "COMPLETED"
   │  7. Records audit event: "WORKFLOW_COMPLETED"
   │  8. Returns WorkflowStatusResponse with 5 stage details:
   │     [documents, extraction, validation, anomalies, decision]
   │
   ▼
[Officer inspects evidence, reviews findings, and downloads PDF Scrutiny Dossier]
```

### 4.2 Non-Negotiable Rules for AI Pipeline Preservation:
1. **Never mock the pipeline:** `run_application_validation` and `run_application_analysis` must execute their genuine analytical routines on real document text and database records.
2. **Never hardcode "PASS" or "COMPLETED":** Pipeline status must reflect real rule evaluation and candidate anomaly flags.
3. **Preserve Evidence Provenance:** Findings must always link to `FindingEvidence` records with document ID, page number, and extracted snippets.

---

## 5. Current State vs. Target Two-Computer Architecture

### 5.1 Gap Analysis Matrix

| Feature / Dimension | Current Implementation | Target Architecture (Directive) | Status / Gap |
| :--- | :--- | :--- | :--- |
| **Applicant Experience (Computer A)** | `INSTITUTION_USER` shares the same navigation as `REVIEWER`, seeing Scrutiny Queue, Validation Norms, and Scrutiny Dossier controls. | Dedicated, clean Applicant Portal. Shows only own institutional applications, document uploader, draft saving, submission tracking, and application reference number. | **GAP:** Needs dedicated Applicant Workspace in frontend; remove reviewer controls from applicant view. |
| **Tenant Isolation on Applications** | `list_applications` and `create_application` do not enforce `institution_id` on query or payload. | Strict tenant boundary: `INSTITUTION_USER` can only view, create, and upload documents for their own assigned `institution_id`. | **GAP:** Backend endpoints must restrict scope based on authenticated `current_user.institution_id`. |
| **Application Submission Lifecycle** | Applications are created as `DRAFT`. Transition to `SUBMITTED` is available via `/workflow/transitions` or automatic when validated. | Clear explicit applicant action: "Submit Application". Enforces completeness checklist before submission, locks draft editing, updates audit log, sets `submitted_at`. | **GAP:** Add dedicated, validated applicant submission action. |
| **Officer Experience (Computer B)** | Full Scrutiny Workspace exists (`ApplicationDetailWorkspace`, `ScrutinyQueueView`). Officer can run scrutiny and review findings. | Officer logs in on Computer B, immediately sees newly submitted applications from Computer A in Scrutiny Queue, runs scrutiny, reviews findings, records decision. | **ALIGNED / VERIFIED:** Existing scrutiny workspace satisfies this requirement once applicant submission is completed. |
| **Scrutiny Job Persistence & State Machine** | Scrutiny runs synchronously inside `start_or_resume_workflow` and updates `pipeline_status`. | A formal, persistent `ScrutinyJob` entity (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) to ensure idempotency and long-running job safety. | **ENHANCEMENT:** Model persistent scrutiny jobs to satisfy Section 6 of directive. |
| **Shared Network Deployment** | Both dev servers run locally on `127.0.0.1:8000` and `localhost:5173`. | Single backend running on `0.0.0.0:8000` accessible across LAN from Computer A and Computer B. | **DEPLOYMENT READY:** Needs network host binding and firewall configuration for live demo. |

---

## 6. Detailed Phase Plan & Dependency Graph

To implement the target architecture incrementally without disrupting existing capabilities:

```
[Phase 0: Baseline Audit] (COMPLETE)
       │
       ▼
[Phase 1: Architecture & Gap Specification]
       │
       ▼
[Phase 2: Shared Application Foundation & Tenant Scoping]
       │
       ▼
[Phase 3: Institutional Applicant Portal (Computer A UI)]
       │
       ▼
[Phase 4: Application Submission & Document Management]
       │
       ▼
[Phase 5: Officer Workspace & Scrutiny Inbox (Computer B UI)]
       │
       ▼
[Phase 6: RBAC & Tenant Isolation Direct API Verification]
       │
       ▼
[Phase 7 & 8: Scrutiny Job Orchestration & Asynchronous Pipeline]
       │
       ▼
[Phase 9 & 10: Scrutiny Results, Evidence Presentation & Adjudication]
       │
       ▼
[Phase 11: Real-Time / Polled Status Synchronization]
       │
       ▼
[Phase 12: Versioned Integration API Contract & Mock Adapter]
       │
       ▼
[Phase 13: Security, Privacy & Integrity Verification]
       │
       ▼
[Phase 14: Automated & Manual End-to-End Regression]
       │
       ▼
[Phase 15: Two-Computer Live Network Demonstration Runbook]
```

---

## 7. Critical Risks & Mitigation Strategies

1. **Risk of Breaking Existing 179 Pytest Tests:**
   - *Mitigation:* Any change to `applications.py` or `documents.py` must maintain backward compatibility for existing tests (e.g. supporting optional auth or providing test client tokens).
2. **Risk of Exposing Scrutiny Findings to Applicants:**
   - *Mitigation:* Ensure `findings` and `anomaly` endpoints require `require_roles("REVIEWER", "ADMIN")` so applicants cannot inspect internal scrutiny flags or fraud indicators.
3. **Risk of Network Port Binding Issues During Two-Computer Demo:**
   - *Mitigation:* Provide exact host-binding parameters (`--host 0.0.0.0 --port 8000` for backend; `--host 0.0.0.0 --port 5173` for Vite) and test local LAN IP reachability.

---

## 8. Proposed Files Likely Requiring Modification in Later Phases

* **Backend:**
  - `backend/app/api/v1/endpoints/applications.py`: Add tenant filtering for `INSTITUTION_USER` on `list_applications`, enforce `current_user.institution_id` on `create_application`.
  - `backend/app/api/v1/endpoints/documents.py`: Ensure upload and download strictly enforce institution ownership when called by an `INSTITUTION_USER`.
  - `backend/app/schemas/application.py` & `models/application.py`: Support scrutiny job references if introducing formal `ScrutinyJob` table.
* **Frontend:**
  - `frontend/src/components/layout/AppShell.tsx`: Add dedicated applicant navigation group when `currentUser.role === 'INSTITUTION_USER'`.
  - `frontend/src/components/applicant/ApplicantPortalView.tsx` (new): Clean, scrutiny-free applicant workspace for creating and tracking applications.
  - `frontend/src/App.tsx`: Route `INSTITUTION_USER` to applicant portal on login.

---

## 9. Decisions Requiring Human Confirmation

Before commencing implementation in Phase 1:
1. **Scrutiny Job Model:** Should scrutiny execution be represented by a new database table `ScrutinyJob` (with explicit job IDs and status polling), or should we continue leveraging the existing `ProcessingRun` / `Application.pipeline_status` state machine which is already connected to `start_or_resume_workflow`? (Recommended: lightweight `ScrutinyJob` wrapper to satisfy Section 6 without breaking existing pipeline).
2. **Applicant Submission Checklist:** When an applicant submits, should the system strictly block submission if required documents are missing (enforced by `evaluate_conditional_checklist`), or allow submission with a warning? (Recommended: block submission if mandatory category documents are missing).

---
**PHASE 0 CONCLUSION:**  
Baseline verification is complete. The system is stable, with 179/179 backend tests passing and 12/12 E2E workflows operational. No code modifications have been made. Awaiting explicit user authorization to begin **PHASE 1**.
