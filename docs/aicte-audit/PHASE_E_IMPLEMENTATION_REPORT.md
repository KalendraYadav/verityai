# PHASE E IMPLEMENTATION REPORT: DETERMINISTIC VALIDATION AND CROSS-DOCUMENT CONSISTENCY

**Project:** VerityAI — AICTE Approval Scrutiny Decision-Support Prototype (SIH 2026)  
**Phase:** E — Deterministic Validation and Cross-Document Consistency  
**Date of Execution:** October 24, 2026  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary

Phase E expands the rule-based deterministic validation engine to evaluate statutory AICTE Approval Process Handbook (APH 2024-27) requirements with mathematical rigor, boundary testing, and evidentiary provenance. Crucially, Phase E strictly separates:
1. Missing evidence / unsubmitted documents (`UNABLE_TO_EVALUATE` / `SUPPORTING_DOC_MISSING`) from failed compliance checks (`FAIL`).
2. Anomaly indicators requiring scrutiny (`NEEDS_REVIEW`) from definitive fraud or adverse decisions.
3. Extracted document data from declared application data.

All evaluations provide explicit statutory citations (e.g. APH Clauses 6.17, 6.37, 6.42, 6.47, Annexures 5.2, 6.5), bounded numerical computations, shortfall explanations, and evidence payloads linking directly to source document identifiers, page numbers, text snippets, and bounding boxes.

---

## 2. Implemented Capabilities

### A. Mathematical and Numerical Norms
1. **Faculty Cadre Ratio (1:2:6 per Annexure 5.2):**
   - Implemented in `RULE-STAT-CADRE-UG`.
   - Distinguishes missing cadre rosters from zero professors.
   - Detects the critical condition where Professor count == 0 (`NEEDS_REVIEW` with warning `CADRE_RATIO_ZERO_PROFESSORS`).
   - Evaluates proportion of Professors, Associate Professors, and Assistant Professors against the statutory 1:2:6 distribution.
2. **Faculty-Student Ratio (FSR 1:20 per Annexure 5.2):**
   - Implemented in `RULE-STAT-FSR-UG`.
   - Computes total institutional student strength: $S = \text{Annual Approved Intake} \times 4.0$ (UG Engineering).
   - Computes mandatory faculty requirement: $F_{\text{req}} = S / 20.0$.
   - Calculates exact faculty shortfall and effective ratio (e.g., $1:32.0$ vs statutory ceiling $1:20$).
   - Returns actionable explanations with exact shortfall numbers.
3. **Classroom Carpet Area (Clause 6.18, 60-Division vs 30-Division Norms):**
   - Implemented in `RULE-STAT-CLASSROOM-AREA`.
   - $\ge 66.0$ sqm: `PASS` (Compliant with 60-student division norm).
   - $33.0 - 66.0$ sqm: `NEEDS_REVIEW` (`DIVISION_SIZE_CONFIRMATION_REQUIRED`, requires reviewer confirmation if institution operates 30-student divisions).
   - $< 33.0$ sqm: `FAIL` (`CLASSROOM_AREA_DEFICIENT`, fails both 60 and 30 division norms).
4. **Administrative & Amenities Area Norms:**
   - `RULE-STAT-ADMIN-AREA`: $\ge 750.0$ sqm minimum carpet area.
   - `RULE-STAT-AMENITIES-AREA`: $\ge 500.0$ sqm minimum carpet area.
5. **Land Tenure and Contiguity Norms (Clause 6.17):**
   - `RULE-STAT-LAND-LEASE`: Minimum 30-year registered lease duration.
   - `RULE-STAT-LAND-CONTIGUOUS`: Maximum 3 contiguous land plots separated by not more than 2 km.
6. **Technical Infrastructure Norms:**
   - `RULE-STAT-INTERNET-BANDWIDTH`: Minimum 100 Mbps leased line bandwidth.
   - `RULE-STAT-STUDENT-PC-RATIO`: Minimum 1:10 student-to-PC ratio.
7. **Standalone PGDM Admissions Weightage (Annexure 6.5):**
   - `RULE-STAT-PGDM-CAT-WEIGHT`: Verifies Common Admission Test (CAT/MAT/XAT) weightage falls strictly within statutory range $[35.0\%, 60.0\%]$.

### B. Admissions Quota Cross-Document Checks
1. **Tuition Fee Waiver (TFW) 5% Supernumerary Quota Ceiling (Clause 6.42(a)):**
   - Implemented in `RULE-STAT-TFW-QUOTA`.
   - Verifies against declared approved intake: $\text{TFW Seats} \le 0.05 \times \text{Approved Intake}$.
   - Yields `PASS` when within ceiling; yields `NEEDS_REVIEW` (`TFW_CEILING_EXCEEDED`) when exceeded.
2. **Economically Weaker Sections (EWS) Intake Multiplier (Clause 6.37):**
   - Implemented in `RULE-STAT-EWS-RESERVATION`.
   - Verifies that post-EWS intake does not exceed statutory ceiling of $1.25 \times \text{Approved Intake}$.

### C. Statutory Governance Committees
- Detects sworn presence of mandatory committees in Affidavit 2 (`DOC_AFFIDAVIT_2`):
  - `RULE-STAT-ANTI-RAGGING`: Anti-Ragging Committee & Squad (Clause 6.47).
  - `RULE-STAT-INTERNAL-COMM`: Internal Committee (IC) / POSH (Clause 6.48).
  - `RULE-STAT-SC-ST-COMM`: SC/ST Committee (Clause 6.49).
  - `RULE-STAT-SGRC-OMBUDSMAN`: Student Grievance Redressal Committee & University Ombudsperson (Clause 6.50).

### D. Evidence Traceability & Missing Evidence Handling
- In `resolve_document_field_with_evidence`: extracts values from `ExtractedField` entities with fallback to page text scans, capturing page number, confidence, snippet, and bounding box.
- Missing documents report `UNABLE_TO_EVALUATE` with reason `SUPPORTING_DOC_MISSING` and input status `UNAVAILABLE`. They are never marked as `FAIL`.

---

## 3. Files Modified / Created

1. `backend/app/services/validation.py`
   - Added canonical alias resolution using `resolve_document_type`.
   - Added `resolve_document_field_with_evidence` extracting value, page number, confidence, and snippet.
   - Enhanced `evaluate_required_document` with statutory committee clause scans.
   - Enhanced `evaluate_required_field` with Cadre ratio, FSR ratio, classroom division norms, land lease, plot contiguity, bandwidth, and PGDM admission weights.
   - Enhanced `evaluate_field_equals_application` with TFW 5% ceiling ratio and EWS 1.25x intake multiplier.
2. `backend/tests/test_statutory_validation.py`
   - 15 dedicated statutory validation tests covering numerical norms, boundary conditions, zero professor edge cases, and missing evidence handling.

---

## 4. Test Verification Results

- **Statutory Validation Tests (`backend/tests/test_statutory_validation.py`):**
  - **15 passed** out of 15 tests.
- **Existing Validation Tests (`backend/tests/test_validation.py`):**
  - **19 passed** out of 19 tests.

---

## 5. Acceptance Criteria Assessment

| Criterion | Status | Evidence |
|---|---|---|
| Implemented rules are source-backed | VERIFIED | Traced to APH 2024-27 clauses in `STATUTORY_AICTE_RULES`. |
| Missing evidence handled separately from failed checks | VERIFIED | Missing supporting docs report `UNABLE_TO_EVALUATE`, verified by test. |
| Numerical boundaries are tested | VERIFIED | Boundary tests pass for 60 vs 30 division classroom areas, FSR, and TFW quotas. |
| Findings contain explanations and evidence references | VERIFIED | Findings include document ID, page number, snippet, and shortfall. |
| Human reviewers can understand why a finding was generated | VERIFIED | Plain-language regulatory explanations with quantitative comparisons. |

---

## 6. Next Steps

Proceed automatically to **Phase F — Authorized Verification Adapters and Document Integrity**.
