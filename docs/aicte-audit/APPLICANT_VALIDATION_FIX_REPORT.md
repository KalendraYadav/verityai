# APPLICANT PORTAL MANDATORY-FIELD VALIDATION FIX REPORT

**Date:** 2026-10-25  
**System:** VerityAI (AICTE Scrutiny & Institutional Portal Prototype)  
**Status:** IMPLEMENTED, AUDITED & VERIFIED  

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Issue
On the Institutional Applicant Portal (`/app/overview`), invoking the "New Statutory Application" wizard (`ApplicantIntakeWizard.tsx`) allowed applicants to click **Proceed to Declared Metrics** and subsequent progression buttons without validating mandatory fields expected at each step. This allowed incomplete or structurally malformed data to be saved or advanced.

### 1.2 Root Cause Identification
1. **Frontend Step Progression Unchecked:**
   - In `ApplicantIntakeWizard.tsx`, the `handleStep1Proceed` function called `createApplication` or `updateApplication` directly without client-side pre-validation of required fields (`categoryCode`, `academicYear`, `programmeName`).
   - The step progress header buttons allowed direct index jumping (`setCurrentStep(step.num)`) without checking whether prior steps were completed and valid.
   - In Step 2, `handleStep2SaveAndProceed` lacked field-level validation for required metrics (e.g., negative numbers, empty principal name, invalid numbers) and lacked visual error states.
   - In Step 3, the "Proceed to Final Review" button transitioned directly to Step 4 without verifying that Step 1 and Step 2 prerequisites were satisfied.
   - Missing fields had no inline error messages or visual alerts beside input fields.

2. **Backend Validation Gaps in Pydantic Schemas & Submission:**
   - In `backend/app/schemas/application.py`, `ApplicationUpdate` lacked validation on `category_code`, `academic_year`, and numeric bounds on `declared_data`.
   - Numeric metrics (such as `approved_intake`, `land_area_acres`, `built_up_area_sqm`, `building_age_years`) did not validate against negative values, non-integers, booleans, or invalid string representations.
   - Text fields (such as `principal_name`, `land_ownership_type`) accepted arbitrary types or empty values.
   - At the submission endpoint (`submit_application` in `backend/app/api/v1/endpoints/applications.py`), validation only checked document checklist completeness (`SUBMISSION_CHECKLIST_INCOMPLETE`), but did not verify that all mandatory declared metrics (`category.required_declared_fields`) were present and non-empty in `declared_data`.

---

## 2. Implemented Architecture & Validation Rules

### 2.1 Step 1 — Category & Academic Year
- **Validation Rules Enforced:**
  - `categoryCode`: Must be selected and non-empty.
  - `academicYear`: Must match statutory format regex `^\d{4}-\d{2}$` (e.g. `2026-27`).
  - `programmeName`: Must be non-empty string.
- **UI Experience:**
  - Progression via "Proceed to Declared Metrics" is blocked if any field is invalid or missing.
  - Red border highlight and explicit inline error message (`<AlertCircle className="w-3.5 h-3.5" />`) rendered directly beneath each invalid field.
  - Direct clicking of Step 2, 3, or 4 in the header indicator is blocked until Step 1 passes.

### 2.2 Step 2 — Declared Statutory Metrics
- **Validation Rules Enforced:**
  - `principal_name`: Required non-empty string.
  - `approved_intake`: Required non-negative integer (whole number $\ge 0$).
  - `land_area_acres`: Required positive float ($> 0$ acres).
  - `built_up_area_sqm`: Required positive float ($> 0$ Sqm).
  - `building_age_years`: Optional non-negative integer ($\ge 0$).
  - `land_ownership_type`: Required valid enum value (`OWNED`, `REGISTERED_LEASE`, `GOVERNMENT_ALLOTMENT`).
  - `certificate_expiry_date`: Optional ISO date (`YYYY-MM-DD`), verified against calendar validity.
- **Draft Save vs. Step Progression:**
  - **Save Draft (`handleStep2SaveAndProceed(false)`):** Permits incomplete drafts to be saved, allowing institutions to incrementally enter data across multiple sessions. However, any field values that *are* entered must be structurally valid (e.g. negative intake or invalid date formats are rejected).
  - **Proceed to Step 3 (`handleStep2SaveAndProceed(true)`):** Requires all mandatory metrics to be fully populated and valid before allowing progression.
- **UI Experience:**
  - Inline error messages appear beside each invalid input with specific feedback (e.g., "Student intake must be a whole number (integer) >= 0").

### 2.3 Step 3 — Statutory Document Checklist
- **Validation Rules Enforced:**
  - Live evaluation via statutory checklist engine (`evaluate_conditional_checklist`).
  - Supported file formats: `.pdf`, `.png`, `.jpg`, `.jpeg`.
  - Enforces statutory file size limit: maximum 20 MB per file.
  - Rejection of oversized or non-supported file formats with clear inline error banners.
  - Progression button to Step 4 is guarded by `handleStepNavigation(4)` ensuring prior steps remain satisfied.

### 2.4 Step 4 — Review & Final Submission
- **Independent Pre-Submission Revalidation:**
  - Client-side revalidation of Step 1 (`validateStep1()`) and Step 2 (`validateStep2(false)`).
  - Real-time detection of any missing declared fields or missing mandatory checklist documents.
  - Actionable UI chips allow one-click jumping back to the exact wizard step (Step 1 or Step 2) or checklist item needing completion.
  - Submission button (`Submit Application to AICTE`) is disabled until all declared metrics and mandatory statutory documents are complete.

### 2.5 Server-Side Enforcement (Defense-in-Depth)
- **Pydantic Schemas (`backend/app/schemas/application.py`):**
  - Added `ACADEMIC_YEAR_REGEX` (`^\d{4}-\d{2}$`) and validator on `ApplicationCreate` and `ApplicationUpdate`.
  - Added `NUMERIC_NON_NEGATIVE_KEYS` and `INTEGER_KEYS` to reject negative numbers, non-integers, booleans, and invalid numeric strings.
  - Added `TEXT_KEYS` (`principal_name`, `institution_name`, `programme_name`, `certificate_number`, `land_ownership_type`) to enforce string types.
  - Added ISO calendar date validation for any field containing `date` or `expiry`.
- **Submission Endpoint (`backend/app/api/v1/endpoints/applications.py`):**
  - Enforces non-empty and valid `academic_year`.
  - Verifies that target application category exists and is active.
  - Independently iterates through `category.required_declared_fields`:
    * Raises HTTP 400 with `code="APPLICATION_INCOMPLETE"` if any required declared field is absent, empty, or whitespace.
    * Re-checks numeric metrics for non-negative values.
  - Independently evaluates the statutory checklist (`evaluate_conditional_checklist`):
    * Raises HTTP 400 with `code="SUBMISSION_CHECKLIST_INCOMPLETE"` if any mandatory document is missing.
  - Once submitted, permanently transitions application lifecycle to `SUBMITTED`, records an `APPLICATION_SUBMITTED` audit event, and locks the application against subsequent `PATCH` edits (HTTP 409 `APPLICATION_LOCKED`).

---

## 3. Files Changed

| File Path | Description of Changes |
| :--- | :--- |
| [frontend/src/components/applicant/ApplicantIntakeWizard.tsx](file:///d:/web%20project/VerityAI/frontend/src/components/applicant/ApplicantIntakeWizard.tsx) | Added `fieldErrors` state, `validateStep1()`, `validateStep2(allowIncompleteDraft)`, `handleStepNavigation` guards, inline field error rendering, and Step 4 missing field remediation buttons. |
| [backend/app/schemas/application.py](file:///d:/web%20project/VerityAI/backend/app/schemas/application.py) | Added academic year regex, numeric non-negative validators, integer type validators, boolean rejection, text field type checking, and schema validators on `ApplicationCreate` and `ApplicationUpdate`. |
| [backend/app/api/v1/endpoints/applications.py](file:///d:/web%20project/VerityAI/backend/app/api/v1/endpoints/applications.py) | Hardened `submit_application` to independently validate academic year, category, required declared metrics (`APPLICATION_INCOMPLETE`), and mandatory checklist documents (`SUBMISSION_CHECKLIST_INCOMPLETE`). |
| [backend/tests/test_applicant_validation_regression.py](file:///d:/web%20project/VerityAI/backend/tests/test_applicant_validation_regression.py) | Created 32 comprehensive regression tests covering all 13 required validation scenarios. |

---

## 4. Tests and Verification Evidence

### 4.1 Regression Test Suite (`test_applicant_validation_regression.py`)
Executed command:
```bash
wsl.exe -e bash -c "cd '/mnt/d/web project/VerityAI/backend' && .venv/bin/pytest tests/test_applicant_validation_regression.py -v"
```
**Result:** **32 passed in 2.90s** (Exit code: 0)

Coverage of all 13 required test cases:
1. `test_regression_missing_application_category` — Rejected with HTTP 422.
2. `test_regression_missing_academic_year` — Null, blank, and whitespace academic years rejected with HTTP 422.
3. `test_regression_invalid_academic_year[2026, 2026-2027, 26-27, 2026/27, abcd-ef, 2026-7, 2026-278]` — All non-conforming formats rejected with HTTP 422.
4. `test_regression_missing_required_declared_metrics_at_submission` — Submission blocked with HTTP 400 `APPLICATION_INCOMPLETE`.
5. `test_regression_negative_or_invalid_numeric_values` — Rejected negative values, non-integers, booleans, and invalid numeric strings with HTTP 422.
6. `test_regression_invalid_text_and_date_fields` — Non-string text fields and malformed dates rejected with HTTP 422.
7. `test_regression_attempt_to_progress_with_invalid_data` — Invalid patch rejected with HTTP 422; pristine draft state preserved without corruption.
8. `test_regression_attempt_to_submit_with_missing_required_fields` — Missing declared fields blocked with HTTP 400 `APPLICATION_INCOMPLETE`.
9. `test_regression_attempt_to_submit_without_required_documents` — Missing documents blocked with HTTP 400 `SUBMISSION_CHECKLIST_INCOMPLETE`.
10. `test_regression_successful_progression_with_valid_data` — Valid Step 1 and Step 2 requests succeed with HTTP 201 and HTTP 200.
11. `test_regression_successful_submission_when_all_requirements_satisfied` — Returns HTTP 200 `SUBMITTED`, locks application against edits (HTTP 409 `APPLICATION_LOCKED`), writes audit event.
12. `test_regression_draft_save_and_resume_behavior` — Partial drafts save successfully and resume without premature blocking.
13. `test_regression_direct_api_bypass_attempts` — Direct API bypass attempts on schema, business logic, and tenant isolation firmly rejected.

### 4.2 Applicant Portal, Applications, Isolation & E2E Suites
Executed command:
```bash
wsl.exe -e bash -c "cd '/mnt/d/web project/VerityAI/backend' && .venv/bin/pytest tests/test_applicant_validation_regression.py tests/test_applicant_portal.py tests/test_applications.py tests/test_tenant_isolation_and_scrutiny_jobs.py tests/test_two_computer_demo_e2e.py -v"
```
**Result:** **63 passed in 7.05s** (Exit code: 0)

### 4.3 Full Backend Test Suite
Executed command:
```bash
wsl.exe -e bash -c "cd '/mnt/d/web project/VerityAI/backend' && .venv/bin/pytest -v"
```
**Result:** **241 passed in 36.62s** (Exit code: 0)

### 4.4 Frontend Linting & Production Build
Executed commands:
```powershell
npm run lint
npm run build
```
**Lint Output:** `0 errors, 35 warnings (pre-existing React compiler hooks warnings). Finished in 184ms on 29 files.`
**Build Output:** `tsc -b && vite build` completed successfully with exit code 0 (`built in 340ms`).

---

## 5. Remaining Limitations & Edge Cases

1. **Category-Specific Custom Field Definitions:**
   - The current implementation enforces statutory baseline fields (`principal_name`, `approved_intake`, `land_area_acres`, `built_up_area_sqm`, `land_ownership_type`) as designated by `category.required_declared_fields`. If future AICTE approval handbook revisions introduce novel category-specific fields, these should be registered in `required_declared_fields` and mapped in the intake wizard.
2. **Draft Partial Saves vs. Strict Progression:**
   - In accordance with architectural rules, drafts can be saved partially (`PATCH`) so that applicants do not lose progress. Progression past Step 2 in the wizard and final submission at Step 4 require full completeness. Direct API clients attempting to submit an incomplete draft will always receive HTTP 400.
