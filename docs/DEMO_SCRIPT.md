# VerityAI / EntityLocker — Demonstration Script (SIH 2026)

**Event:** Smart India Hackathon 2026 (Smart Automation Track)  
**System:** VerityAI / EntityLocker — Intelligent Decision-Support & Institutional Scrutiny Platform  
**Target Audience:** Technical Jury, AICTE/Ministry Evaluators, Domain Specialists  
**Duration:** ~8–10 Minutes (Live Interactive Demonstration)

---

## 1. Executive Summary & Problem Context (1.5 Minutes)

### Presenter Opening Pitch
> *"Respected Evaluators and Jury Members, every academic year regulatory bodies like AICTE process tens of thousands of institutional approval dossiers—including Extension of Approval (EoA), new program clearances, and intake expansion applications.
> 
> Currently, reviewers face heavy cognitive burden manually inspecting hundreds of PDF pages across land title deeds, building plans, faculty rosters, and previous approvals. Common challenges include unnoticed forged intake numbers, discrepancies between declared data and underlying certificates, expired clearances, and untraced reviewer notes.
> 
> Today, we present **VerityAI / EntityLocker**—an explainable, evidence-traceable decision-support platform built on strict deterministic validation, bilingual document scrutiny, robust security controls, and human-in-the-loop decision-making."*

### Key Principles to Highlight
1. **Explainable AI & Deterministic Foundations:** Rule results cite the exact rule code, expected vs. observed values, and link directly to source document pages.
2. **Human-in-the-Loop Authority:** AI never makes adverse administrative decisions; it elevates findings for human scrutiny officer adjudication.
3. **Honest Reporting & Statutory Stubs:** Synthetic datasets are explicitly labeled; external government portals (e.g. AICTE production systems) are modeled as secure stubs until official credentials are provisioned.

---

## 2. Live Demonstration Flow (6.5 Minutes)

### Step 1: Secure Authentication & Role-Based Access Control
* **Presenter Action:** Click the **"Session"** icon in the navigation bar.
* **UI Behavior:** The `AuthModal` appears with two quick-switch demo profiles:
  * **Admin:** `admin@verityai.gov.in` (`AdminSecurePass123!`) — full configuration & user management.
  * **Reviewer:** `reviewer@verityai.gov.in` (`ReviewerPass123!`) — scrutiny queue & finding adjudication.
* **Presenter Action:** Click **"Reviewer"** to authenticate.
* **Behind the Scenes:** The backend validates credentials using **Argon2id**, sets an `HttpOnly`, `SameSite=Lax` cookie, and enforces `X-Requested-With: VerityAI` CSRF defense.
* **Expected Result:** Session banner activates in the top bar with reviewer badge.

---

### Step 2: Scrutiny Queue & Application Triage
* **Presenter Action:** Navigate to the **Scrutiny Queue** tab on the Dashboard.
* **Show to Judges:** Three synthetic demonstration applications with distinct operational statuses:
  1. `VAI-2026-0001` — **Apex Institute of Technology** (Compliant Dossier, Status: `SUBMITTED`, Readiness: High)
  2. `VAI-2026-0002` — **Zenith College of Engineering** (Discrepancy Dossier, Status: `UNDER_REVIEW`, Declared Intake 180 vs 120)
  3. `VAI-2026-0003` — **Aryavart Polytechnic Institute** (Draft Dossier, Status: `DRAFT`)
* **Key Point:** Explain that applications are ranked by readiness and scrutiny urgency, avoiding random reviewer backlog.

---

### Step 3: Deep Dossier Inspection — Scenario 1 (Compliant Baseline)
* **Presenter Action:** Select `VAI-2026-0001` (Apex Institute of Technology).
* **Workspace Tabs Walkthrough:**
  * **Tab 1: Overview:** Institutional metadata (Permanent ID `SYN-INST-0001`, Pune, Maharashtra, Computer Science & Engineering, 120 intake).
  * **Tab 2: Documents:** Two attached PDF documents:
    * `Apex_AICTE_Extension_of_Approval_2026.pdf` (Accreditation / EoA)
    * `Apex_Contiguous_Land_Certificate.pdf` (Land Use & Possession)
  * **Presenter Action:** Click **"Preview"** on the EoA document to show PyMuPDF digital text extraction.
  * **Tab 3: Candidate Extracted Fields:** Extracted fields with confidence scores (`approved_intake` = 120, `academic_year` = 2026-27, `certificate_number` = CERT-SYN-000123).
  * **Tab 4: Validation Engine:** Run deterministic validation. All 6 rules pass (`RULE-REQ-DOC-ACCREDITATION`, `RULE-REQ-DOC-LAND`, `RULE-EXPIRY-ACCREDITATION`, `RULE-FIELD-NAME-MATCH`, `RULE-FIELD-INTAKE-MATCH`).
  * **Tab 10: Regulatory Gateways:** Trigger verification against `LOCAL_SYNTHETIC_REGULATORY_GATEWAY`. 5/5 statutory compliance checks pass with zero discrepancies.

---

### Step 4: Discrepancy Detection & Multilingual Scrutiny — Scenario 2
* **Presenter Action:** Switch to `VAI-2026-0002` (Zenith College of Engineering).
* **Highlighting the Discrepancy:**
  * Application declares **180 Approved Intake** in declared data.
  * Underlying document `Zenith_Bilingual_AICTE_Approval_Devanagari.pdf` contains Devanagari Hindi text:  
    `स्वीकृत प्रवेश क्षमता (Approved Intake): १२० (120)`
* **Tab 8: Multilingual Scrutiny & Glossary:**
  * Show language detection: Script distribution classifier identifies document as `mixed` (Devanagari + Latin).
  * Show numeral normalization: `१२०` normalized deterministically to `120`.
  * Show Statutory Glossary translation: Technical terms like *अनुमोदन* -> *Approval*, *सत्र* -> *Session*.
* **Tab 5: Anomaly Findings:**
  * Anomaly Engine triggers `ANM-XDOC-INTAKE` (Cross-Document Approved Intake Discrepancy).
  * Finding details show: Declared `180` vs Document `120` (Severity: `HIGH`).
  * Evidence Traceability: Direct citation to Document `DOC-DEMO-003`, Page 1.
* **Reviewer Action:** Reviewer clicks **"Adjudicate"**, enters decision note:  
  *"Flagged to institution: declared intake exceeds certified approval ceiling of 120."*  
  Saves resolution; action is cryptographically recorded in the append-only audit trail.

---

### Step 5: External Regulatory Gateways & SSRF Security Shield
* **Presenter Action:** Open **Tab 10 (Regulatory Gateways)** on the application.
* **Demonstrate Three Gateway Categories:**
  1. **Category A (Local Synthetic Gateway):** Runs instant offline compliance checks (Intake, Land Area, Faculty Ratio) with full synthetic provenance.
  2. **Category B (Configurable External REST Gateway):** Demonstrates production-grade REST adapter equipped with **SSRF Protection**. Explain that requests to `localhost`, `10.0.0.0/8`, and AWS/GCP cloud metadata (`169.254.169.254`) are intercepted and rejected at the socket layer.
  3. **Category C (Official AICTE Statutory Stub):** Click **"Probe Status"**. Honest statutory stub reports:  
     `"Production AICTE Gateway credentials are unconfigured in this prototype sandbox."`
     Evaluators appreciate that the system never fabricates external government responses.

---

### Step 6: Dossier History, Versioning & Freshness Auditing
* **Presenter Action:** Open **Tab 9 (Dossier History & Versioning)**.
* **Show to Judges:**
  * **Dossier Freshness Badge:** Confirms whether existing validation runs and reports are up-to-date or stale.
  * **Comparative Version Diff Engine:** Side-by-side comparison of Application `v1` vs `v2`.
  * **Document Amendments:** Demonstrate that uploaded amendments generate incremental revisions (e.g. `r1` -> `r2`), with duplicate files rejected via SHA-256 hash collision checks.

---

### Step 7: PyMuPDF Scrutiny Report Generation & Audit Trail
* **Presenter Action:** Open **Tab 7 (Scrutiny Dossier)** and click **"Generate Scrutiny PDF"**.
* **Result:** PyMuPDF generates a comprehensive, executive multi-page PDF scrutiny report:
  * Official banner and prototype disclaimer header.
  * Executive scrutiny summary and readiness breakdown.
  * Itemized validation rule matrix (Rule, Status, Expected vs Observed).
  * Flagged anomaly register with evidence citations.
  * Human reviewer sign-off block.
* **Presenter Action:** Click **"Download Report"**; report downloads with `X-Content-Type-Options: nosniff` security headers.
* **Tab 6: Audit Trail:** Show the complete audit ledger recording all actions (`APPLICATION_CREATED`, `DOCUMENT_PROCESSED`, `VALIDATION_RUN`, `DISCREPANCY_ADJUDICATED`, `REPORT_GENERATED`).

---

## 3. Pre-Flight System Readiness Verification (CLI Demo)

To prove technical robustness to judges who request command-line verification:

```bash
# In backend directory:
PYTHONPATH=. .venv/bin/python -m app.cli.readiness
```

**Output to Show:**
```text
========================================================================
   VERITYAI / ENTITYLOCKER — DEMONSTRATION READINESS AUDIT (SIH 2026)
========================================================================
 [PASS] 1. Python Environment: v3.12.3 satisfies requirement (>= 3.11)
 [PASS] 2. Core Dependencies: FastAPI, SQLAlchemy, PyMuPDF, Pydantic
 [PASS] 3. Database Connectivity: SQLite database connection verified
 [PASS] 4. Storage & Uploads: Directory writable with proper permissions
 [PASS] 5. RBAC Accounts: Admin and Reviewer seeded
 [PASS] 6. Validation Engine: 6 active deterministic rules verified
 [PASS] 7. Demonstration Dossiers: 3 institutions and 3 applications ready
 [PASS] 8. Interoperability Layer: 3 portal adapters configured
 [PASS] 9. Security Defenses: SSRF outbound filter active (169.254.x blocked)
 [PASS] 10. Frontend Distribution: Production client bundle compiled
------------------------------------------------------------------------
RESULT: 10/10 Checks Passed (100% Readiness Score)
STATUS: SYSTEM IS READY FOR DEMONSTRATION & EVALUATION ✅
========================================================================
```

---

## 4. Suggested Closing Statement (1 Minute)

> *"To conclude, VerityAI / EntityLocker demonstrates how modern automation can radically accelerate institutional scrutiny without compromising integrity or trust.
> 
> * **121 automated backend tests pass with zero failures.**
> * **Zero reliance on paid external APIs**—the complete pipeline operates offline.
> * **Complete evidence traceability** from raw document pixels to the final PDF report.
> * **Strict security standards** from Argon2id and CSRF protection to SSRF socket-level blocking.
> 
> We are ready to answer your questions and walk through any specific architectural module or test case. Thank you!"*
