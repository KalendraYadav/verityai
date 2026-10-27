# Phase 9: Final SIH Demonstration Rehearsal and Readiness Verification Report

**Project:** VerityAI (Decision-Support Prototype for SIH 2026 — Smart Automation Track)  
**Document Ref:** `docs/aicte-audit/PHASE_9_FINAL_DEMO_REHEARSAL_REPORT.md`  
**Execution Timestamp:** 2026-10-25T15:15:00+05:30  
**Evaluator:** Senior Full-Stack & Regulatory Verification Auditor  
**Authorized Phase:** PHASE 9 ONLY (Final SIH Demonstration Rehearsal and Readiness Verification)

---

## 1. Executive Readiness Verdict

### Overall Verdict: **READY WITH LIMITATIONS**

| Evaluation Criterion | Status | Operational Details |
|---|---|---|
| **End-to-End Workflow** | **READY** | Both Applicant Intake and Officer Scrutiny lifecycles verified and integrated across shared relational persistence. |
| **RBAC & Multi-Tenant Security** | **READY** | Rigid tenant boundaries; unauthenticated requests (401), cross-tenant requests (403), officer tampering with applicant submissions (403/409) strictly enforced. |
| **Deterministic AI & Rule Engine** | **READY** | APH statutory rule checks, anomaly indicators, and source evidence links (`document_id`, page, field, confidence) verified. |
| **Crash Recovery & Reconciliation** | **READY** | Engine restart persistence verified; startup reconciliation automatically transitions interrupted `PROCESSING` jobs to `FAILED` with audit trail. |
| **Network & Two-Computer Architecture** | **READY (CONFIGURED & SIMULATED)** | Host Wi-Fi IPv4 `192.168.1.2`, Vite reverse proxy `0.0.0.0:5173` -> `127.0.0.1:8000`, CORS subnet regex verified. |
| **Physical Hardware Multi-Device Trial** | **LIMITATION (PENDING)** | Automated simulation on the network stack passed 100%. Physical verification with two distinct laptops is pending manual rehearsal on demo day. |
| **External Authority Registries** | **LIMITATION (HONESTLY SIMULATED)** | State land revenue and municipal registry queries execute against synthetic fixtures in simulated mode (`SIMULATED_REGISTRY_MODE=True`). |

---

## 2. Verified Architecture and Data Flow

### 2.1 Complete Request and Data Flow

```
[Applicant Portal]                      [Officer Workspace]
 (Computer A / Browser)                  (Computer B / Browser)
         │                                       │
         ▼                                       ▼
  http://192.168.1.2:5173                 http://192.168.1.2:5173
  (Vite Dev Server & Proxy on 0.0.0.0)    (Vite Dev Server & Proxy on 0.0.0.0)
         │                                       │
         └───────────────────┬───────────────────┘
                             ▼
                 FastAPI Backend (Port 8000)
                 - Same-Origin Proxy Routing
                 - Session & Cookie Authentication
                 - RBAC Tenant Enforcement (deps.py)
                             │
     ┌───────────────────────┴───────────────────────┐
     ▼                                               ▼
Relational Persistence                          Local Private Storage
- SQLite: backend/var/verityai.db               - backend/var/uploads/
- Shared by Applicant & Officer                  - Secure UUID storage names
- Institutions, Applications, Documents         - Path traversal prevention
- Scrutiny Jobs, Findings, Audit Logs
     │
     ▼
Scrutiny Job Orchestrator (backend/app/services/scrutiny_job.py)
- Job creation & concurrency locks (SCRUTINY_JOB_ALREADY_ACTIVE)
- Async/background execution decoupled from browser client
     │
     ├─► Document Text Extraction / OCR (pdfplumber, pypdf, Tesseract fallback)
     ├─► Deterministic Statutory Rules (AICTE APH 2024-2027 Annexure 2 checks)
     ├─► Anomaly Detection Indicators (e.g. date inconsistencies, metric anomalies)
     ├─► Evidence Linker (tags findings with document_id, page_no, extracted token)
     └─► Dossier PDF Report Generator (ReportLab engine)
     │
     ▼
Authorized Human Reviewer Action
- Scrutiny findings presented as decision-support indicators
- Human officer signs off on statutory determination via POST /workflow/transitions
- System never issues autonomous statutory grants or rejections
```

### 2.2 Architectural Invariants Verified

1. **Shared Single Source of Truth:**
   Both the institutional applicant portal and the regulatory officer workspace communicate with the same FastAPI backend (`backend/app/main.py`) and share the same database (`backend/var/verityai.db`).
2. **Server-Side AI Execution:**
   No AI, OCR, or statutory rule validation executes in the client browser. All scrutiny is orchestrated as an asynchronous background `ScrutinyJob` on the server.
3. **Provider-Independent AI Interface:**
   The scrutiny engine uses deterministic rules and local parsers by default. Optional LLM inference degrades gracefully to local heuristic fallback if cloud API keys are absent.
4. **Human Review Supremacy:**
   The statutory status remains `UNDER_SCRUTINY` until an authorized human officer submits a review determination. AI findings are explicitly labeled as decision-support indicators.
5. **No False AICTE Claims:**
   The system makes no claim of live connection to AICTE internal databases. Simulated registry lookups are explicitly flagged as simulated in both data models and UI.

---

## 3. Exact Startup and LAN Connection Instructions

### 3.1 Network Topology & Active Configuration

* **Host Machine:** Windows 11 Enterprise
* **Host Wi-Fi IPv4 Address:** `192.168.1.2`
* **Subnet Mask:** `255.255.255.0`
* **Router Gateway:** `192.168.1.1`
* **Demonstration Subnet:** `192.168.1.0/24`

*(Note: If moving to a different Wi-Fi hotspot during the hackathon, run `ipconfig` on the host to obtain the new IPv4 address).*

### 3.2 Host Computer (Computer A) — Startup Sequence

Open two separate terminal windows on Computer A:

#### Terminal 1: Backend Service
```powershell
cd "d:\web project\VerityAI\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*Verification:* Inspect terminal output:
```text
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Startup reconciliation: checked for abandoned scrutiny jobs.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

#### Terminal 2: Frontend Service & LAN Reverse Proxy
```powershell
cd "d:\web project\VerityAI\frontend"
npm run dev -- --host 0.0.0.0 --port 5173
```
*Verification:* Inspect terminal output:
```text
  VITE v8.3.5  ready in 180 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.2:5173/
```

### 3.3 Windows Firewall Inbound Port Rule

Ensure inbound TCP traffic to port `5173` is permitted through Windows Defender Firewall. In an Administrator PowerShell terminal, run:
```powershell
New-NetFirewallRule -DisplayName "VerityAI-Demonstration-5173" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```
*(Do not disable the entire Windows Firewall; this single rule allows only local TCP port 5173).*

### 3.4 Second Laptop (Computer B) — Connection Instructions

1. Connect Computer B to the **same Wi-Fi network** as Computer A.
2. Open Google Chrome or Microsoft Edge on Computer B.
3. In the address bar, enter:
   ```text
   http://192.168.1.2:5173
   ```
4. **Why this works seamlessly without extra frontend configuration:**
   The frontend code makes relative API requests (`fetch('/api/v1/...')`). The Vite development server on Computer A listens on `0.0.0.0:5173` and proxies all `/api` requests directly to `http://127.0.0.1:8000`. Therefore, Computer B accesses both the React client and the FastAPI backend under the identical origin (`http://192.168.1.2:5173`). No cross-origin headers or IP changes are needed in `frontend/src`.

### 3.5 Health & Connectivity Check

From Computer B's browser, verify backend health:
- Navigate to: `http://192.168.1.2:5173/api/v1/health`
- Expected JSON response (`200 OK`):
  ```json
  {
    "status": "healthy",
    "service": "VerityAI",
    "version": "0.1.0",
    "database": {
      "status": "connected",
      "engine": "sqlite"
    }
  }
  ```

---

## 4. Applicant and Officer Rehearsal Checklists

### 4.1 Applicant Laptop Rehearsal Checklist (Computer A)

| Step | Action | Expected Result | Checked |
|---|---|---|:---:|
| **A-1** | Open `http://localhost:5173`. Click **Log In**. | Login modal appears with email and password fields. | [ ] |
| **A-2** | Enter credentials for Meridian Institute of Technology:<br>Email: `operator@verityai.gov.in`<br>Password: `operator123` | Login succeeds; top navbar displays *"Meridian Institute of Technology"* and code `VAI-I-001`. | [ ] |
| **A-3** | Click **New Statutory Application** to open intake wizard. | 4-step intake wizard displays Step 1 (Category & Year). | [ ] |
| **A-4** | Attempt to click **Proceed to Declared Metrics** without selecting Category. | UI validation blocks progression; error banner indicates mandatory selection required. | [ ] |
| **A-5** | Select Category: `ENGINEERING_AND_TECHNOLOGY`, Year: `2026-2027`. Click **Proceed**. | Step 2 (Declared Metrics) opens. | [ ] |
| **A-6** | Leave Land Area empty and click **Proceed to Documents**. | Validation blocks progression; mandatory metric highlighted. | [ ] |
| **A-7** | Fill declared metrics:<br>- Land Area: `10.5` acres<br>- Built-up Area: `12500` sqm<br>- Courses: `8`<br>- Approved Intake: `480` | Client validates metric ranges; enables navigation to Step 3. | [ ] |
| **A-8** | Click **Save Draft**. Press browser **F5 (Refresh)**. | Page reloads; application draft persists with all entered metrics intact. | [ ] |
| **A-9** | Click **Upload Document**. Select Category: `BUILDING_PLAN`. Upload a sample PDF. | Upload progress completes; document listed under application with size and SHA-256 hash. | [ ] |
| **A-10**| Proceed to Step 4 (**Review & Submit**). Click **Submit Application**. | Confirmation dialog displays declaration notice; on confirm, status updates to `SUBMITTED`. | [ ] |
| **A-11**| Note the Application Reference (e.g. `VAI-2026-XXXX`). Try to edit declared metrics. | Attempting to edit returns locked status (`409 Conflict`); draft is immutable. | [ ] |
| **A-12**| Attempt to navigate directly to reviewer endpoints (`/scrutiny-queue`). | Access denied / redirected to applicant overview. | [ ] |

---

### 4.2 Regulatory Officer Laptop Rehearsal Checklist (Computer B)

| Step | Action | Expected Result | Checked |
|---|---|---|:---:|
| **O-1** | Open `http://192.168.1.2:5173`. Click **Log In**. | Login screen displays on Computer B. | [ ] |
| **O-2** | Enter credentials for AICTE Scrutiny Officer:<br>Email: `reviewer@verityai.gov.in`<br>Password: `reviewer123` | Login succeeds; navbar displays *"AICTE Scrutiny Officer"* badge. | [ ] |
| **O-3** | Open the **Scrutiny Queue / Applications Dashboard**. | Table lists institutional applications grouped by Institution Name and Reference. | [ ] |
| **O-4** | Locate the application submitted by Computer A (`VAI-2026-XXXX`). | Application displays with status `SUBMITTED` and correct document count. | [ ] |
| **O-5** | Click on the application reference to open the **Application Dossier**. | Dossier workspace displays institution profile, declared metrics, and uploaded documents. | [ ] |
| **O-6** | Verify Officer Boundaries:<br>- Notice: No "Create Application" button exists.<br>- Notice: No "Upload Document" button exists for applicant original evidence. | Interface strictly enforces officer role separation. | [ ] |
| **O-7** | Click **Trigger Scrutiny Evaluation**. | Backend initiates async scrutiny job; status transitions `QUEUED` -> `PROCESSING`. | [ ] |
| **O-8** | Observe polling updates without manual browser refresh. | Within 2–5 seconds, job completes; status transitions to `COMPLETED` / `UNDER_SCRUTINY`. | [ ] |
| **O-9** | Inspect Scrutiny Findings tab. | Findings table displays: Rule ID, Severity, Extracted Value, Threshold, and clickable Document/Page reference. | [ ] |
| **O-10**| Click **Generate PDF Report**. | Multi-page statutory scrutiny summary PDF downloads; includes audit timestamp and disclaimer. | [ ] |
| **O-11**| In Review Actions panel, select: Transition -> `SCRUTINY_COMPLETED`. Enter officer comments: *"Compliance verified per APH norms."* Click **Confirm Decision**. | Decision recorded; application status updates; append-only audit event created. | [ ] |

---

## 5. Test Commands, Results, and Exit Codes

### 5.1 Full Test Suite Execution Summary

```
================================= TEST SUMMARY =================================
Suite                     Command                Exit Code  Passed  Failed  Time
--------------------------------------------------------------------------------
Backend Full Regression   pytest -q                      0     271       0  39.67s
Frontend Lint             npm run lint                   0     30 files     124ms
Frontend Production Build npm run build                  0    1959 modules  230ms
Phase 8 E2E Regression    pytest ...test_phase8...       0       4       0   2.50s
Persistence Across Reset  pytest ...test_persistence...  0       2       0   1.14s
LAN Demo Workflow Test    pytest ...test_two_computer... 0       1       0   1.34s
================================================================================
```

### 5.2 Exact Command Outputs

#### 1. Backend Full Suite (`pytest -q`)
```text
........................................................................ [ 26%]
........................................................................ [ 53%]
........................................................................ [ 79%]
.......................................................                  [100%]
271 passed, 44 warnings in 39.67s
Exit Code: 0
```

#### 2. Frontend Lint (`npm run lint`)
```text
Found 35 warnings and 0 errors.
Finished in 124ms on 30 files with 116 rules using 24 threads.
Exit Code: 0
```

#### 3. Frontend Production Build (`npm run build`)
```text
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 1959 modules transformed.
rendering chunks...
dist/index.html                   1.39 kB │ gzip:   0.68 kB
dist/assets/index-5B7Lqhfh.css   71.74 kB │ gzip:  13.43 kB
dist/assets/index-sPRgEAH-.js   720.35 kB │ gzip: 163.39 kB
✓ built in 230ms
Exit Code: 0
```

---

## 6. Security and Persistence Verification Results

1. **Unauthenticated Access (HTTP 401):**
   Direct requests to `/api/v1/applications`, `/api/v1/documents`, and `/api/v1/scrutiny/jobs` without an `access_token` cookie or bearer token are rejected immediately with `401 Unauthorized`.
2. **Cross-Tenant Isolation (HTTP 403):**
   An applicant from Meridian (`INS-0001`) attempting to query, update, or download documents belonging to Northbridge (`INS-0002`) receives `403 Forbidden`.
3. **Reviewer Mutation Protection (HTTP 403 / 409):**
   Reviewers cannot create applications (`403 Forbidden`), cannot upload documents on behalf of institutions (`403 Forbidden`), and cannot modify submitted applicant declarations (`409 Conflict`).
4. **Scrutiny Job Concurrency & Duplicate Prevention:**
   Triggering a scrutiny job on an application that is already `QUEUED` or `PROCESSING` is rejected with `409 Conflict` (`SCRUTINY_JOB_ALREADY_ACTIVE`).
5. **Startup Recovery of Abandoned Jobs:**
   If the server is terminated mid-job, `reconcile_abandoned_scrutiny_jobs()` runs on startup, marking the orphaned jobs as `FAILED` with a diagnostic message, releasing any application locks.
6. **Relational Persistence across Disconnect:**
   All institutions, applications, documents, scrutiny jobs, findings, and audit events survive full database disconnect and restart without data loss.

---

## 7. Known Defects and Unresolved Risks

1. **Physical Two-Computer Live Trial Pending:**
   The network bindings and reverse proxy have been verified via test suites on the host machine. A manual rehearsal with two physical laptops on the demonstration router remains necessary to confirm router client isolation is disabled.
2. **Synthetic Registry Lookups:**
   External verification lookups (land records, fire NOC) run against synthetic fixtures in simulated mode (`SIMULATED_REGISTRY_MODE=True`). These are clearly labeled as simulated in the UI.
3. **OCR Engine on Windows:**
   Text extraction uses `pypdf` and `pdfplumber` for vector and digital PDFs. Non-digital scanned PDFs require `tesseract.exe` to be installed on the host system. For the demonstration, use the pre-tested digital PDF files in `backend/tests/fixtures/`.
4. **Demo Data Status Counts:**
   Seeded sample applications `VAI-2026-0012` to `VAI-2026-0015` represent submitted applications with zero uploaded documents. For live demonstration, use `VAI-2026-0011` or create a new application via the applicant wizard.

---

## 8. Explicit Separation of Automated Tests from Physical-Device Testing

* **What was automated and verified:**
  - Automated unit and integration tests (271 tests passing).
  - Network listener binding (`0.0.0.0:5173` and `127.0.0.1:8000`).
  - Same-origin reverse proxying of API calls (`/api` -> `8000`).
  - Multi-tenant applicant and reviewer state machine interactions.
  - Startup reconciliation of interrupted jobs.
* **What is pending and marked as manual rehearsal:**
  - Connecting a physical second laptop across the demonstration venue Wi-Fi router.
  - Verifying that local Wi-Fi router settings do not block device-to-device traffic (client isolation).
  - Manual execution of the checklists in Section 4 on two physical keyboards.

---

## 9. Concise 5–7 Minute SIH Demonstration Sequence

| Minute | Portal / Screen | Speaker Dialogue & Action | Key Visual / Impact |
|:---:|---|---|---|
| **0:00 – 1:00** | **Slide / Architecture** | *"Good morning, respected evaluators. VerityAI is a decision-support prototype built for the Smart Automation track to assist AICTE officers in scrutinizing institutional approval applications."* | Introduce the two-laptop setup: Laptop A (Applicant) and Laptop B (Reviewer). |
| **1:00 – 2:30** | **Laptop A (Applicant Portal)** | *"An institution logs into their portal to submit an Extension of Approval (EoA) application for 2026–27. The intake wizard strictly enforces mandatory metrics per APH guidelines."*<br>- Walk through Step 1 & 2.<br>- Demonstrate that missing metrics block progression.<br>- Upload statutory document (`BUILDING_PLAN`).<br>- Submit application and show generated reference `VAI-2026-XXXX`. | Shows strict validation, upload categorization, and instant immutability upon submission. |
| **2:30 – 3:30** | **Laptop B (Officer Workspace)** | *"Now, switching to the AICTE Reviewer's screen on Laptop B. The officer's dashboard immediately reflects the submitted dossier across our shared relational persistence layer."*<br>- Open `VAI-2026-XXXX`.<br>- Point out clear institution and application grouping. | Demonstrates seamless multi-tenant synchronization and role separation (officer cannot forge documents). |
| **3:30 – 5:00** | **Laptop B (Scrutiny Execution)** | *"The officer triggers automated scrutiny. The backend asynchronously runs OCR, extracts tabular metrics, and executes deterministic statutory checks."*<br>- Click **Trigger Scrutiny**.<br>- Observe live polling completion.<br>- Inspect findings: point to rule `RULE-APH-LAND-MINIMUM` and the clickable evidence link showing exact document and page. | Proves explainability: every finding links to real source evidence. Shows honest labeling of simulated registry checks. |
| **5:00 – 6:30** | **Laptop B (Human Review & Audit)** | *"Crucially, VerityAI preserves human statutory supremacy. The AI provides decision support; it never autonomously approves or rejects an application. The officer reviews the findings and enters the official determination."*<br>- Transition status to `SCRUTINY_COMPLETED`.<br>- Download generated Scrutiny Summary PDF report.<br>- Show append-only audit trail logging every action. | Emphasizes legal compliance, human-in-the-loop design, and tamper-evident audit logging. |
| **6:30 – 7:00** | **Both Laptops / Wrap-up** | *"In summary, VerityAI transforms a weeks-long manual file scrutiny process into a fast, transparent, evidence-traceable evaluation while maintaining complete institutional data isolation and statutory accountability. Thank you."* | Q&A readiness. |

---

## 10. Fallback Plan (Wi-Fi, OCR, or Processing Failures)

| Risk Vector | Immediate Symptom | Root Cause | Contingency Action / Workaround |
|---|---|---|---|
| **Wi-Fi Disconnect / AP Client Isolation** | Computer B cannot load `http://192.168.1.2:5173`. | Venue router isolates devices from communicating with each other. | **Workaround:** Turn on Mobile Hotspot on Computer A's phone; connect both laptops to the phone hotspot. Update IP address in Computer B browser. |
| **Emergency Single-Machine Fallback** | Second laptop battery dies or network hardware fails. | Physical device unavailability. | **Workaround:** Open an Incognito window on Computer A (`http://localhost:5173`). Log in as Applicant in normal window and Reviewer in Incognito. The entire demo operates identically. |
| **Tesseract OCR Unavailable** | Scrutiny job on scanned PDF fails with OCR error. | Tesseract binary not in Windows PATH for scanned image PDFs. | **Workaround:** Use only digital vector PDFs (such as `Apex_AICTE_Extension_of_Approval_2026.pdf` in fixtures), which parse natively via `pdfplumber` without Tesseract. |
| **External Registry Timeout** | Registry verification hangs. | Network timeout trying to reach external web portals. | **Workaround:** The system default is `SIMULATED_REGISTRY_MODE=True`. Ensure `.env` has simulated mode enabled so queries resolve instantaneously from synthetic local fixtures. |
| **Port 5173 Blocked by Firewall** | Connection refused from Computer B. | Windows Defender Firewall blocked incoming port. | **Workaround:** Run the firewall rule from Section 3.3 in Administrator PowerShell, or temporarily switch the network profile from "Public" to "Private". |

---

## 11. Final Authorization and Sign-Off

Phase 9 demonstration rehearsal verification is complete. All systems are stable and ready for live presentation subject to the acknowledged physical dual-device rehearsal on the demonstration router.

**Phase 9 completed. Awaiting explicit user direction before further activity.**
