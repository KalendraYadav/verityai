# System Gap Analysis: Implementation vs. Regulatory Requirements

**Document ID:** GAP-ANALYSIS-001  
**Project:** VerityAI / EntityLocker  
**Audit Baseline:** AICTE Approval Process Handbook (2024–25 to 2026–27) vs. Current Codebase (Phases 1–20)  
**Date of Audit:** 2026-10-24  

---

## 1. Summary of Implementation Status

| Evaluation Category | Total Evaluated | Implemented & Tested | Partially Implemented | Not Implemented | Blocked / External Stub |
|---|---|---|---|---|---|
| **Core Infrastructure & Workflows** | 12 Subsystems | 11 (91.7%) | 1 (8.3%) | 0 (0.0%) | 0 (0.0%) |
| **Regulatory Requirements (APH 2024-27)** | 60 Requirements | 8 (13.3%) | 6 (10.0%) | 42 (70.0%) | 4 (6.7%) |
| **Document Taxonomy Coverage** | 25 Document Classes | 2 (8.0%) | 3 (12.0%) | 20 (80.0%) | 0 (0.0%) |
| **External Registry Verification** | 7 Source Integrations | 1 (14.3% - Synthetic) | 0 (0.0%) | 3 (42.9%) | 3 (42.9% - Stubs) |

---

## 2. Detailed Gap Matrix & Remediation Specifications

### GAP-001: Regulatory Rule Catalogue Depth (Missing AICTE Statutory Norms)
- **Related Requirements:** `REQ-0008` (Land), `REQ-0009` (Building Plan), `REQ-0013` (Core Branches), `REQ-0027` (ECS Salary), `REQ-0030` (Contiguity), `REQ-0035` (10% EWS), `REQ-0036` (5% TFW), `REQ-0051` (Classroom carpet area), `REQ-0052` (Admin area), `REQ-0053` (Amenities area), `REQ-0054` (PC ratios), `REQ-0055` (Library volumes), `REQ-0057` (Cadre ratio 1:2:6 / FSR 1:20).
- **Affected Documents:** `DOC_LAND_DEED`, `DOC_BUILDING_PLAN`, `DOC_AFFIDAVIT_2`, `DOC_PAYROLL_ECS`, `DOC_CERTIFICATE_2`.
- **Expected Behavior:** Validation engine evaluates statutory land contiguity, minimum built-up areas ($m^2$), student-to-PC ratios, book volumes, and faculty cadre ratio (1:2:6) with FSR (1:20 UG).
- **Existing Behavior:** Engine evaluates only 6 illustrative rules (`RULE-DOC-ACCRED`, `RULE-DOC-LAND`, `RULE-FLD-CERTNO`, `RULE-EXP-ACCRED`, `RULE-CMP-NAME`, `RULE-CMP-INTAKE`).
- **Code Evidence:** `backend/app/services/validation.py` lines 18–128.
- **Severity / Impact:** **CRITICAL**. System cannot determine true statutory compliance for educational institutions without official APH rules.
- **Recommended Fix:** Implement 15 new deterministic validation rules in `validation.py` using parameters extracted from Annexures 3, 4, and 5 of the handbook.
- **Required Tests:** Parametric unit tests in `test_validation.py` testing pass, fail, and border cases for FSR, cadre ratio, and carpet area calculations.
- **Acceptance Criteria:** Engine correctly evaluates faculty payroll rosters and room schedules against APH formulas.

### GAP-002: Document Catalogue Narrowness & Static Checklists
- **Related Requirements:** `REQ-0001`, `REQ-0002`, `REQ-0006`, `REQ-0017`, `REQ-0031`, `REQ-0033`, `REQ-0047`–`REQ-0050`.
- **Affected Documents:** All 25 documents in `DOCUMENT_MASTER_CATALOG.csv`.
- **Expected Behavior:** System identifies applicable documents conditionally based on institution category (e.g. New Technical Institution vs. EoA vs. University vs. Standalone PGDM) and validates submission completeness.
- **Existing Behavior:** Single category `EOA_ILLUSTRATIVE` requires only `ACCREDITATION_CERTIFICATE` and `LAND_USE_CERTIFICATE`.
- **Code Evidence:** `backend/app/models/category.py` lines 10–23; `backend/app/db/seed.py` lines 77–93.
- **Severity / Impact:** **HIGH**. Scrutiny officers cannot manage comprehensive filings containing building plans, fire safety certificates, advocate certificates, or bank guarantees.
- **Recommended Fix:** Expand `ApplicationCategory` seed data to include `NEW_INSTITUTION`, `EOA_TECHNICAL`, `STANDALONE_PGDM`, and `UNIVERSITY_TECHNICAL` with dynamic conditional document checklists.
- **Required Tests:** Unit tests in `test_applications.py` and `test_workflow.py` asserting that changing category dynamically updates required document sets.

### GAP-003: Tabular Schedule & Multi-Column Document Extraction
- **Related Requirements:** `REQ-0008` (Land survey table), `REQ-0051` (Carpet area schedule), `REQ-0057` (Faculty roster).
- **Affected Documents:** `DOC_LAND_DEED`, `DOC_BUILDING_PLAN`, `DOC_AFFIDAVIT_2` (Clause 15), `DOC_PAYROLL_ECS`.
- **Expected Behavior:** System extracts structured tabular data (rows and columns) from Certificate 2 room schedules and land deed schedules.
- **Existing Behavior:** Extraction pipeline extracts text linearly as a string; table cells are flattened, preventing regex discovery of multi-column values.
- **Code Evidence:** `backend/app/services/extraction.py` lines 183–200.
- **Severity / Impact:** **HIGH**. High false-negative rate on room carpet area and land survey number verification.
- **Recommended Fix:** Integrate PyMuPDF's `page.find_tables()` in `services/extraction.py` to serialize tabular schedules directly into JSON structures matching `DOCUMENT_FIELD_SCHEMAS.json`.
- **Required Tests:** Extraction test in `test_extraction.py` parsing multi-column room carpet area table.

### GAP-004: PDF Digital Signature (PKI / DSC) Cryptographic Verification
- **Related Requirements:** `REQ-0005` (Mandatory DSC on all uploads), `REQ-0006` (Affidavit 2 DSC).
- **Affected Documents:** All uploaded evidentiary PDFs.
- **Expected Behavior:** Backend parses PDF `/ByteRange` cryptographic signatures, validates X.509 certificate chains against Indian Controller of Certifying Authorities (CCA) root certs, and flags unsigned or post-signing tampered PDFs.
- **Existing Behavior:** Backend verifies magic bytes and file hashes, but does not parse or validate digital signatures.
- **Code Evidence:** `backend/app/services/extraction.py` line 147.
- **Severity / Impact:** **HIGH**. Post-signing alterations or forged unsigned PDFs are not detected automatically.
- **Recommended Fix:** Add cryptographic signature inspection using PyMuPDF / `cryptography` in `services/extraction.py` and persist `signature_status` on `Document`.
- **Required Tests:** Test fixtures with validly signed, unsigned, and tampered PDFs in `test_documents.py`.

### GAP-005: IDOR Access Control on File Streaming Endpoint
- **Related Requirements:** General Application Security (OWASP API1:2023).
- **Affected Documents:** All uploaded files.
- **Expected Behavior:** `INSTITUTION_USER` accounts can only download files belonging to applications filed by their own institution.
- **Existing Behavior:** File download route verifies that a user is authenticated, but does not check institution ownership.
- **Code Evidence:** `backend/app/api/v1/endpoints/documents.py` route `GET /{document_id}/file`.
- **Severity / Impact:** **HIGH**. Potential cross-institution data leakage.
- **Recommended Fix:** Add ownership verification dependency ensuring `doc.application.institution_id == current_user.institution_id`.
- **Required Tests:** Automated security test in `test_security_hardening.py` asserting HTTP 403 when an institution user requests a foreign document.
