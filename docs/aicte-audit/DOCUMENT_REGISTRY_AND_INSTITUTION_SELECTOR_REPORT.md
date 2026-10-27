# Document Registry & Institution Identity Audit Report

**Project:** VerityAI (Smart India Hackathon 2026 Prototype)  
**Authoritative Source:** AICTE Approval Process Handbook (APH 2024-25 to 2026-27) — [APH Final PDF](https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf)  
**Focus Scope:**  
1. Regulation-grounded statutory document categories in the Upload Document modal, grounded in Annexure 2 (Section 2.1) and related statutory chapters.  
2. Realistic, clean institutional names and institutional codes standardized across applicant-facing and officer interfaces.  

---

## 1. Authoritative Source and Exact References

All statutory document categories implemented in VerityAI are strictly grounded in the official **AICTE Approval Process Handbook (APH 2024–25 to 2026–27)**:

* **Primary Statutory Annexure for EoA:**  
  **Annexure 2, Section 2.1** (*"Documents to be uploaded for the issuance of EoA based on Self-Disclosure/after a break in the preceding Academic Years/Restoration of Intake"*), Handbook pages 73–74 (printed pages 57–58).
* **Additional Statutory Reference Annexures & Chapters:**
  * **Chapter I & Annexure 1.1:** Establishment of New Technical Institution (DPR, Land Deeds, NOCs, Architect & Advocate Certificates).
  * **Chapter II & Annexure 2.1:** Extension of Approval for Existing Technical Institutions.
  * **Chapter II & Annexure 6:** Standalone Management Institutions (PGDM/PGCM).
  * **Chapter IV:** Universities offering Technical Programmes.
  * **Annexure 3:** Detailed Project Report (DPR) structure and Architectural Built-up calculations.
  * **Annexure 14:** Competent Authorities for Land Use (CLU) and Building Occupancy Certificates across Indian States and UTs.
  * **Annexure 18 & Clause 6.32:** Mandatory Public Disclosure Single PDF Document.
  * **Clause 6.14 (a):** Faculty Electronic Fund Transfer (ECS/NEFT) salary disbursement.
  * **Clause 6.17 (h):** Structural Stability Certificate requirements for buildings over 30 years.

---

## 2. Verified Statutory Document Categories (Annexure 2, Section 2.1)

The seven statutory items specified in Section 2.1 of Annexure 2 were extracted verbatim from the official handbook and registered with distinct official titles, short display labels, source citations, and applicability conditions:

| Document Code | Short Display Label | Exact Verbatim Statutory Title (APH 2024–27) | Source Reference | Applicability & Statutory Conditions |
|---|---|---|---|---|
| `DOC_AFFIDAVIT_2` | **Affidavit 2 (Self-Disclosure & Undertaking)** | *"An Affidavit 2 with digital signature of the Chairman/ Secretary of the Trust/ Society/ Company on an e-stamp paper of Rs. 100/- duly sworn before a First Class Judicial Magistrate or Notary or an Oath Commissioner."* | Annexure 2, Section 2.1 (i) / Annexure 1.1 (ii) | **Mandatory** for all statutory applications. Sworn before a 1st Class Judicial Magistrate, Notary, or Oath Commissioner on Rs. 100/- e-stamp paper. |
| `DOC_PAY_RECEIPT` | **AICTE Web-Portal Pay Receipt** | *"Copy of pay receipt print made on AICTE Web-Portal if any, in respect of Extension of Approval for the respective Academic Year."* | Annexure 2, Section 2.1 (ii) | **Conditionally Required** if application processing fee was paid through the AICTE Web-Portal payment gateway. Exempted categories must provide fee-waiver order. |
| `DOC_OCCUPANCY_CERT` | **Occupancy / Completion Certificate (Form D)** | *"Valid Occupancy/ Completion Certificate/ Building License/ Form D issued by the Competent Authority."* | Annexure 2, Section 2.1 (iii) / Annexure 14 | **Mandatory** for all institutions. Form D or temporary building license is acceptable if construction is staged under competent authority approval. |
| `DOC_STRUCT_STABILITY` | **Structural Stability Certificate (> 30 Yrs)** | *"Valid Structural Stability Certificate from the registered Structural Engineer, if the Building is more than thirty years from the issue of Completion Certificate."* | Annexure 2, Section 2.1 (iv) / Clause 6.17 (h) | **Conditionally Required ONLY** if the Building is more than thirty years from the date of issue of Completion Certificate. Issued by Registered Structural Engineer (Master's in Structural Engg); valid for 5 years. |
| `DOC_FIRE_SAFETY` | **Fire & Life Safety Certificate** | *"A valid Fire Safety Certificate issued by the Competent Authority."* | Annexure 2, Section 2.1 (v) / Annexure 1.1 (v) | **Mandatory** for all institutions. Certificate must be currently valid without any lapse under State Fire Services law. |
| `DOC_SATELLITE_MAP` | **Geo-Tagged Satellite Map (Main Entrance)** | *"Satellite map, using suitable Web site, showing geographical location of the Land with latitude and longitude at the entrance of the main Building mentioned on it."* | Annexure 2, Section 2.1 (vi) | **Mandatory** for all applications. Must display geo-coordinates (latitude and longitude) positioned at the main entrance gate matching GIS survey coordinates. |
| `DOC_AUDITED_ACCOUNTS` | **Audited Statement of Accounts (Previous Year)** | *"Audited statement of accounts of the Trust/ Society/ Company of the previous year."* | Annexure 2, Section 2.1 (vii) | **Mandatory** for all EoA applications. Full audited balance sheet and income/expenditure account certified by Chartered Accountant with valid UDIN. |

---

## 3. Complete Master Document Catalogue (28 Statutory Types across 6 Groups)

To ensure comprehensive statutory compliance without arbitrarily targeting 20–25 items, the catalog registers **28 official document types** organized into 6 regulatory groups:

### Group 1: Affidavits & Undertakings
1. `DOC_AFFIDAVIT_2`: Affidavit 2 (Self-Disclosure & Undertaking) — Annexure 2, Section 2.1 (i)
2. `DOC_AFFIDAVIT_3`: Affidavit 3 (Security Deposit Creation) — Clause 1.12 / Affidavit 3
3. `DOC_AFFIDAVIT_4`: Affidavit 4 (Institutional Closure & Zero Liability) — Clause 2.21 / Affidavit 4 (Conditional)
4. `DOC_AFFIDAVIT_8`: Affidavit 8 (Course / Intake Expansion) — Clause 2.6 / Annexure 2.6 (Conditional)
5. `DOC_AFFIDAVIT_11`: Affidavit 11 (Twinning & Collaboration) — Clause 3.4 / Affidavit 11 (Conditional)
6. `DOC_FORMAT_3`: Governing Body Resolution (Format 3) — Format 3 / Page 205

### Group 2: Land, Building & Site Approvals
7. `DOC_OCCUPANCY_CERT`: Occupancy / Completion Certificate (Form D) — Annexure 2, Section 2.1 (iii)
8. `DOC_STRUCT_STABILITY`: Structural Stability Certificate (> 30 Yrs) — Annexure 2, Section 2.1 (iv) (Conditional)
9. `DOC_SATELLITE_MAP`: Geo-Tagged Satellite Map (Main Entrance) — Annexure 2, Section 2.1 (vi)
10. `DOC_LAND_DEED`: Registered Land Ownership Deed (>= 30 Yrs) — Annexure 1.1 (xii)
11. `DOC_LAND_CLU`: Land Use / Conversion Certificate (CLU) — Annexure 1.1 (Private Lease ii) / Annexure 14
12. `DOC_ENCUMBRANCE`: Encumbrance Certificate (EC) — Annexure 1.1 (Private Lease iv)
13. `DOC_BUILDING_PLAN`: Sanctioned Building Plan & Blueprint — Annexure 1.1 (i) / Annexure 3.2
14. `DOC_CERTIFICATE_1`: Advocate Land Title Certificate (Cert 1) — Certificate 1 / Page 210
15. `DOC_CERTIFICATE_2`: Architect Built-Up Area Certificate (Cert 2) — Certificate 2 / Annexure 3

### Group 3: Statutory Clearances & NOCs
16. `DOC_FIRE_SAFETY`: Fire & Life Safety Certificate — Annexure 2, Section 2.1 (v)
17. `DOC_FORMAT_1`: State Govt / UT NOC (Format 1) — Format 1 / Page 201
18. `DOC_FORMAT_2`: Affiliating University NOC (Format 2) — Format 2 / Page 202

### Group 4: Financial Audits & Accounts
19. `DOC_AUDITED_ACCOUNTS`: Audited Statement of Accounts (Previous Year) — Annexure 2, Section 2.1 (vii)
20. `DOC_PAY_RECEIPT`: AICTE Web-Portal Pay Receipt — Annexure 2, Section 2.1 (ii) (Conditional)
21. `DOC_BANK_CERT`: Bank Funds & FDR Verification (Cert 3) — Annexure 1.1 (vi) / Certificate 3
22. `DOC_PAYROLL_ECS`: Faculty Salary Statement (Bank ECS Transfer) — Clause 6.14 (a) / Annexure 1.4.3

### Group 5: Academic & Institutional Setup
23. `DOC_DPR`: Detailed Project Report (DPR) — Annexure 1.1 (xi) / Annexure 3
24. `DOC_TRUST_REG`: Trust / Society / Company Registration — Annexure 1.1 (viii) & (x)
25. `DOC_ACCRED_CERT`: Accreditation Certificate (NBA / NAAC) — Clause 2.1 (a) / Annexure 2.14 (Conditional)
26. `DOC_FORMAT_4`: Skill Knowledge Provider MoU (Format 4) — Format 4 / NSQF Regulations (Conditional)

### Group 6: Public Disclosures & Scrutiny Media
27. `DOC_MANDATORY_DISC`: Mandatory Public Disclosure Document — Annexure 18 / Clause 6.32
28. `DOC_EVC_VIDEO`: EVC Inspection Video (30-Minute Recording) — Clause 1.9 (f) & (g) (Conditional)

---

## 4. UI/UX Improvements in the Upload Document Modal

The `DocumentUploadModal.tsx` was enhanced following the project's design language:
1. **Clean Target Application Display:**
   * Target Application options formatted concisely as:  
     `VAI-2026-0010 — Meridian Institute of Technology`  
   * Removed extraneous qualifiers, internal enum names, and debug tags:  
     *Before:* `"VAI-2026-0010 — Apex Institute of Technology (Synthetic) (UNIVERSITY_TECHNICAL)"`  
     *After:* `"VAI-2026-0010 — Meridian Institute of Technology"`
2. **Searchable Category Filtering:**
   * Added an instant live-search input above the dropdown. Applicants can filter categories by typing keywords (e.g., "stability", "fire", "accounts", "affidavit").
3. **Category Grouping:**
   * Categories organized under official regulatory heads using `<optgroup>` tags to prevent cognitive overload.
4. **Honest Intake (No Dummy Auto-Detect):**
   * Removed the placeholder `"Auto-Detect / Unspecified"`. The system enforces explicit, accountable category selection.
5. **Interactive Regulatory Detail Panel:**
   * When any category is selected, an informative card renders beneath the dropdown displaying:
     * Category Group & Mandatory vs Conditionally Required status badge.
     * Full verbatim official title from APH 2024–27.
     * Source citation and APH handbook page number.
     * Plain-language explanation of when and how the document is required.

---

## 5. Institutional Identity Standardization

Six believable, non-colliding fictional technical institutions were adopted for the SIH 2026 prototype:

| Permanent Identifier | Institutional Code | Standardized Institutional Name | State / City |
|---|---|---|---|
| `INS-0001` | `VAI-I-001` | **Meridian Institute of Technology** | Maharashtra, Pune |
| `INS-0002` | `VAI-I-002` | **Northbridge College of Engineering** | Karnataka, Bengaluru |
| `INS-0003` | `VAI-I-003` | **Aravalli School of Technical Studies** | Rajasthan, Jaipur |
| `INS-0004` | `VAI-I-004` | **Eastfield Institute of Applied Sciences** | West Bengal, Kolkata |
| `INS-0005` | `VAI-I-005` | **Riverstone College of Engineering** | Tamil Nadu, Chennai |
| `INS-0006` | `VAI-I-006` | **Summit Institute of Management and Technology** | Delhi, New Delhi |

### Preservation of Database Integrity & Tenant Isolation
* **Zero Database Deletions or Reseeds:** Existing primary keys (`INS-0001`, `INS-0002`, `INS-0003`, etc.) were preserved.
* **Safe In-Place Migration:** Executed `scripts/update_institution_names.py` which cleanly updated institutional names, institutional codes, user display names, and application `declared_data` references.
* **Zero Broken Audit History:** All existing audit trails, document upload records, sha256 checksums, and reviewer assignments remain intact.
* **Stable Identifiers:** The institutional code (`VAI-I-001` through `VAI-I-006`) remains permanently distinct from the application reference (`VAI-2026-0001` through `VAI-2026-0010`).

---

## 6. Files Changed

1. **`backend/app/services/document_catalog.py`**
   * Registered 28 statutory document types (incorporating Annexure 2 Section 2.1 additions: `DOC_PAY_RECEIPT`, `DOC_SATELLITE_MAP`, `DOC_AUDITED_ACCOUNTS`).
   * Added `official_title`, `short_title`, `category_group`, and `condition_description` to all items.
   * Updated `EOA_TECHNICAL` required documents with Annexure 2.1 core items.
   * Updated `DOCUMENT_TYPE_ALIASES` with legacy aliases (`BALANCE_SHEET`, `LAND_DOCUMENT`, etc.).
   * Added `get_regulatory_document_types(category_code)`.
2. **`backend/app/api/v1/endpoints/documents.py`**
   * Enforced validation on upload: rejects unknown/invalid categories with HTTP 400 `INVALID_DOCUMENT_TYPE`.
   * Added `GET /api/v1/documents/regulatory-catalog` and `GET /api/v1/document-types`.
   * Positioned catalog endpoints prior to `/{document_id}` to prevent route collision.
3. **`backend/app/services/workflow.py`**
   * Added bidirectional alias resolution in `evaluate_conditional_checklist` so both canonical statutory codes and legacy aliases match uploaded documents.
4. **`backend/app/db/seed.py`**
   * Updated synthetic seed data with the 6 clean fictional institutions and realistic user identities.
5. **`scripts/update_institution_names.py`**
   * Reversible database migration script that safely updated the SQLite dev database without reseeding or deleting records.
6. **`backend/tests/test_document_regulatory_catalog.py`**
   * New test suite covering Annexure 2.1 titles, citations, conditional rules, API endpoints, upload validation, category rejection, and institutional hygiene.
7. **`backend/tests/test_regulatory_catalog.py`**
   * Updated statutory document count assertion to `>= 28` and added Annexure 2.1 assertions.
8. **`frontend/src/data/documentRegistry.ts`**
   * Created centralized statutory document registry with helper search and retrieval functions.
9. **`frontend/src/components/documents/DocumentUploadModal.tsx`**
   * Searchable, grouped statutory document dropdown, clean target application selector, and interactive regulatory detail card.
10. **`frontend/src/components/documents/DocumentsView.tsx`**
    * Standardized application dropdown format to `{app.application_reference} — {app.institution.institution_name}`.
11. **`frontend/src/components/applicant/ApplicantIntakeWizard.tsx`**
    * Standardized institutional fallback values and institutional code labels.
12. **`frontend/src/components/auth/LoginPage.tsx`**
    * Updated quick login demo badge to `Meridian Institute of Technology` (`VAI-I-001`).

---

## 7. Tests Executed & Actual Results

### Backend Verification (Python / pytest in WSL)
* **Command:** `.venv/bin/pytest tests/test_document_regulatory_catalog.py tests/test_regulatory_catalog.py`
  * **Result:** **13 passed** in 0.98s.
  * Verified exact verbatim titles, Annexure 2.1 source references, alias resolution, unknown category rejection (HTTP 400 `INVALID_DOCUMENT_TYPE`), and institutional hygiene.
* **Command:** `.venv/bin/pytest tests/test_applicant_validation_regression.py tests/test_applicant_portal.py`
  * **Result:** **41 passed** in 2.35s.
  * Verified mandatory applicant validation, checklist evaluation, draft saving, submission locking, and cross-institutional isolation.
* **Full Backend Test Suite:**
  * **Command:** `.venv/bin/pytest`
  * **Result:** **249 passed** in 33.68s (100% passing across all 249 tests in the repository).

### Frontend Verification (Node.js / Vite / TypeScript)
* **Linting:**
  * **Command:** `npm run lint`
  * **Result:** **0 errors**, 37 non-blocking warnings across 30 files in 123ms.
* **Production Build:**
  * **Command:** `npm run build`
  * **Result:** **Success in 354ms** (`dist/assets/index-BNxW3FyP.js` and `dist/assets/index-CQdc_vDf.css` generated cleanly).

---

## 8. Remaining Limitations and Unverified Requirements

1. **State-Level Revenue Portal Integration:**  
   While `DOC_LAND_CLU` and `DOC_OCCUPANCY_CERT` are grounded in Annexure 14, automated registry cross-checking is currently simulated/mocked for demo purposes, as Indian state land revenue departments (Bhoomi, Mahabhulekh, Meebhoomi) do not provide open public APIs.
2. **CAD Drawing Carpet Area Verification:**  
   `DOC_BUILDING_PLAN` CAD vector layouts currently rely on human reviewer inspection. Automated DWG/DXF polygon area calculation is outside the prototype scope.
3. **Simulated AICTE Payment Gateway:**  
   `DOC_PAY_RECEIPT` validation checks checksums and portal transaction numbers. No live AICTE ERP connection exists (strictly compliant with project non-negotiable rules).
