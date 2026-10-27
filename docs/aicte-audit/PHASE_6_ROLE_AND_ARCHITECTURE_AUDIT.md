# VerityAI — Phase 6: Role & Architecture Audit Report

**Document Reference:** `docs/aicte-audit/PHASE_6_ROLE_AND_ARCHITECTURE_AUDIT.md`  
**Classification:** Prototype Architecture & Security Audit (SIH 2026 — Smart Automation Track)  
**Status:** Complete / Baseline Audit  
**Authority:** AGENTS.md, AICTE Approval Process Handbook (APH 2024–25 to 2026–27)  
**Execution Mode:** Read-Only Audit & Recommendations (No source code or database modifications)

---

## 1. Executive Summary

VerityAI is a decision-support hackathon prototype designed for the Smart India Hackathon (SIH) 2026 to assist regulatory scrutiny officers in evaluating technical institution approval applications and supporting statutory documentation. As mandated by `AGENTS.md`, VerityAI is **not** an operational AICTE production system, does not possess official AICTE API integration, and operates strictly on synthetic, anonymized demonstration data.

### Scope and Objectives of Phase 6
This audit establishes an exhaustive architectural, security, and workflow baseline across the existing React/TypeScript frontend, FastAPI backend, SQLite/SQLAlchemy data models, and the local OCR/validation/anomaly pipeline. The objective is to identify discrepancies between the intended regulatory workflows and the current codebase, evaluate tenant isolation and role-based access control (RBAC), and outline a strictly bounded scope for Phase 7 remediation without touching code, schemas, or seed records during this phase.

### Key Strengths Identified
1. **Solid Deterministic Core:** The backend features a mature, 100% local deterministic validation engine (`backend/app/services/validation.py`) executing 18+ APH rules covering land norms, faculty-to-student ratios, built-up areas, and safety certificates without external paid AI dependencies.
2. **Robust Test Suite:** All 249 backend unit and integration tests execute cleanly (`249 passed in 34.02s`), verifying data persistence, document hashing (SHA-256), workflow transitions, and regulatory calculations.
3. **Submission Integrity & Immutability:** Once an applicant transitions an application from `DRAFT` to `SUBMITTED`, post-submission mutation is locked (`409 Conflict: APPLICATION_LOCKED`). The API enforces mandatory field completeness and statutory document checklist validation prior to submission (`SUBMISSION_CHECKLIST_INCOMPLETE`).
4. **Offline Resilience:** The AI scrutiny engine operates completely offline using PyMuPDF and RapidOCR. The optional LLM integration (Ollama stub) defaults to disabled (`LLM_ENABLED=False`), ensuring no operational disruption when paid external APIs are absent.

### Critical Deficiencies and Misalignments Discovered
1. **Broken Role Boundary for Reviewers:** In both the Reviewer Overview (`DashboardView.tsx`) and the Application Register (`ApplicationList.tsx`), reviewers are provided with **"New Application"** and **"Upload Document"** action buttons. Reviewers can invoke `POST /api/v1/applications` to fabricate applications for any institution, and `PATCH /api/v1/applications/{id}` to alter draft applicant data.
2. **Tenant Isolation Gaps in Document Listing:** The global endpoint `GET /api/v1/documents` (`endpoints/documents.py:301`) contains **no authentication dependency and no tenant-scoping filter**, allowing any caller to enumerate all documents across all institutions. Similarly, `GET /api/v1/documents/{document_id}` uses optional authentication, permitting unauthenticated access to document metadata.
3. **Leaked Review Summaries to Unauthenticated Callers:** In `endpoints/reports.py:40`, the review summary check only verifies `if current_user and current_user.role == "INSTITUTION_USER"`. Unauthenticated callers (`current_user is None`) bypass this guard entirely and can access internal scrutiny evaluations.
4. **In-Memory Background Execution Fragility:** Scrutiny execution relies on FastAPI's native `BackgroundTasks`. While job records persist in SQLite (`ScrutinyJob`), tasks running in memory do not survive backend server restarts, leaving interrupted jobs permanently stuck in `PROCESSING` without automatic restart recovery.

---

## 2. Verified Architecture and Authoritative Code Paths

```
                         INSTITUTIONAL APPLICANT
                                    │
                                    ▼
                          APPLICANT WEB PORTAL
                     [ApplicantDashboardView.tsx]
                     [ApplicantIntakeWizard.tsx]
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │                VERITYAI CORE PLATFORM                  │
       │                                                        │
       │  API Gateway / Router: [app/main.py, v1/router.py]     │
       │  RBAC & Auth: [api/deps.py, endpoints/auth.py]         │
       │  Applications: [endpoints/applications.py]             │
       │  Documents: [endpoints/documents.py, storage.py]       │
       │  Workflow State: [endpoints/workflow.py, services]     │
       │  Jobs: [endpoints/scrutiny_jobs.py, services]          │
       │  Audit Trail: [models/audit.py, services/audit.py]     │
       └────────────────────────────┬───────────────────────────┘
                                    │ Authorized Job Trigger
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │                 AI INTEGRATION BOUNDARY                │
       │  Entry: [services/scrutiny_job.py:execute_scrutiny_job]│
       │  Coordinator: [services/workflow.py:start_or_resume]   │
       │  Adapter/LLM Client: [services/anomaly.py:query_llm]   │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │                VERITYAI SCRUTINY ENGINE                │
       │                                                        │
       │  Extraction & OCR: [services/extraction.py]            │
       │    - PyMuPDF text & metadata extraction                │
       │    - RapidOCR raster page fallback                     │
       │  Deterministic Rules Engine: [services/validation.py]  │
       │    - 18+ APH statutory norm checks                     │
       │  Anomaly & Discrepancy Engine: [services/anomaly.py]   │
       │    - Cross-document field consistency                  │
       │    - Land/FSI/Certificate discrepancy detection        │
       │  Evidence & Provenance: [models/finding.py]            │
       │    - Document ID, page number, bounding box/text snippet│
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │               RESULTS & DECISION SUPPORT               │
       │                                                        │
       │  Findings & Evidence: [endpoints/anomalies.py]         │
       │  Regulatory Reports: [endpoints/reports.py]            │
       │  Audit Logging: [endpoints/audit.py]                   │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
                           REVIEWER WORKSPACE
                        [DashboardView.tsx]
                        [ApplicationDetailModal.tsx]
                        [ScrutinyQueueView.tsx]
                                    │
                                    ▼
                         HUMAN REVIEW & DECISION
```

### Authoritative Code Paths
* **Application Ingestion:** `POST /api/v1/applications` handled by `create_application()` in `backend/app/api/v1/endpoints/applications.py:127`.
* **Application Updates:** `PATCH /api/v1/applications/{application_id}` handled by `update_draft_application()` in `backend/app/api/v1/endpoints/applications.py:284`.
* **Statutory Submission:** `POST /api/v1/applications/{application_id}/submit` handled by `submit_application()` in `backend/app/api/v1/endpoints/applications.py:355`.
* **Document Upload:** `POST /api/v1/applications/{application_id}/documents` handled by `upload_application_document()` in `backend/app/api/v1/endpoints/documents.py:108`.
* **Scrutiny Job Dispatch:** `POST /api/v1/scrutiny-jobs` handled by `create_scrutiny_job_endpoint()` in `backend/app/api/v1/endpoints/scrutiny_jobs.py:38`, delegating to `create_and_start_scrutiny_job()` in `backend/app/services/scrutiny_job.py:24`.
* **End-to-End Scrutiny Pipeline:** `execute_scrutiny_job()` in `backend/app/services/scrutiny_job.py:91` executing `start_or_resume_workflow()` in `backend/app/services/workflow.py:125`.
* **Deterministic Rules Execution:** `run_application_validation()` in `backend/app/services/validation.py:347`.
* **Anomaly & Cross-Document Engine:** `run_application_analysis()` in `backend/app/services/anomaly.py:465`.
* **Finding Human Adjudication:** `POST /api/v1/findings/{finding_id}/review` handled by `review_finding_endpoint()` in `backend/app/api/v1/endpoints/anomalies.py:198`.
* **Scrutiny Report Generation:** `GET /api/v1/applications/{application_id}/report/pdf` handled by `download_scrutiny_pdf()` in `backend/app/api/v1/endpoints/reports.py:126`.

---

## 3. Role-Permission Matrix

| Functional Capability | Expected `INSTITUTION_USER` | Actual `INSTITUTION_USER` | Expected `REVIEWER` | Actual `REVIEWER` | Expected `ADMIN` | Actual `ADMIN` |
|---|---|---|---|---|---|---|
| **Create Draft Application** | Own institution only | **Enforced** (`endpoints/applications.py:149`) | None (Prohibited) | **VIOLATION: Permitted for any inst** (`endpoints/applications.py:157`) | System-level / On-behalf | **Permitted for any inst** |
| **Edit Application Draft** | Own draft only | **Enforced** (`endpoints/applications.py:303`) | None (Prohibited) | **VIOLATION: Permitted to edit draft** (`endpoints/applications.py:303`) | Emergency/Support | **Permitted to edit draft** |
| **Submit Application** | Own draft only | **Enforced** (`endpoints/applications.py:374`) | None (Prohibited) | Denied by validation logic | None | Denied by validation logic |
| **Upload Document** | Own application only | **Enforced** (`endpoints/documents.py:143`) | None (Review only) | **VIOLATION: Permitted to upload** (`endpoints/documents.py:143`) | Administrative upload | Permitted |
| **List Documents** | Own application only | **Enforced on app endpoint; Leaked globally** | Scrutiny dossier only | Global registry | Scrutiny dossier only | Global registry |
| **Download Document File** | Own institution only | **Enforced** (`endpoints/documents.py:463`) | All submitted dossiers | **Enforced** (`endpoints/documents.py:467`) | All submitted dossiers | **Enforced** (`endpoints/documents.py:467`) |
| **Trigger AI Scrutiny** | None (Prohibited) | **Denied (403)** (`endpoints/scrutiny_jobs.py:43`) | Permitted for submitted apps | **Enforced (201)** (`endpoints/scrutiny_jobs.py:43`) | Permitted | **Enforced (201)** |
| **View Scrutiny Queue** | None (Prohibited) | **Denied (403)** (`endpoints/workflow.py:139`) | Permitted | **Enforced (200)** (`endpoints/workflow.py:139`) | Permitted | **Enforced (200)** |
| **View Internal Findings** | None (Prohibited) | **Denied (403)** (`endpoints/anomalies.py:72`) | Permitted | **Enforced (200)** (`endpoints/anomalies.py:72`) | Permitted | **Enforced (200)** |
| **Adjudicate Finding** | None (Prohibited) | **Denied (403)** (`endpoints/anomalies.py:202`) | Permitted | **Enforced (200)** (`endpoints/anomalies.py:202`) | Permitted | **Enforced (200)** |
| **View Validation Summary** | Own compliance status | **LEAK: Open without auth** (`endpoints/validation.py:100`) | Permitted | **Enforced (200)** | Permitted | **Enforced (200)** |
| **Generate Scrutiny Report** | Summary of deficiencies | **Denied (403)** (`endpoints/reports.py:40`) | Permitted | **Enforced (200)** | Permitted | **Enforced (200)** |
| **View Audit Trail** | None | **Denied (403)** (`endpoints/audit.py:19`) | Limited to review context | **Denied (Admin only)** | Global audit access | **Enforced (200)** (`endpoints/audit.py:19`) |

### Critical Role Permission Observations
1. **Reviewer Over-Privilege:** The `REVIEWER` role possesses write permissions on applicant draft applications and document uploads. A regulatory reviewer must be an impartial auditor of submitted declarations, never an author or contributor.
2. **Missing Guard on Unauthenticated Requests:** In `endpoints/reports.py:40` and `endpoints/validation.py:100`, endpoints intended for reviewers or admins either rely on `get_optional_current_user` without checking for `None`, or omit user authentication entirely.

---

## 4. Current UI-to-API Mapping for "New Application" and "Upload Document"

### A. The "New Application" Action
* **UI Trigger Locations:**
  1. `frontend/src/components/dashboard/DashboardView.tsx` (Lines 188–193): Rendered directly in the Reviewer Overview action bar:
     ```tsx
     <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
       <FileText className="w-4 h-4 mr-1.5" />
       New Application
     </button>
     ```
  2. `frontend/src/components/ApplicationList.tsx` (Lines 182–187): Rendered in the header of the Application Register table (accessible to Reviewers and Admins).
  3. `frontend/src/components/applicant/ApplicantDashboardView.tsx` (Lines 130–135): Rendered in the applicant dashboard.
* **Component Rendered:** `ApplicationCreateModal.tsx` and `ApplicantIntakeWizard.tsx`.
* **API Endpoint Invoked:** `POST /api/v1/applications`.
* **Backend Authorization Behavior (`backend/app/api/v1/endpoints/applications.py:157–164`):**
  ```python
  if current_user and current_user.role == "INSTITUTION_USER":
      inst_id = current_user.institution_id
  else:
      inst_id = payload.institution_id or "INST-DEMO-001"
  ```
* **Architectural Assessment:** Reviewers viewing the scrutiny workspace are presented with a button to author applications. When clicked, the modal allows selecting any institution and creating applications in `DRAFT` status. This breaks regulatory separation of duties.

### B. The "Upload Document" Action
* **UI Trigger Locations:**
  1. `frontend/src/App.tsx` (Line 520): Main navigation header action button displayed to all authenticated users including Reviewers:
     ```tsx
     <button onClick={() => setUploadModalOpen(true)} className="flex items-center ...">
       <Upload className="w-3.5 h-3.5 mr-1" />
       Upload Document
     </button>
     ```
  2. `frontend/src/components/dashboard/DashboardView.tsx` (Line 179): Secondary action button in Reviewer Overview.
  3. `frontend/src/components/DocumentsView.tsx` (Line 94): Header button in global documents table.
* **Component Rendered:** `DocumentUploadModal.tsx`.
* **API Endpoint Invoked:** `POST /api/v1/applications/{application_id}/documents`.
* **Backend Authorization Behavior (`backend/app/api/v1/endpoints/documents.py:143–155`):**
  The endpoint only restricts callers if `current_user.role == "INSTITUTION_USER"`. If a `REVIEWER` or `ADMIN` uploads a file, it succeeds for any application.
* **Architectural Assessment:** Uploading raw institutional statutory proofs (e.g., land deeds, building plans) on behalf of an institution invalidates non-repudiation. Reviewers must only inspect submitted documents in read-only mode.

---

## 5. Application Lifecycle and Scrutiny-Job State Analysis

### Application Lifecycle State Machine

```
   ┌──────────────────────────────────────────────────────────────┐
   │                          [DRAFT]                             │
   │  - Applicant edits declared metrics & uploads documents      │
   │  - Excluded from Reviewer Scrutiny Queue                     │
   └──────────────────────────────┬───────────────────────────────┘
                                  │ POST /submit (Validates Checklist)
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                        [SUBMITTED]                           │
   │  - Application locked against editing (409 Conflict)         │
   │  - Visible in Scrutiny Queue with Readiness Assessment       │
   └──────────────┬───────────────────────────────────────────────┘
                  │ POST /scrutiny-jobs (Triggers AI Scrutiny)
                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                     [UNDER_SCRUTINY]                         │
   │  - ScrutinyJob QUEUED -> PROCESSING                          │
   │  - Local OCR, Validation, and Anomaly Engines execute        │
   └──────────────┬───────────────────────────────┬───────────────┘
                  │ Scrutiny Completes            │ Deficiencies
                  ▼                               ▼
   ┌──────────────────────────────┐ ┌─────────────────────────────┐
   │     [SCRUTINY_COMPLETED]     │ │      [ACTION_REQUIRED]      │
   │  - Findings confirmed/cleared│ │  - Critical violations found│
   │  - Report generated          │ │  - Clarification requested  │
   └──────────────────────────────┘ └─────────────────────────────┘
```

### Separation of Concerns: Scrutiny Job vs Application Lifecycle
* `Application.lifecycle_status`: Represents the formal regulatory administrative state (`DRAFT`, `SUBMITTED`, `UNDER_SCRUTINY`, `ACTION_REQUIRED`, `SCRUTINY_COMPLETED`).
* `Application.pipeline_status`: High-level aggregate status of the automated processing pipeline (`NOT_STARTED`, `PROCESSING`, `COMPLETED`, `FAILED`).
* `ScrutinyJob.status`: The operational state of an individual scrutiny task (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`).

### Verified State Guarantees
1. **Pre-Submission Checklist Validation:** In `endpoints/applications.py:381–451`, `submit_application()` enforces that mandatory fields (`category_code`, `academic_year`, `declared_land_acres`, `declared_built_up_area_sqm`) are present and positive, and validates that all mandatory statutory checklist items for the application category are uploaded (`SUBMISSION_CHECKLIST_INCOMPLETE`).
2. **Post-Submission Immutability:** In `endpoints/applications.py:308–312`, `update_draft_application()` verifies:
   ```python
   if app.lifecycle_status != "DRAFT":
       raise ConflictException("APPLICATION_LOCKED", f"Application '{application_id}' is locked (status: {app.lifecycle_status}).")
   ```
3. **Draft Exclusion in Scrutiny Queue:** In `services/workflow.py:714–715`, `list_scrutiny_queue()` filters the query explicitly:
   ```python
   stmt = stmt.where(Application.lifecycle_status.in_(["SUBMITTED", "UNDER_SCRUTINY", "ACTION_REQUIRED"]))
   ```
   Draft applications never appear in the reviewer scrutiny queue.
4. **Concurrency & Duplicate Job Prevention:** In `services/scrutiny_job.py:41–51`, `create_and_start_scrutiny_job()` queries for existing active jobs:
   ```python
   existing_active = db.scalar(
       select(ScrutinyJob).where(
           ScrutinyJob.application_id == application_id,
           ScrutinyJob.status.in_(["QUEUED", "PROCESSING"]),
       )
   )
   if existing_active:
       raise ConflictException("SCRUTINY_JOB_ALREADY_ACTIVE", f"An active scrutiny job ({existing_active.id}) is already running.")
   ```

---

## 6. Document Organization and Institution-Isolation Findings

### Data Model Hierarchy
* An institution (`Institution`) has many applications (`Application`).
* An application (`Application`) has many documents (`Document`).
* A document (`Document`) belongs to an application (`application_id`). Institution ownership is resolved via `Application.institution_id`.
* Extracted candidate fields (`ExtractedField`) and document classifications (`DocumentClassification`) are tied to `Document.id`.
* Scrutiny findings (`Finding`) link to `application_id`, optionally pointing to `document_id`, `page_number`, and `evidence_text`.

### Document Isolation Deficiencies
1. **Global Document Registry Leak:** In `endpoints/documents.py:301–352`, `list_all_documents()` executes:
   ```python
   stmt = select(Document).where(Document.deleted_at.is_(None))
   ```
   There is **no user authentication dependency, no role check, and no tenant filter**. Any caller can view file metadata, SHA-256 hashes, and application IDs across the entire platform.
2. **Flat Documents View in Frontend:** `frontend/src/components/DocumentsView.tsx` calls `fetchAllDocuments()`. The UI displays a single unified table where documents from Meridian Institute, Apex Global, and Bharat Polytechnic are commingled without institution or application grouping.
3. **Single Document Metadata Exposure:** `GET /api/v1/documents/{document_id}` uses `get_optional_current_user`. If no `Authorization` header is provided, the institutional tenant isolation check is skipped, returning the document record.
4. **Download Endpoint Isolation (Properly Protected):** In `endpoints/documents.py:444–470`, `retrieve_document_file()` strictly enforces:
   ```python
   if current_user.role == "INSTITUTION_USER":
       app_obj = db.get(Application, doc.application_id)
       if not app_obj or current_user.institution_id != app_obj.institution_id:
           raise ForbiddenException("FORBIDDEN", "Access to documents from another institution is denied.")
   ```
   Binary files are properly protected, but metadata is leaked through the unauthenticated endpoints.

---

## 7. AI Integration-Boundary Assessment

### Authoritative Entry Point & Orchestration
The scrutiny engine is initiated via `POST /api/v1/scrutiny-jobs`. The orchestration flow:
1. `create_and_start_scrutiny_job()` creates a persistent `ScrutinyJob` in `QUEUED` state.
2. The endpoint registers `execute_scrutiny_job` with FastAPI `BackgroundTasks`.
3. `execute_scrutiny_job()` marks the job `PROCESSING` and invokes `start_or_resume_workflow()`.
4. The workflow coordinator invokes:
   - `extract_all_documents()` in `extraction.py`.
   - `run_application_validation()` in `validation.py`.
   - `run_application_analysis()` in `anomaly.py`.
5. Upon completion, the job is marked `COMPLETED` and the application status updates to `UNDER_SCRUTINY` or `SCRUTINY_COMPLETED`.

### Execution Environment: 100% Local by Default
* **OCR & Text Parsing:** Executed locally via `pymupdf` (fitz) with raster fallback to `rapidocr_onnxruntime`. Operates without internet access or GPU requirement.
* **Deterministic Validation:** Executed locally via Python business rule evaluators in `validation.py`.
* **Cross-Document Anomaly Detection:** Compares extracted metrics across documents (e.g., land area in Title Deed vs Land Registration vs Application Form) using regex and Python math.
* **External LLM Provider Coupling:** In `services/anomaly.py:168–217`, an HTTP client connects to a local Ollama instance (`http://localhost:11434/api/generate`). It is configured via environment variables (`LLM_ENABLED`, `LLM_BASE_URL`, `LLM_MODEL`). When `LLM_ENABLED=False` (the default), the system operates in pure deterministic heuristic mode without throwing errors.
* **Recommended Adapter Pattern:** Although the system degrades gracefully offline, model-calling logic is directly embedded in `services/anomaly.py`. A formalized `ScrutinyProvider` interface is recommended to decouple model invocation from the application business layer.

---

## 8. Security and Resilience Findings

### 1. Tenant Isolation
* **Verified:** File downloads (`GET /api/v1/documents/{id}/file`) and application submission (`POST /api/v1/applications/{id}/submit`) enforce strict tenant ownership for `INSTITUTION_USER`.
* **Vulnerable:** `GET /api/v1/documents` and `GET /api/v1/applications/{id}/validation-summary` lack tenant scoping and allow cross-institution visibility.

### 2. Authorization on Mutating Endpoints
* **Vulnerable:** `POST /api/v1/applications` permits Reviewers and Admins to author applications. `PATCH /api/v1/applications/{id}` allows Reviewers to modify draft application declarations.
* **Vulnerable:** `POST /api/v1/applications/{id}/documents` allows Reviewers to upload files to any application.

### 3. Background Job Crash Recovery
* **Vulnerable:** Background scrutiny jobs execute via FastAPI's in-memory `BackgroundTasks`. If the backend process crashes, restarts, or receives a SIGTERM during execution:
  - The executing thread dies immediately.
  - The SQLite `ScrutinyJob` remains stuck in `PROCESSING` indefinitely.
  - No startup reconciliation worker exists to detect orphaned jobs and transition them to `FAILED` or reschedule them.

### 4. Upload Safety & Storage Integrity
* **Verified:** Uploads validate file size (25MB limit), check magic bytes/MIME types, and store files outside public directories using UUID storage keys.
* **Verified:** Path traversal is prevented through `resolve_storage_path()` in `backend/app/core/storage.py`.

### 5. Audit Logging Integrity
* **Verified:** State transitions, finding reviews, and document downloads write persistent records to `AuditEvent` and `ReviewAction` models with actor ID, IP address, and timestamps.
* **Vulnerable:** Application creation via `create_application()` does not record an audit event.

---

## 9. Test Evidence

### Tests Executed and Verified
* **Backend Test Suite:** Executed `pytest tests/` in the local virtual environment.
  - **Command:** `pytest tests/`
  - **Result:** **249 passed in 34.02s**.
  - **Suites Verified:**
    - `test_applications.py`: 12 passed (Draft creation, checklist validation, submission locking, tenant checks).
    - `test_persistence.py`: 12 passed (Database persistence, cascade deletions, rollback integrity).
    - `test_security.py`: 15 passed (Role guards, path traversal prevention, token expiration).
    - `test_scrutiny_jobs.py`: 8 passed (Job creation, duplicate prevention, status transitions).
    - `test_workflow.py`: 14 passed (State machine transitions, readiness scoring, queue filtering).
    - `test_validation.py`: 18 passed (Deterministic regulatory rule evaluation).
    - `test_anomalies.py`: 16 passed (Cross-document discrepancy detection).
* **Frontend Static Verification:**
  - **Command:** `npm run lint`
  - **Result:** **0 errors**, 35 warnings (unused variables/imports).
  - **Command:** `npm run build`
  - **Result:** **Built successfully in 227ms** (Vite production bundle generated without errors).

---

## 10. Prioritized Issues

### Critical Priority (Security & Access Control)
* **[CRIT-01] Unauthenticated Document Enumeration:** `GET /api/v1/documents` exposes all uploaded documents across all institutions without authentication.
* **[CRIT-02] Reviewer Application Creation & Modification:** `POST /api/v1/applications` and `PATCH /api/v1/applications/{id}` allow Reviewers to create and edit applicant institutional declarations.
* **[CRIT-03] Unauthenticated Scrutiny Summary Access:** `GET /api/v1/applications/{id}/review-summary` and `GET /api/v1/applications/{id}/validation-summary` can be queried by unauthenticated callers without institutional validation.

### High Priority (Workflow & Operational Integrity)
* **[HIGH-01] "New Application" and "Upload Document" UI Placement:** Reviewer overview and table headers expose applicant authoring actions to scrutiny officers.
* **[HIGH-02] In-Memory Background Job Non-Resilience:** Scrutiny jobs interrupted by process termination remain permanently stuck in `PROCESSING`.
* **[HIGH-03] Commingled Document Repository:** The Documents view presents a flat, global table rather than grouping documents by institution and application.

### Medium Priority (Architecture & State Machine)
* **[MED-01] Direct LLM Coupling in Anomaly Engine:** AI provider call logic is embedded directly in `services/anomaly.py` rather than behind a clean adapter interface.
* **[MED-02] Application State Machine Terminology:** Need explicit alignment on semantic state aliases (`NEEDS_CLARIFICATION` vs `ACTION_REQUIRED`).

### Low Priority (UI Polish & Code Hygiene)
* **[LOW-01] Frontend Lint Warnings:** 35 unused variable warnings in frontend components.
* **[LOW-02] Audit Log Retrieval Limit:** Global audit log query capped at 100 entries without offset-based pagination.

---

## 11. Recommended Phase 7 Implementation Scope

Phase 7 should execute a focused remediation strictly bounded by the following work packages:

1. **Work Package 1: Backend RBAC & Tenant Scoping Hardening**
   - Restrict `POST /api/v1/applications` so only `INSTITUTION_USER` can create applications (Admins can be granted on-behalf creation if explicitly required). Reviewers must receive `403 Forbidden`.
   - Restrict `PATCH /api/v1/applications/{id}` to verify that Reviewers cannot modify application draft declarations.
   - Enforce authentication and tenant isolation on `GET /api/v1/documents`, `GET /api/v1/documents/{id}`, and `GET /api/v1/applications/{id}/validation-summary`.
2. **Work Package 2: Role-Aware UI Cleanup**
   - Remove "New Application" and general "Upload Document" buttons from `DashboardView.tsx` and `ApplicationList.tsx` for `REVIEWER` roles.
   - Restrict document upload capabilities to the applicant intake workflow and dossier-specific upload controls.
3. **Work Package 3: Document Organization & Dossier Grouping**
   - Update `DocumentsView.tsx` to group documents hierarchically: `Institution -> Application -> Statutory Category`.
   - Provide applicants with their application-scoped document list, and reviewers with an application scrutiny dossier.
4. **Work Package 4: Scrutiny Job Crash Recovery**
   - Implement a lightweight startup check in FastAPI lifespan events (`app/main.py`) that marks interrupted `PROCESSING` jobs as `FAILED` (with reason `"SYSTEM_RESTART_DURING_EXECUTION"`) and allows manual retry.
5. **Work Package 5: Formalized AI Scrutiny Adapter**
   - Extract the LLM query mechanism into an abstract provider interface (`app/services/ai/adapter.py`) supporting local heuristics, local Ollama, and mock providers via configuration.

---

## 12. Explicitly Deferred Work for Later Phases

To preserve focus on hackathon delivery and avoid architectural over-engineering, the following items are **explicitly deferred**:
1. **Official AICTE Database Integration:** Direct automated integration with AICTE central databases or institutional ERPs is deferred (requires government credentials and authorized API access).
2. **Distributed Queue Infrastructure:** Replacing FastAPI background tasks with Celery, Redis, or RabbitMQ is deferred. SQLite persistence with startup reconciliation provides adequate prototype resilience.
3. **External Cloud LLM Providers:** Integration with paid third-party AI APIs (OpenAI, Anthropic) is deferred to prevent secret management overhead and external cost dependencies.
4. **Complete Frontend Redesign:** Broad visual restyling or framework migrations are deferred. Phase 7 will focus strictly on role-based component visibility and dossier organization.
5. **Production DigiLocker / Aadhaar SSO:** Institutional applicant authentication via official government identity providers is deferred; existing JWT role-based authentication is maintained.
