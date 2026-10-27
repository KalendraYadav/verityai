# VerityAI Institutional Selector Fix Report

**Reference:** SIH 2026 Smart Automation Track — Prototype Decision Support System  
**Audit Document:** `docs/aicte-audit/INSTITUTION_SELECTOR_FIX_REPORT.md`  
**Date:** 2026-10-25  
**Author:** Antigravity Senior Full-Stack Engineering & Audit Agent  
**Status:** IMPLEMENTED, RIGOROUSLY TESTED, VERIFIED

---

## 1. Root Cause Analysis

In the previous implementation, the institutional identity `INS-0001` had been updated from "Apex Institute of Technology (Synthetic)" to "Meridian Institute of Technology", and institution records `INS-0002` through `INS-0006` existed in the database table `institutions`.

However, the Target Application selector in the Document Upload Modal displayed multiple applications where every single visible option belonged to `Meridian Institute of Technology`:
* `VAI-2026-0010 — Meridian Institute of Technology (UNIVERSITY_TECHNICAL)`
* `VAI-2026-0009 — Meridian Institute of Technology (UNIVERSITY_TECHNICAL)`
* `VAI-2026-0008 — Meridian Institute of Technology (EOA_ILLUSTRATIVE)`
* `VAI-2026-0007 — Meridian Institute of Technology (EOA_ILLUSTRATIVE)`
* `VAI-2026-0006 — Meridian Institute of Technology (EOA_ILLUSTRATIVE)`
* `VAI-2026-0005 — Meridian Institute of Technology (EOA_ILLUSTRATIVE)`
* `VAI-2026-0001 — Meridian Institute of Technology (EOA_ILLUSTRATIVE)`

### Identified Root Causes:
1. **Missing Application Records for Institutions 4, 5, and 6:**
   Institutions `INS-0004` (Eastfield), `INS-0005` (Riverstone), and `INS-0006` (Summit) had zero applications linked to them in the database.
2. **Cluster of Meridian Applications at Top of Timestamp Sorting:**
   Applications `VAI-2026-0005` through `VAI-2026-0010` had all been created recently for `INS-0001` (Meridian). Under the backend's default `-created_at` sort, all 6 top results returned from `GET /api/v1/applications` were Meridian applications.
3. **Applicant Tenant Isolation Context:**
   When testing the interface while logged in as the demo applicant (`operator@verityai.gov.in`, whose `institution_id` is `INS-0001`), the server-side tenant isolation logic (`Application.institution_id == current_user.institution_id`) correctly filtered the list strictly to applications belonging to `INS-0001`. Because only one applicant demo account existed on the login screen, testing cross-institutional application behavior was obscured.
4. **Selector Option Formatting Logic:**
   The option labels in the upload modal previously formatted applications as `${app.application_reference} — ${app.institution?.institution_name} (${app.category_code})`, appending internal category enums (`(UNIVERSITY_TECHNICAL)`, `(EOA_ILLUSTRATIVE)`) rather than the clean, decoupled institutional identifier `[VAI-I-00x]`.

---

## 2. Actual Database Changes

All changes were implemented through safe, additive, idempotent operations. **No tables were dropped, no database was reseeded from scratch, and no existing records, primary keys, foreign keys, documents, audit logs, or version histories were deleted or damaged.**

### 2.1 Preserved Historical Records
Existing applications `VAI-2026-0001` through `VAI-2026-0010` and their attached documents and audit trails were left fully intact:
- `VAI-2026-0001` $\rightarrow$ `INS-0001` (2 documents, 53 audit events)
- `VAI-2026-0002` $\rightarrow$ `INS-0002` (1 document, 46 audit events)
- `VAI-2026-0003` $\rightarrow$ `INS-0003` (0 documents, 1 audit event)
- `VAI-2026-0004` $\rightarrow$ `INS-0002` (0 documents, 1 audit event)
- `VAI-2026-0005` $\rightarrow$ `INS-0001` (1 document, 24 audit events)
- `VAI-2026-0006` $\rightarrow$ `INS-0001` (0 documents, 1 audit event)
- `VAI-2026-0007` $\rightarrow$ `INS-0001` (1 document, 25 audit events)
- `VAI-2026-0008` $\rightarrow$ `INS-0001` (1 document, 29 audit events)
- `VAI-2026-0009` $\rightarrow$ `INS-0001` (0 documents, 3 audit events)
- `VAI-2026-0010` $\rightarrow$ `INS-0001` (0 documents, 7 audit events)

### 2.2 New Applications Created & Mapped
Five new applications were created with references `VAI-2026-0011` through `VAI-2026-0015`, ensuring genuine foreign-key linkages to distinct institutions:
- `APP-2026-0011` $\rightarrow$ `VAI-2026-0011` $\rightarrow$ `INS-0002` (Northbridge College of Engineering)
- `APP-2026-0012` $\rightarrow$ `VAI-2026-0012` $\rightarrow$ `INS-0003` (Aravalli School of Technical Studies)
- `APP-2026-0013` $\rightarrow$ `VAI-2026-0013` $\rightarrow$ `INS-0004` (Eastfield Institute of Applied Sciences)
- `APP-2026-0014` $\rightarrow$ `VAI-2026-0014` $\rightarrow$ `INS-0005` (Riverstone College of Engineering)
- `APP-2026-0015` $\rightarrow$ `VAI-2026-0015` $\rightarrow$ `INS-0006` (Summit Institute of Management and Technology)

### 2.3 New Applicant Accounts for Tenant Isolation Demonstrations
To permit demonstration and testing of applicant views for all six institutions while strictly maintaining server-side tenant isolation:
- `operator@verityai.gov.in` $\rightarrow$ Meridian Registrar (`INS-0001`)
- `operator.northbridge@verityai.gov.in` $\rightarrow$ Northbridge Registrar (`INS-0002`)
- `operator.aravalli@verityai.gov.in` $\rightarrow$ Aravalli Registrar (`INS-0003`)
- `operator.eastfield@verityai.gov.in` $\rightarrow$ Eastfield Registrar (`INS-0004`)
- `operator.riverstone@verityai.gov.in` $\rightarrow$ Riverstone Registrar (`INS-0005`)
- `operator.summit@verityai.gov.in` $\rightarrow$ Summit Registrar (`INS-0006`)

---

## 3. The Six Distinct Demonstration Institutions

All six institutions represent fictional demonstration identities for SIH 2026. None are associated with real AISHE identifiers, real institutional seals, or real university records:

| DB UUID | Institutional Code | Full Official Institution Name | Type | Location | Origin |
|---|---|---|---|---|---|
| `INS-0001` | `VAI-I-001` | **Meridian Institute of Technology** | Engineering College | Pune, Maharashtra | Synthetic Demo |
| `INS-0002` | `VAI-I-002` | **Northbridge College of Engineering** | Engineering College | Bengaluru, Karnataka | Synthetic Demo |
| `INS-0003` | `VAI-I-003` | **Aravalli School of Technical Studies** | Polytechnic | New Delhi, Delhi | Synthetic Demo |
| `INS-0004` | `VAI-I-004` | **Eastfield Institute of Applied Sciences** | Technical Institute | Hyderabad, Telangana | Synthetic Demo |
| `INS-0005` | `VAI-I-005` | **Riverstone College of Engineering** | Engineering College | Chennai, Tamil Nadu | Synthetic Demo |
| `INS-0006` | `VAI-I-006` | **Summit Institute of Management and Technology** | Management Institute | Noida, Uttar Pradesh | Synthetic Demo |

---

## 4. Application-to-Institution Mapping

Primary demonstration sequence configured in the Target Application selector:

| Application Reference | Application DB ID | Institution DB ID | Institution Code | Institution Name | Status |
|---|---|---|---|---|---|
| `VAI-2026-0010` | `9a6f9dbf-0d39-4500-b37d-475442c46b95` | `INS-0001` | `VAI-I-001` | Meridian Institute of Technology | DRAFT |
| `VAI-2026-0011` | `APP-2026-0011` | `INS-0002` | `VAI-I-002` | Northbridge College of Engineering | SUBMITTED |
| `VAI-2026-0012` | `APP-2026-0012` | `INS-0003` | `VAI-I-003` | Aravalli School of Technical Studies | SUBMITTED |
| `VAI-2026-0013` | `APP-2026-0013` | `INS-0004` | `VAI-I-004` | Eastfield Institute of Applied Sciences | SUBMITTED |
| `VAI-2026-0014` | `APP-2026-0014` | `INS-0005` | `VAI-I-005` | Riverstone College of Engineering | SUBMITTED |
| `VAI-2026-0015` | `APP-2026-0015` | `INS-0006` | `VAI-I-006` | Summit Institute of Management and Technology | SUBMITTED |

---

## 5. Dropdown Appearance and Clean Selector Verification

### 5.1 Exact Selector Label Format
The Target Application selector in `frontend/src/components/documents/DocumentUploadModal.tsx` renders options using:
```tsx
const instName = app.institution?.institution_name || 'Institution';
const instCode = app.institution?.institution_identifier || app.institution?.id || '';
const label = instCode
  ? `${app.application_reference} — ${instName} [${instCode}]`
  : `${app.application_reference} — ${instName}`;
```

### 5.2 Rendered Visible Options in Upload Modal
```text
VAI-2026-0010 — Meridian Institute of Technology [VAI-I-001]
VAI-2026-0011 — Northbridge College of Engineering [VAI-I-002]
VAI-2026-0012 — Aravalli School of Technical Studies [VAI-I-003]
VAI-2026-0013 — Eastfield Institute of Applied Sciences [VAI-I-004]
VAI-2026-0014 — Riverstone College of Engineering [VAI-I-005]
VAI-2026-0015 — Summit Institute of Management and Technology [VAI-I-006]
```

### 5.3 Strict Negative Constraints Enforced
- ❌ No internal category enums (`UNIVERSITY_TECHNICAL`, `EOA_ILLUSTRATIVE`) in dropdown labels.
- ❌ No `Synthetic` labels.
- ❌ No debugging strings or internal UUIDs exposed when institutional code is present.
- ❌ Application reference (`VAI-2026-00xx`) and institutional code (`VAI-I-00x`) remain separate fields.

---

## 6. API Response and Security Verification

Verification was executed against the active FastAPI backend service and persistent SQLite database (`backend/var/verityai.db`):

### 6.1 API List Applications (Officer / Regulatory Perspective)
- **Endpoint:** `GET /api/v1/applications?page_size=50`
- **Result:** Status `200 OK`, returned all 15 applications.
- **Top 6 Options:** Correctly resolved to 6 distinct institutions (`VAI-I-001` through `VAI-I-006`).

### 6.2 Tenant Isolation (Meridian Applicant)
- **User:** `operator@verityai.gov.in` (`role: INSTITUTION_USER`, `institution_id: INS-0001`)
- **Query:** `GET /api/v1/applications?page_size=50`
- **Result:** Returned exactly 7 applications, 100% belonging to `INS-0001`. Zero visibility into other institutions.

### 6.3 Tenant Isolation (Northbridge Applicant)
- **User:** `operator.northbridge@verityai.gov.in` (`role: INSTITUTION_USER`, `institution_id: INS-0002`)
- **Query:** `GET /api/v1/applications?page_size=50`
- **Result:** Returned exactly 3 applications (`VAI-2026-0011`, `VAI-2026-0004`, `VAI-2026-0002`), 100% belonging to `INS-0002`. Zero visibility into other institutions.

### 6.4 Unauthorized Cross-Institution Upload Blocked
- **Action:** Meridian applicant attempted to upload a document to Northbridge's application (`VAI-2026-0011`, `APP-2026-0011`).
- **Endpoint:** `POST /api/v1/applications/APP-2026-0011/documents`
- **Response:** `403 Forbidden`
- **Server Message:** `"Cannot upload documents to an application belonging to another institution."`

### 6.5 Authorized Document Upload to Target Application
- **Action:** Northbridge applicant uploaded test document to `VAI-2026-0011`.
- **Declared Type:** `DOC_LAND_DEED` (registered AICTE statutory category).
- **Response:** `202 Accepted`, returned document reference `DOC-15E7D065`.
- **Database Verification:**
  - `Document.id`: `DOC-15E7D065`
  - `Document.application_id`: `APP-2026-0011` (`VAI-2026-0011`)
  - `Application.institution_id`: `INS-0002` (Northbridge College of Engineering, `VAI-I-002`)

---

## 7. Tests Executed and Results

| Test Suite / Command | Scope | Result | Details |
|---|---|---|---|
| `pytest tests/` | Complete backend test suite (unit + integration) | **249 passed** (100%) | 34.02s execution time, 0 failures |
| `test_api_and_security.py` | API list, dropdown sorting, tenant isolation, unauthorized upload rejection, authorized document attachment | **5/5 passed** | Verified all security gates and DB integrity |
| `npm run lint` | Frontend static analysis and type checks | **0 errors** | 30 files inspected |
| `npm run build` | Frontend TypeScript bundle generation | **Success** | Built in 227ms |

---

## 8. Records Preserved Without Reassignment

To uphold Section 4 Requirement 7 (*"Preserve existing primary keys, foreign keys, uploads, application history, and audit records"*), existing applications `VAI-2026-0001`, `VAI-2026-0005`, `VAI-2026-0007`, and `VAI-2026-0008` have documents physically stored and referenced under institution `INS-0001` (Meridian). Reassigning those applications to another institution would have severed foreign keys or corrupted audit trails. They were deliberately preserved under `INS-0001`, while distinct applications were cleanly provided for the other five institutions.
