# PHASE C IMPLEMENTATION REPORT: CONDITIONAL CHECKLIST & APPLICATION WORKFLOW

**Project:** VerityAI — Institutional Document Intelligence & Regulatory Scrutiny  
**Context:** Smart India Hackathon (SIH) 2026 — Decision-Support Prototype  
**Date:** October 24, 2026  
**Status:** **COMPLETED & FULLY VERIFIED**  
**Priority:** **P1**

---

## 1. Executive Summary

Phase C successfully replaced the previous naive static document list subtraction with a dynamic, rule-driven, application-specific conditional scrutiny checklist grounded in the **AICTE Approval Process Handbook (APH 2024-25 to 2026-27)**.

All Phase C acceptance criteria have been satisfied:
1. **Dynamic Conditional Evaluation:** Checklist requirements now dynamically adapt to institutional inputs (e.g., land ownership, building age, intake increase, online EVC, foreign collaboration).
2. **Explicit Granular Statuses:** Replaced simple binary missing/present with statutory scrutiny outcomes:
   - `REQUIRED_UPLOADED` (Document uploaded and verified)
   - `REQUIRED_MISSING` (Mandatory document missing)
   - `CONDITIONAL_NEEDS_REVIEW` (Conditional requirement triggered by declared attributes, pending document/adjudication)
   - `NOT_APPLICABLE` (Condition not triggered; supported by documented APH rule)
   - `PENDING_VERIFICATION` (Uploaded document undergoing OCR / extraction)
   - `NEEDS_HUMAN_REVIEW` (Human interpretation needed to ascertain applicability)
3. **Statutory Traceability:** Every checklist item displays its source clause, APH PDF page, condition rationale, and exact activating condition.
4. **Backward Compatibility:** All existing 138 backend tests pass without regressions, and existing categories continue to function seamlessly.
5. **Frontend Integration:** Enhanced `ApplicationDetailWorkspace.tsx` to render the dynamic statutory checklist with color-coded status badges, activating condition highlights, and APH citations.

---

## 2. Files Changed

1. [`backend/app/schemas/workflow.py`](file:///d:/web%20project/VerityAI/backend/app/schemas/workflow.py):
   - Added `ChecklistItemResponse` schema capturing `document_code`, `title`, `status`, `mandatory_or_conditional`, `condition_rationale`, `activating_condition`, `source_clause`, `pdf_page`, and `human_review_required`.
   - Added `ApplicationChecklistResponse` schema aggregating category totals.
   - Attached optional `checklist` to `ApplicationReadinessResponse`.
2. [`backend/app/schemas/__init__.py`](file:///d:/web%20project/VerityAI/backend/app/schemas/__init__.py):
   - Exported `ChecklistItemResponse` and `ApplicationChecklistResponse`.
3. [`backend/app/services/document_catalog.py`](file:///d:/web%20project/VerityAI/backend/app/services/document_catalog.py):
   - Separated unconditional mandatory documents in `NEW_INSTITUTION` from land-tenure conditional documents (`DOC_ENCUMBRANCE`, `DOC_LAND_CLU`).
4. [`backend/app/services/workflow.py`](file:///d:/web%20project/VerityAI/backend/app/services/workflow.py):
   - Implemented `evaluate_conditional_checklist(db: Session, application_id: str)`.
   - Connected `get_application_readiness` to use dynamic checklist items.
5. [`backend/app/api/v1/endpoints/workflow.py`](file:///d:/web%20project/VerityAI/backend/app/api/v1/endpoints/workflow.py):
   - Added `GET /api/v1/applications/{application_id}/checklist` route.
6. [`frontend/src/api/client.ts`](file:///d:/web%20project/VerityAI/frontend/src/api/client.ts):
   - Added `ChecklistItemData` and `ApplicationChecklistData` interfaces and `fetchApplicationChecklist` helper.
7. [`frontend/src/components/applications/ApplicationDetailWorkspace.tsx`](file:///d:/web%20project/VerityAI/frontend/src/components/applications/ApplicationDetailWorkspace.tsx):
   - Upgraded the "Mandatory Regulatory Documents Checklist" tab to render the dynamic conditional checklist with APH citations, activating conditions, and status badges.
8. [`backend/tests/test_conditional_checklist.py`](file:///d:/web%20project/VerityAI/backend/tests/test_conditional_checklist.py) *(New)*:
   - Added 5 unit and integration tests covering owned land, leased land, aged buildings, intake expansion, and REST endpoints.

---

## 3. Conditional Rules Implemented

| Condition / Trigger | Affected Documents | Rule & Rationale | APH Source Clause | PDF Page |
|---|---|---|---|---|
| **Land Lease (Private Lease)** | `DOC_ENCUMBRANCE`, `DOC_LAND_CLU`, `DOC_CERTIFICATE_1` | Leased institutional property requires Advocate title certification, conversion order, and 30-year non-encumbrance proof. | Clause 6.17 (a) / Annexure 1.1 | 72, 94 |
| **Building Age > 30 Years** | `DOC_STRUCT_STAB` | Buildings older than 30 years from completion must submit a Structural Stability Certificate from a registered structural engineer (valid 5 years). | Clause 6.17 (h) | 73 |
| **Intake Expansion / New Courses** | `DOC_FORMAT_3`, `DOC_CERTIFICATE_2` | Expansion of approved intake requires a Trust Resolution and architect certificate verifying physical room adequacy. | Clause 2.6 (c) / Annexure 3.2.1 | 32, 103 |
| **Online EVC Inspection** | `DOC_EVC_VIDEO` | Online Expert Visit Committee requires a 30-minute geo-tagged tour video uploaded to YouTube. | Clause 1.9 (f) | 24 |
| **Foreign Collaboration / Twinning** | `DOC_FOREIGN_MOU` | Courses offered under foreign university collaboration require approved bipartite MoU documentation. | Chapter III | 48 |
| **Extended 3-Year EoA** | `DOC_ACCRED_CERT` | Autonomous institutions or applicants seeking 3-year extension must submit NBA/NAAC accreditation credentials. | Clause 2.1 (a) | 27 |

---

## 4. Test and Verification Evidence

### A. Conditional Checklist Test Suite
- **Command:** `wsl -d Ubuntu-24.04 -- bash -c "cd '/mnt/d/web project/VerityAI' && backend/.venv/bin/pytest backend/tests/test_conditional_checklist.py -v"`
- **Result:** **5 passed, 1 warning in 0.53s** (Exit code 0).
- **Verified Tests:**
  - `test_new_institution_owned_land_checklist` — PASSED
  - `test_new_institution_leased_and_aged_building_triggers` — PASSED
  - `test_eoa_intake_expansion_triggers` — PASSED
  - `test_uploaded_document_updates_checklist_status` — PASSED
  - `test_checklist_and_readiness_rest_endpoints` — PASSED

### B. Existing Workflow Regression Suite
- **Command:** `wsl -d Ubuntu-24.04 -- bash -c "cd '/mnt/d/web project/VerityAI' && backend/.venv/bin/pytest backend/tests/test_workflow.py -v"`
- **Result:** **6 passed in 0.81s** (Exit code 0).

### C. Full Backend Test Suite
- **Command:** `wsl -d Ubuntu-24.04 -- bash -c "cd '/mnt/d/web project/VerityAI' && backend/.venv/bin/pytest backend/tests -q"`
- **Result:** **138 passed, 11 warnings in 14.59s** (Exit code 0, 0 failures).

### D. Operational E2E Verifier
- **Command:** `wsl -d Ubuntu-24.04 -- bash -c "cd '/mnt/d/web project/VerityAI' && backend/.venv/bin/python scripts/verify_e2e.py"`
- **Result:** **12/12 Workflows Verified (100% Operational Health)** in 6.84s.

### E. Frontend Production Build
- **Command:** `npm run build` in `frontend/`
- **Result:** Passed cleanly in 192ms (`tsc -b && vite build`), 0 TypeScript errors.
