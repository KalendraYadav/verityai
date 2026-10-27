# PHASE 1 — MASTER SYSTEM ARCHITECTURE AND GAP ANALYSIS SPECIFICATION
**Project:** VerityAI (Smart India Hackathon 2026 Prototype)  
**Document ID:** `docs/aicte-audit/PHASE_1_ARCHITECTURE_SPECIFICATION.md`  
**Phase:** PHASE 1 — Architecture and Gap Analysis Specification  
**Status:** SPECIFICATION ONLY (Zero code modifications, zero schema changes)  
**Date:** October 25, 2026  
**Auditor / System Architect:** Senior Full-Stack Engineer, Application Security Engineer, Database Architect & QA Lead  

---

## 1. Executive Summary & Objective

In accordance with the **Master System Design and Implementation Directive** and **AGENTS.md**, this specification establishes the authoritative architectural blueprint for extending VerityAI into an integration-ready institutional scrutiny platform suitable for a live **two-computer demonstration**:

* **Computer A (Institutional Applicant):**
  - Authenticates as an authorized institutional representative (`INSTITUTION_USER`).
  - Accesses a dedicated, clean, scrutiny-free Institutional Application Portal.
  - Creates, edits, and saves application drafts for their assigned institution.
  - Uploads statutory supporting documents (PDF/images) with instant cryptographic hashing and format validation.
  - Executes a formal, validated application submission with an explicit application reference number.
  - Monitors processing and scrutiny progression without exposing internal algorithmic findings or fraud indicators.
  - Strictly tenant-isolated: under no circumstances can Computer A access or tamper with another institution's applications or documents.

* **Computer B (Regulatory Scrutiny Officer):**
  - Authenticates as an authorized scrutiny officer (`REVIEWER`) or regulatory administrator (`ADMIN`).
  - Accesses the centralized Scrutiny Inbox / Queue.
  - Observes submitted applications appearing from Computer A via the shared database.
  - Inspects submitted institutional dossiers, declared parameters, and uploaded files.
  - Explicitly triggers VerityAI scrutiny.
  - Tracks persistent scrutiny job progression through an explicit state machine.
  - Examines evidence-linked findings, cross-document comparison signals, and statutory norm evaluations.
  - Records permitted review decisions and generates official PDF/JSON Scrutiny Dossiers.
  - Retains an immutable audit trail of all submission, scrutiny, and review actions.

* **Shared Backend and Authoritative Persistence:**
  - Both computers access the **exact same deployed backend and persistent database**.
  - Submissions from Computer A are immediately visible to Computer B through authoritative database queries.
  - Browser `localStorage` is never used as an authoritative database.
  - The existing VerityAI AI processing engine, deterministic validation rules, anomaly indicators, and evidence provenance chains are **strictly preserved and protected without alteration or mocking**.

---

## 2. Baseline vs. Target Gap Analysis Matrix

The table below contrasts verified capabilities identified during Phase 0 against the target requirements:

| Architectural Component | Verified Existing Capability (Baseline) | Target Specification (Directive) | Identified Gap | Architectural Resolution in Phase 2+ |
| :--- | :--- | :--- | :--- | :--- |
| **Applicant Experience (Computer A)** | Institutional user (`INSTITUTION_USER`) shares identical navigation and views with Reviewers, seeing Scrutiny Queue, Validation Norms, and Scrutiny Dossier controls. | Dedicated, clean Applicant Portal. Shows only own institutional applications, document uploader, draft saving, submission tracking, and application reference number. | **High:** Applicant sees internal regulatory tools and scrutiny actions. | Implement dedicated `ApplicantPortalView.tsx` and role-tailored navigation in `AppShell.tsx`. Suppress reviewer tabs for `INSTITUTION_USER`. |
| **Tenant Isolation (Applications)** | `GET /api/v1/applications` accepts optional `institution_id` query param but does not enforce it against `current_user.institution_id`. `POST /api/v1/applications` falls back to `_get_or_create_demo_user`. | Strict server-side tenant isolation: `INSTITUTION_USER` can only view, create, and submit applications for their own bound `institution_id`. | **High:** Cross-tenant leakage possible via direct API queries. | Update `applications.py` to enforce `current_user.institution_id` filter when `current_user.role == "INSTITUTION_USER"`. |
| **Application Submission Lifecycle** | Applications are created as `DRAFT`. State transitions are handled via `/workflow/transitions` or automatically when validated. | Clear explicit applicant action: "Submit Application". Enforces completeness checklist before submission, locks draft editing, updates audit log, sets `submitted_at`. | **Medium:** Submission is not gated on statutory checklist completeness. | Add dedicated `POST /api/v1/applicant/applications/{id}/submit` endpoint verifying mandatory documents via `evaluate_conditional_checklist`. |
| **Document Management & Ownership** | Uploads accept any `application_id`. Download enforces tenant check only if `current_user.institution_id` matches document owner institution. | Document upload, download, and deletion strictly scoped to the application owner's institution. Draft deletion allowed; locked post-submission. | **Medium:** Upload endpoint does not verify that applicant owns the target application. | Enforce application ownership check in `documents.py` before accepting upload or deleting document. |
| **Scrutiny Job Persistence & State Machine** | Scrutiny runs synchronously inside `start_or_resume_workflow` and updates `pipeline_status`. | A formal, persistent `ScrutinyJob` entity (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) to ensure idempotency and long-running job safety. | **Medium:** Scrutiny runs synchronously; no separate job entity for long-running tracking. | Introduce `ScrutinyJob` model and `/api/v1/scrutiny/jobs` endpoints wrapping `start_or_resume_workflow`. |
| **Officer Workspace (Computer B)** | Scrutiny Queue (`ScrutinyQueueView`), Application Dossier (`ApplicationDetailWorkspace`), and PDF reporting are functional. | Officer logs in on Computer B, immediately sees newly submitted applications from Computer A in Scrutiny Queue, runs scrutiny, reviews findings, records decision. | **Low / Aligned:** Existing scrutiny workspace satisfies this requirement once applicant submission is completed. | Connect Scrutiny Queue directly to submitted applications and integrate with `ScrutinyJob` polling. |
| **Shared Network Deployment** | Configured for `localhost` / `127.0.0.1` development. | Both computers connect across local area network (LAN) to a single backend running on `0.0.0.0:8000`. | **Medium:** CORS, cookie `SameSite`, and Vite dev proxy must support LAN IP access. | Configure host binding on `0.0.0.0`, configure CORS for LAN client IPs, set cookie security appropriate for HTTP LAN testing. |

---

## 3. Institutional Applicant Portal Specification (Computer A)

### 3.1 User Persona & Identity
* **Role:** `INSTITUTION_USER` (Institutional Representative / Registrar).
* **Seeded Demo Account:** `operator@verityai.gov.in` (Bound to `INS-0001`: Apex Institute of Technology).
* **Bound Entity:** `User.institution_id` is mandatory and immutable.

### 3.2 Tenant Isolation Guarantee
All applicant actions must derive institutional identity strictly from authenticated server-side session context:
1. When `current_user.role == "INSTITUTION_USER"`, the backend automatically injects `where(Application.institution_id == current_user.institution_id)`.
2. Any client-supplied `institution_id` in request payloads or headers that differs from `current_user.institution_id` is strictly rejected with `HTTP 403 Forbidden` (`code: FORBIDDEN`, `"Cannot create or modify applications for another institution"`).
3. Attempting to access an application or document belonging to another institution returns `HTTP 403 Forbidden` or `HTTP 404 Not Found`.

### 3.3 Applicant Portal Interface Architecture
When an `INSTITUTION_USER` authenticates, the application shell presents a specialized applicant workspace:
* **Sidebar Navigation:**
  - **Dashboard:** Submission overview, application count, current status.
  - **My Applications:** Register of the institution's draft, submitted, and completed applications.
  - **New Application:** Multi-step wizard to initiate a new statutory approval application.
  - **Document Center:** Repository of uploaded institutional certificates.
* **Suppressed Navigation:** The applicant never sees:
  - Scrutiny Queue
  - Validation Norms Catalog
  - AI Anomaly Detectors
  - Statutory Registries
  - Regulatory Gateways
  - Global Audit Trail
  - User Administration

### 3.4 Application Lifecycle for Applicant
```
[Applicant creates draft]
   │  - Selects category (e.g., Extension of Approval 2026-27)
   │  - Enters declared data (Intake, Principal Name, Land Area)
   │  - System generates stable reference: VAI-2026-XXXX
   ▼
[Status: DRAFT]
   │  - Applicant uploads mandatory supporting documents
   │  - System extracts text & verifies document readability
   │  - Applicant reviews uploaded files and completeness checklist
   ▼
[Applicant clicks "Submit Application"]
   │  - Server validates conditional document checklist
   │  - If mandatory documents missing ──► Returns 400 Bad Request with missing items
   │  - If complete:
   │      * application.lifecycle_status = "SUBMITTED"
   │      * application.submitted_at = UTC NOW
   │      * Records audit event: "APPLICATION_SUBMITTED"
   │      * Locks application (no further uploads/deletions)
   ▼
[Status: SUBMITTED]
   │  - Application appears in Officer Scrutiny Queue on Computer B
   │  - Applicant sees "Application submitted successfully. Awaiting scrutiny."
   ▼
[Status: UNDER_SCRUTINY]
   │  - Officer on Computer B triggers scrutiny
   │  - Applicant view reflects "Under Official Scrutiny"
   ▼
[Status: ACTION_REQUIRED / SCRUTINY_COMPLETED]
   │  - Applicant sees final status banner and official notice
   │  - Detailed internal anomaly scores remain restricted to officers
```

---

## 4. Regulatory Officer Workspace Specification (Computer B)

### 4.1 User Persona & Identity
* **Role:** `REVIEWER` (Scrutiny Officer) or `ADMIN` (Regulatory Administrator).
* **Seeded Demo Accounts:**
  - Reviewer: `reviewer@verityai.gov.in`
  - Admin: `admin@verityai.gov.in`

### 4.2 Officer Workspace Interface Architecture
* **Scrutiny Queue (`ScrutinyQueueView`):**
  - Displays submitted applications from all institutions awaiting scrutiny.
  - Shows institution name, category, academic year, submission timestamp, document readiness count, and assigned reviewer.
  - Offers sorting and filtering by readiness state (`READY_FOR_SCRUTINY`, `DOCUMENTS_PENDING`).
* **Scrutiny Dossier Workspace (`ApplicationDetailWorkspace`):**
  - **Top Actions:** "Run VerityAI Scrutiny", "Generate Scrutiny Dossier (PDF)", "Request Additional Evidence", "Record Review Decision".
  - **Multi-Tab Inspection Panels:**
    1. *Application Overview:* Declared fields, institutional metadata, submission audit timestamp.
    2. *Document Repository:* Multi-page preview, OCR extraction quality band, text source mix, table extraction view.
    3. *Deterministic Validation:* Rule-by-rule evaluation against APH 2024-27 norms (FSR, administrative area, amenities, land title, expiry).
    4. *Cross-Document Anomalies:* 6 anomaly detection indicators with side-by-side evidence comparison cards.
    5. *Review Adjudication:* Structured recording of officer decisions (`CONFIRM`, `DISMISS`, `REQUEST_EVIDENCE`, `RESOLVE`).
    6. *Official Reports:* Downloadable PDF Scrutiny Dossier with verification hash.
    7. *Audit Trail:* Chronological event ledger of all system and user operations.

---

## 5. Persistent Scrutiny Job State Machine & Orchestration

### 5.1 Architectural Rationale
In the current baseline, scrutiny is invoked via `POST /api/v1/applications/{id}/workflow/start`, which executes validation and anomaly analysis synchronously. While acceptable for small documents (1-3 seconds), an enterprise two-computer demonstration requires:
1. **Asynchronous Resilience:** Decoupling long-running OCR and AI inference from synchronous HTTP connection timeouts.
2. **Idempotency Protection:** Preventing concurrent or duplicate scrutiny requests against the same application.
3. **State Visibility:** Enabling Computer B (and Computer A) to poll job progress through explicit states without blocking the UI.
4. **Failure Containment:** Safely recording background worker crashes without reporting false completions.

### 5.2 Scrutiny Job Entity (`ScrutinyJob`)

```
                          ┌───────────────┐
                          │    QUEUED     │
                          └───────┬───────┘
                                  │ Worker picks up job
                                  ▼
                          ┌───────────────┐
                     ┌───►│  PROCESSING   │◄───┐
                     │    └───────┬───────┘    │
                     │            │            │
         Validation  │            │ Pipeline   │ Anomaly
         Engine Runs │            │ Executes   │ Detection Runs
                     │            │            │
                     │            ▼            │
                     │    ┌───────────────┐    │
                     └────┤   COMPLETED   ├────┘
                          └───────────────┘
                                  │
                   (On unhandled worker exception)
                                  ▼
                          ┌───────────────┐
                          │    FAILED     │
                          └───────────────┘
```

### 5.3 Valid States & State Transitions

| State | Definition | Permitted Next States | Side Effects |
| :--- | :--- | :--- | :--- |
| `QUEUED` | Job created by authorized officer; waiting for worker thread execution. | `PROCESSING`, `FAILED` | `started_at` is NULL; application `pipeline_status = "QUEUED"`. |
| `PROCESSING` | Worker thread has begun executing deterministic validation and anomaly detection. | `COMPLETED`, `FAILED` | `started_at = UTC NOW`; application `pipeline_status = "PROCESSING"`. |
| `COMPLETED` | Validation engine and anomaly detection finished successfully. Results persisted. | None (terminal) | `completed_at = UTC NOW`; `duration_ms` calculated; application `pipeline_status` updated to `COMPLETED`, `NEEDS_REVIEW`, or `VALIDATION_FAILED`. Audit event recorded. |
| `FAILED` | Unrecoverable error occurred during processing (e.g. image decode error, database lock). | None (terminal) | `completed_at = UTC NOW`; `error_code` and `safe_error_summary` recorded. Application `pipeline_status = "FAILED"`. |

### 5.4 Call Chain to Existing VerityAI Pipeline
The scrutiny job orchestration service will invoke the authoritative AI pipeline without duplicating or altering any logic:

```python
def execute_scrutiny_job(job_id: str, db: Session) -> ScrutinyJob:
    job = db.get(ScrutinyJob, job_id)
    job.status = "PROCESSING"
    job.started_at = datetime.now(timezone.utc)
    db.commit()

    try:
        # 1. Invoke authoritative pipeline entry point (PROTECTED ASSET)
        workflow_res = start_or_resume_workflow(
            db=db,
            application_id=job.application_id,
            actor_id=job.triggered_by
        )

        # 2. Map pipeline outputs to job entity
        job.status = "COMPLETED"
        job.completed_at = datetime.now(timezone.utc)
        job.duration_ms = int((job.completed_at - job.started_at).total_seconds() * 1000)
        job.stage_details = {k: v.model_dump() for k, v in workflow_res.stages.items()}
        job.results_summary = {
            "pipeline_status": workflow_res.pipeline_status,
            "lifecycle_status": workflow_res.lifecycle_status,
        }
        db.commit()
        return job

    except Exception as exc:
        db.rollback()
        job.status = "FAILED"
        job.completed_at = datetime.now(timezone.utc)
        job.error_code = "PIPELINE_EXECUTION_ERROR"
        job.safe_error_summary = "An unexpected error occurred during scrutiny execution."
        db.commit()
        return job
```

---

## 6. Required Database Changes & Migration Safety

### 6.1 Schema Design Principles
1. **Zero Breaking Changes:** Existing tables (`applications`, `documents`, `validation_runs`, `findings`, `reports`) remain untouched in their primary structure.
2. **PostgreSQL Compatibility:** All types use standard SQLAlchemy types (`String(36)`, `DateTime(timezone=True)`, `JSON`, `Integer`).
3. **Foreign Key Integrity:** Foreign keys use `ondelete="CASCADE"` or `ondelete="RESTRICT"` as appropriate, preserving audit logs.

### 6.2 New Table: `scrutiny_jobs`

```sql
CREATE TABLE scrutiny_jobs (
    id VARCHAR(36) PRIMARY KEY,
    application_id VARCHAR(36) NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    job_type VARCHAR(50) NOT NULL DEFAULT 'FULL_SCRUTINY',
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    triggered_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    started_at TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    duration_ms INTEGER NULL,
    error_code VARCHAR(100) NULL,
    safe_error_summary TEXT NULL,
    stage_details JSON NOT NULL DEFAULT '{}',
    results_summary JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_scrutiny_jobs_application_id ON scrutiny_jobs(application_id);
CREATE INDEX ix_scrutiny_jobs_status ON scrutiny_jobs(status);
CREATE INDEX ix_scrutiny_jobs_created_at ON scrutiny_jobs(created_at);
```

### 6.3 Optional Enhancement to `applications`
* Add nullable column: `current_scrutiny_job_id VARCHAR(36) NULL REFERENCES scrutiny_jobs(id) ON DELETE SET NULL`.
* Provides fast lookup from application to its latest active or completed scrutiny job.

### 6.4 Migration & Rollback Strategy
* **Alembic Migration:** A single new migration script `xxxx_add_scrutiny_jobs_table.py`.
* **Rollback Safety:** `downgrade()` simply drops `scrutiny_jobs` and the nullable foreign key. Zero risk to existing data.

---

## 7. API Contract Specification

### 7.1 Applicant Endpoints (Computer A)

#### 1. List Institutional Applications
* **Method & Path:** `GET /api/v1/applicant/applications`
* **Auth Requirement:** Session Cookie (`access_token`)
* **Allowed Roles:** `INSTITUTION_USER`
* **Tenant Check:** Strictly forced to `current_user.institution_id`.
* **Query Params:** `page` (int), `page_size` (int), `lifecycle_status` (str)
* **Response (200 OK):** `PaginatedResponse[ApplicationListItem]`

#### 2. Create Draft Application
* **Method & Path:** `POST /api/v1/applicant/applications`
* **Auth Requirement:** Session Cookie + `X-Requested-With: VerityAI`
* **Allowed Roles:** `INSTITUTION_USER`
* **Payload:**
  ```json
  {
    "category_code": "EOA_ILLUSTRATIVE",
    "academic_year": "2026-27",
    "declared_data": {
      "institution_name": "Apex Institute of Technology (Synthetic)",
      "approved_intake": 480,
      "land_area_acres": 5.25
    }
  }
  ```
* **Tenant Check:** Server derives `institution_id` from `current_user.institution_id`.
* **Response (201 Created):** `DataResponse[ApplicationResponse]`

#### 3. Upload Supporting Document
* **Method & Path:** `POST /api/v1/applicant/applications/{application_id}/documents`
* **Auth Requirement:** Session Cookie + `X-Requested-With: VerityAI`
* **Allowed Roles:** `INSTITUTION_USER`
* **Form Data:** `file` (binary), `declared_type` (str)
* **Validation:** Application must belong to `current_user.institution_id` and have `lifecycle_status == "DRAFT"`.
* **Response (202 Accepted):** `DataResponse[DocumentUploadResponseData]`

#### 4. Submit Application for Official Scrutiny
* **Method & Path:** `POST /api/v1/applicant/applications/{application_id}/submit`
* **Auth Requirement:** Session Cookie + `X-Requested-With: VerityAI`
* **Allowed Roles:** `INSTITUTION_USER`
* **Pre-conditions:**
  1. Application exists and belongs to `current_user.institution_id`.
  2. `lifecycle_status == "DRAFT"`.
  3. `evaluate_conditional_checklist` returns zero missing mandatory documents.
* **Side Effects:**
  - `lifecycle_status = "SUBMITTED"`
  - `submitted_at = UTC NOW`
  - Records `APPLICATION_SUBMITTED` audit event.
* **Response (200 OK):**
  ```json
  {
    "data": {
      "application_id": "APP-2026-0001",
      "application_reference": "VAI-2026-0001",
      "lifecycle_status": "SUBMITTED",
      "submitted_at": "2026-10-25T02:30:00Z",
      "message": "Application submitted successfully for regulatory scrutiny."
    }
  }
  ```

---

### 7.2 Officer & Scrutiny Job Endpoints (Computer B)

#### 1. Trigger VerityAI Scrutiny Job
* **Method & Path:** `POST /api/v1/applications/{application_id}/scrutiny-jobs`
* **Auth Requirement:** Session Cookie + `X-Requested-With: VerityAI`
* **Allowed Roles:** `REVIEWER`, `ADMIN`
* **Payload:** `{ "job_type": "FULL_SCRUTINY" }`
* **Pre-conditions:**
  1. Application exists and has `lifecycle_status IN ('SUBMITTED', 'UNDER_SCRUTINY', 'ACTION_REQUIRED')`.
  2. No active job in `QUEUED` or `PROCESSING` state for this application (prevents duplicate runs).
* **Response (202 Accepted):**
  ```json
  {
    "data": {
      "job_id": "JOB-9F8A2B1C",
      "application_id": "APP-2026-0001",
      "job_type": "FULL_SCRUTINY",
      "status": "QUEUED",
      "triggered_by": "USR-REVIEWER-VERITY",
      "created_at": "2026-10-25T02:31:00Z"
    }
  }
  ```

#### 2. Get Scrutiny Job Status & Stage Progress
* **Method & Path:** `GET /api/v1/scrutiny-jobs/{job_id}`
* **Auth Requirement:** Session Cookie
* **Allowed Roles:** `REVIEWER`, `ADMIN` (and `INSTITUTION_USER` if owning the application, with sanitized findings)
* **Response (200 OK):**
  ```json
  {
    "data": {
      "job_id": "JOB-9F8A2B1C",
      "application_id": "APP-2026-0001",
      "status": "COMPLETED",
      "started_at": "2026-10-25T02:31:01Z",
      "completed_at": "2026-10-25T02:31:04Z",
      "duration_ms": 2840,
      "stage_details": {
        "documents": { "status": "COMPLETE", "summary": "6 documents verified" },
        "extraction": { "status": "COMPLETE", "summary": "6 processed, 0 failed" },
        "validation": { "status": "COMPLETE", "summary": "4 passed, 2 review required" },
        "anomalies": { "status": "COMPLETE", "summary": "1 finding discovered" },
        "decision": { "status": "UNDER_REVIEW", "summary": "Lifecycle: UNDER_SCRUTINY" }
      },
      "results_summary": {
        "pipeline_status": "NEEDS_REVIEW",
        "validation_passed": 4,
        "validation_failed": 0,
        "anomalies_detected": 1
      }
    }
  }
  ```

#### 3. Backward Compatibility Anchor
* The existing endpoint `POST /api/v1/applications/{application_id}/workflow/start` remains 100% active and supported, internally wrapping the scrutiny job service so existing pytest and E2E tests continue to pass without modification.

---

## 8. Role-Based Permissions & Authorization Matrix

| Action / Endpoint | Anonymous | `INSTITUTION_USER` (Applicant) | `REVIEWER` (Officer) | `ADMIN` (Administrator) | Enforcement Code Location |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Authenticate / Sign In** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | `endpoints/auth.py` |
| **Create Application Draft** | ❌ 401 | ✅ Own Institution Only | ❌ 403 | ✅ Allowed | `endpoints/applications.py` |
| **Upload Document** | ❌ 401 | ✅ Own Application (Draft) | ❌ 403 | ✅ Allowed | `endpoints/documents.py` |
| **Submit Application** | ❌ 401 | ✅ Own Application | ❌ 403 | ✅ Allowed | `endpoints/applications.py` |
| **View Scrutiny Queue** | ❌ 401 | ❌ 403 Forbidden | ✅ Allowed | ✅ Allowed | `endpoints/workflow.py` |
| **Trigger VerityAI Scrutiny** | ❌ 401 | ❌ 403 Forbidden | ✅ Allowed | ✅ Allowed | `endpoints/workflow.py` |
| **Inspect Anomaly Evidence** | ❌ 401 | ❌ 403 Forbidden | ✅ Allowed | ✅ Allowed | `endpoints/anomalies.py` |
| **Record Review Adjudication** | ❌ 401 | ❌ 403 Forbidden | ✅ Allowed | ✅ Allowed | `endpoints/anomalies.py` |
| **Generate Official PDF Dossier**| ❌ 401 | ❌ 403 Forbidden | ✅ Allowed | ✅ Allowed | `endpoints/reports.py` |
| **User & Role Administration** | ❌ 401 | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Allowed | `endpoints/users.py` |
| **Regulatory Gateway Config** | ❌ 401 | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Allowed | `endpoints/integration.py` |

---

## 9. Two-Computer Deployment Architecture

### 9.1 Network Topology & Physical Layout
For the Smart India Hackathon 2026 live demonstration, two physical laptops connect over a local network (Wi-Fi router or Ethernet switch):

```
                        ┌──────────────────────────────────────────────┐
                        │      Server Host Laptop (or Laptop B)        │
                        │                                              │
                        │  FastAPI Backend (:8000 on 0.0.0.0)          │
                        │  Vite Production/Dev (:5173 on 0.0.0.0)      │
                        │  Authoritative SQLite (verityai.db)          │
                        └──────────────────────┬───────────────────────┘
                                               │
                        ┌──────────────────────┴───────────────────────┐
                        │ Local Area Network (192.168.1.x / DHCP)      │
                        └──────────────┬───────────────────────────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │                                           │
                 ▼                                           ▼
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│     Computer A: Applicant       │         │      Computer B: Officer        │
│                                 │         │                                 │
│  Browser: Chrome / Edge         │         │  Browser: Chrome / Edge         │
│  URL: http://192.168.1.100:5173 │         │  URL: http://192.168.1.100:5173 │
│  Login: operator@verityai.gov.in│         │  Login: reviewer@verityai.gov.in│
│  View: Applicant Portal         │         │  View: Scrutiny Officer Inbox   │
└─────────────────────────────────┘         └─────────────────────────────────┘
```

### 9.2 Configuration Directives for Multi-Host Connectivity
1. **Host Binding:**
   - Backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - Frontend: `npm run dev -- --host 0.0.0.0 --port 5173` (or Nginx reverse proxy serving `dist/`).
2. **CORS & CSRF Settings (`.env`):**
   - `BACKEND_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://192.168.1.100:5173"]` (or dynamically allowing local subnet).
   - Custom header `X-Requested-With: VerityAI` required on mutating requests.
3. **Session Cookie Configuration:**
   - `COOKIE_SECURE=False` (enables cookies over local HTTP during offline/LAN hackathon testing).
   - `COOKIE_SAMESITE="lax"`.
4. **Real-Time Status Synchronization:**
   - Instead of heavyweight WebSocket/Redis infrastructure, clients implement a lightweight, reliable **3-second polling interval** when on active queues or monitoring pending scrutiny jobs.
   - Immediate cache invalidation on local user action ensures instant UI updates.

---

## 10. Verification Strategy & Test Matrix

Before declaring any subsequent phase complete, the following test matrix must be satisfied:

| Test Identifier | Category | Verification Method | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **TEST-TENANT-01** | Security / RBAC | Direct API Test | `INSTITUTION_USER` from `INS-0001` queries `GET /api/v1/applicant/applications` ➔ returns only `INS-0001` applications. |
| **TEST-TENANT-02** | Security / RBAC | Negative API Test | `INSTITUTION_USER` attempts to access application of `INS-0002` ➔ returns HTTP 403 Forbidden. |
| **TEST-TENANT-03** | Security / RBAC | Negative API Test | `INSTITUTION_USER` attempts to download document of `INS-0002` ➔ returns HTTP 403 Forbidden. |
| **TEST-SUBMIT-01** | Workflow | API & Unit Test | Application in `DRAFT` with missing documents submits ➔ rejected with 400 Bad Request listing missing items. |
| **TEST-SUBMIT-02** | Workflow | API & Unit Test | Application in `DRAFT` with all documents submits ➔ transitions to `SUBMITTED`, sets `submitted_at`, locks uploads. |
| **TEST-JOB-01** | Orchestration | Service Test | Officer triggers scrutiny job ➔ `ScrutinyJob` created in `QUEUED`, transitions to `PROCESSING`, finishes in `COMPLETED`. |
| **TEST-JOB-02** | Idempotency | Negative API Test | Officer triggers scrutiny on application with job currently running ➔ returns HTTP 409 Conflict. |
| **TEST-AI-PRESERVE** | Integrity | Regression Test | Executing scrutiny job produces identical rule results and anomaly findings as baseline `start_or_resume_workflow`. |
| **TEST-REGRESSION-ALL**| Regression | Full Pytest Suite | All **179 existing backend tests** pass with 0 failures. |
| **TEST-E2E-12** | Regression | E2E Script | `scripts/verify_e2e.py` completes with 12/12 workflows verified. |
| **TEST-FRONTEND-BUILD**| Frontend | Build Command | `npm run lint` has 0 errors; `npm run build` succeeds cleanly. |

---

## 11. Decisions Requiring User Confirmation

Before proceeding to implementation in **Phase 2 (Shared Application Foundation & Tenant Scoping)**, the following architectural choices require approval:

1. **Scrutiny Job Persistence Scope:**
   - *Option A (Recommended):* Implement `ScrutinyJob` as a new database table and service wrapper, keeping existing `/workflow/start` endpoint fully backward-compatible as a synchronous convenience method.
   - *Option B:* Keep scrutiny execution purely inside `Application.pipeline_status` and `ProcessingRun` without creating a new table.
   - *Recommendation:* Option A provides full fidelity to Section 6 of the directive (explicit job states, duration tracking, safe error summaries) while preserving 100% of the existing AI pipeline.

2. **Submission Completeness Strictness:**
   - *Option A (Recommended):* Hard block submission if mandatory category documents (e.g. Land Document, Accreditation) are missing from the checklist.
   - *Option B:* Allow submission with an explicit "Incomplete Submission Warning" modal.
   - *Recommendation:* Option A enforces statutory rigor and prevents cluttering the officer queue with unreviewable dossiers.

3. **LAN Host IP Addressing:**
   - Please confirm if the demonstration server will run on a known local static IP (e.g. `192.168.1.100`), or if dynamic environment variable binding (`SERVER_HOST=0.0.0.0`) is preferred.

---

**PHASE 1 CONCLUSION:**  
Phase 1 (Architecture and Gap Analysis Specification) is complete. Zero application code or database schemas were modified. Awaiting explicit user authorization before starting **PHASE 2**.
