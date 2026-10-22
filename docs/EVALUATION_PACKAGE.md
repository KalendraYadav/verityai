# VerityAI / EntityLocker — Technical Evaluation Package

**Hackathon Track:** Smart India Hackathon 2026 — Smart Automation  
**Problem Statement:** Automated Scrutiny & Regulatory Compliance Assessment for Institutional Approvals (AICTE / MoE)  
**System Designation:** VerityAI (Prototype)  
**Evaluation Date:** October 2026  
**Status:** Pilot Demonstration Package (Phases 1–15 Complete)

---

## 1. Executive Summary

VerityAI is an explainable, evidence-traceable decision-support platform designed to assist regulatory scrutiny officers in evaluating technical education institutional applications and their supporting evidentiary documents. Built specifically for the Smart India Hackathon 2026, VerityAI automates labor-intensive compliance checks, flags discrepancies across multi-page documents, provides Devanagari/bilingual script normalization, and generates cryptographic audit trails without ever compromising human decision authority.

The system is 100% self-contained: it runs offline using open-source components, requires zero paid third-party AI tokens, enforces robust security controls (Argon2id, HttpOnly session cookies, CSRF defense, SSRF socket-level protection), and maintains honest labeling of synthetic demonstration datasets versus statutory production endpoints.

---

## 2. Problem Statement

Every year, regulatory authorities like the All India Council for Technical Education (AICTE) evaluate tens of thousands of institutional applications for annual Extension of Approval (EoA), new program introductions, faculty cadre ratios, and intake expansions.

Key challenges in the current scrutiny paradigm:
1. **Cognitive Overload:** Officers must cross-examine dozens of pages across disparate certificates (Land Use, Building Plans, Fire Safety NOCs, AICTE approvals) to verify simple numeric and date parameters.
2. **Intentional & Accidental Discrepancies:** Inflated approved intake figures, expired NOC certificates, and non-contiguous land holdings often slip through manual reviews.
3. **Multilingual Complexity:** State-level approvals frequently combine English, Hindi, and regional scripts with Devanagari numerals (`०-९`), impeding standard regex parsers.
4. **Lack of Evidence Traceability:** Reviewer notes often fail to link findings back to exact document pages, leading to administrative appeals and legal disputes.
5. **Over-Reliance on Black-Box AI:** Opaque machine learning predictions create liability; reviewers cannot explain to institutions why an application was rejected.

---

## 3. Proposed Solution

VerityAI addresses these challenges through a **deterministic-first, AI-assisted architecture**:
* **Evidence-Linked Findings:** Every flagged rule or anomaly explicitly cites the rule identifier, expected value, observed value, document identifier, page number, and timestamp.
* **Deterministic Validation Engine:** Routine checks (required documents, certificate expiry dates, name matching, intake capacity ceilings) are executed by audited deterministic rules rather than stochastic LLM hallucinations.
* **Bilingual & Devanagari Normalization:** Converts Devanagari numerals (`०-९`) to standard Arabic numerals (`0-9`), applies Unicode NFKC normalization, and utilizes a local statutory glossary for regulatory term translation.
* **Human-in-the-Loop Adjudication:** The system never makes a final adverse decision. It acts strictly as an investigative assistant, presenting structured findings to authorized human scrutiny officers.
* **Interoperable Regulatory Gateways:** Provides adapters for local synthetic registries (AISHE), configurable external REST endpoints with strict SSRF defenses, and statutory stubs for unconfigured government portals.

---

## 4. Target Users & Personas

| Role | User Persona | Permissions & Workflow |
|---|---|---|
| **System Administrator** | `admin@verityai.gov.in` | User management, RBAC enforcement, validation rule configuration, gateway adapter management, system health auditing. |
| **Regulatory Scrutiny Officer** | `reviewer@verityai.gov.in` | Scrutiny queue triage, document inspection, anomaly adjudication, finding resolution, scrutiny report generation. |
| **Institution Registrar / Operator** | `operator@verityai.gov.in` | Application submission, document amendment uploads, status tracking, deficiency remediation. |

---

## 5. Key Capabilities (Phases 1–15 Inventory)

* **Phase 1 (Foundation):** FastAPI backend, SQLite/SQLAlchemy ORM, React/TypeScript/Vite frontend.
* **Phase 2 (Core Records):** Institutional entities, academic categories, application intake models.
* **Phase 3 (Document Storage):** Magic-byte MIME verification, SHA-256 deduplication, path-traversal prevention.
* **Phase 4 (Extraction & OCR):** PyMuPDF digital extraction, RapidOCR fallback, DocumentPage database models.
* **Phase 5 (Deterministic Engine):** Four core rule types, persistent evaluation runs, evidence citations.
* **Phase 6 (Anomaly Detection):** Cross-document approved intake mismatch, date sanity, candidate regex extraction.
* **Phase 7 (Authentication & RBAC):** Argon2id password hashing, HttpOnly JWT cookies, CSRF `X-Requested-With` checks.
* **Phase 8 (Workflow Orchestration):** Multi-dimensional review readiness calculation, lifecycle state machine, scrutiny queue.
* **Phase 9 (Explainable Reporting):** PyMuPDF multi-page executive PDF scrutiny reports, machine-readable JSON exports.
* **Phase 10 (Security Hardening):** Strict security headers (`nosniff`, `DENY`), sanitized error responses, DB health probes.
* **Phase 11 (Extended Verification):** Abstract registry provider architecture, Synthetic AISHE adapter, official AICTE stubs.
* **Phase 12 (Multilingual Scrutiny):** Devanagari numeral normalization, script distribution classifier (`en`/`hi`/`mixed`/`und`), offline statutory glossary.
* **Phase 13 (Versioning & Freshness):** Immutable `ApplicationVersion` snapshots, `DocumentRevision` ledgers, dossier freshness auditing.
* **Phase 14 (External Interoperability):** Category A (Synthetic), Category B (Generic REST with SSRF defense), Category C (Statutory Stub), sync history audits.
* **Phase 15 (Pilot Demonstration):** Repeatable synthetic seeding, system readiness pre-flight auditor, evaluation package, SIH demonstration script.

---

## 6. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                           PRESENTATION LAYER (React 19 + TypeScript + Vite)        |
|  - Dashboard & Scrutiny Queue          - Application Detail Workspace (10 Tabs)   |
|  - AuthModal (Argon2id Demo Switcher)  - Documents View & Revision Ledger         |
|  - Comparative Version Diff Engine     - Regulatory Gateways & SSRF Indicator     |
+-----------------------------------------------------------------------------------+
                                         │  (HTTP / JSON, CSRF Protected)
                                         ▼
+-----------------------------------------------------------------------------------+
|                        APPLICATION API LAYER (FastAPI / Starlette)                |
|  - Endpoints: /auth, /applications, /documents, /validation, /reports, /integrations|
|  - Security Middleware: Security Headers, CSRF Verification, Exception Sanitizer  |
|  - RBAC Guards: require_roles(["ADMIN", "REVIEWER", "INSTITUTION_USER"])          |
+-----------------------------------------------------------------------------------+
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
+──────────────────+           +──────────────────+             +──────────────────+
|  DOCUMENT ENGINE |           | VALIDATION & AI  |             |  INTEROPERABILITY|
|  - PyMuPDF Fitz  |           |  - Deterministic |             |  - Synthetic     |
|  - RapidOCR      |           |    Rule Engine   |             |    AISHE Adapter |
|  - Unicode NFKC  |           |  - Cross-Doc     |             |  - SSRF-Defended |
|  - Devanagari    |           |    Anomaly Check |             |    REST Gateway  |
|    Normalization |           |  - Decision      |             |  - Official AICTE|
|  - Local Storage |           |    Support PDF   |             |    Statutory Stub|
+──────────────────+           +──────────────────+             +──────────────────+
        │                                │                                │
        └────────────────────────────────┼────────────────────────────────┘
                                         ▼
+-----------------------------------------------------------------------------------+
|                      DATA PERSISTENCE & AUDIT LEDGER (SQLite)                     |
|  - Institutions, Users, Applications, Categories, Documents, ProcessingRuns       |
|  - DocumentPages, ExtractedFields, ValidationRules, ValidationRuns, Findings      |
|  - RegistryRecords, ApplicationVersions, DocumentRevisions, PortalSyncLogs        |
|  - Append-Only Cryptographic Audit Log (audit_events)                             |
+-----------------------------------------------------------------------------------+
```

---

## 7. Technology Stack

* **Backend:** Python 3.12, FastAPI 0.158, Starlette, Pydantic v2.
* **Database & ORM:** SQLite 3, SQLAlchemy 2.0 (Mapped Column architecture), Alembic migrations.
* **Document Processing:** PyMuPDF (`fitz`) 2.0+, RapidOCR (ONNX Runtime), Pillow (`PIL`).
* **Security & Crypto:** Argon2id (`argon2-cffi`), PyJWT (`HS256`), Python `ipaddress` and `socket` (SSRF filter).
* **Frontend:** React 19, TypeScript 5.8, Vite 8, TailwindCSS v4, Lucide React icons.
* **Testing:** Pytest 9, AnyIO, Pytest-asyncio.

---

## 8. AI and Document-Processing Pipeline

1. **Ingestion & Safety:** File uploads are checked for allowed extensions (`.pdf`, `.png`, `.jpg`), MIME signatures via magic bytes (`%PDF-`, `\x89PNG`, `\xff\xd8\xff`), and a 20MB file size ceiling. Files are stored using randomly generated UUID storage keys outside public directories.
2. **Text Extraction:**
   * PyMuPDF extracts native digital text and font boundaries.
   * If character count < 50 characters, the page falls back to **RapidOCR** (ONNX engine) to extract text from scanned images.
3. **Normalization & Multilingual Analysis:**
   * Text undergoes Unicode NFKC normalization.
   * Devanagari numerals (`०`, `१`, `२`, `३`, `४`, `५`, `६`, `७`, `८`, `९`) are converted to standard Arabic digits (`0-9`).
   * Script distribution classifier computes Latin vs. Devanagari letter proportions and flags short unclassifiable fragments as `und`.
4. **Candidate Field Extraction:** Regex patterns extract candidate fields (`institution_name`, `approved_intake`, `academic_year`, `certificate_number`, `certificate_expiry_date`) and store them in `extracted_fields`.

---

## 9. Deterministic Validation Approach

Unlike generative AI chatbots, VerityAI evaluates institutional compliance using formal deterministic rules:
* `REQUIRED_DOCUMENT`: Verifies required document types exist in the dossier (e.g. `ACCREDITATION_CERTIFICATE`, `LAND_USE_CERTIFICATE`).
* `REQUIRED_FIELD`: Verifies that declared institutional parameters are populated.
* `EXPIRY_CHECK`: Evaluates certificate validity dates against the current operational academic calendar.
* `FIELD_EQUALS_APPLICATION`: Compares extracted document field values against institutional declared application records.

Each rule defines `severity` (`HIGH`, `MEDIUM`, `LOW`), `on_fail_status` (`FAIL`, `NEEDS_REVIEW`), and provenance (`ILLUSTRATIVE` / `STATUTORY`).

---

## 10. Evidence Traceability & Provenance

Every evaluation outcome in VerityAI preserves an unbroken audit chain:
```text
Finding / Rule Result
  ├── Rule Code: ANM-XDOC-INTAKE
  ├── Expected: Declared Intake <= Certified Intake (120)
  ├── Observed: Declared Intake = 180
  └── Evidence Citation:
        ├── Document ID: DOC-DEMO-003 (Zenith_Bilingual_AICTE_Approval_Devanagari.pdf)
        ├── Page Number: 1
        ├── Extracted Field ID: EF-002
        ├── Extracted Raw Value: "स्वीकृत प्रवेश क्षमता (Approved Intake): १२० (120)"
        └── Timestamp & Engine: RapidOCR / NFKC at 2026-10-22 07:27:08 UTC
```

---

## 11. Security and Access Controls

1. **Authentication:** Passwords hashed with **Argon2id** (memory cost 65536 KB, parallelism 4). Session tokens delivered via `HttpOnly`, `SameSite=Lax` cookies.
2. **CSRF Mitigation:** State-mutating endpoints enforce the custom header `X-Requested-With: VerityAI`.
3. **SSRF Defense Subsystem:** Outbound regulatory requests are parsed and resolved via DNS; IP addresses are checked against blocked CIDR blocks:
   * `0.0.0.0/8`, `10.0.0.0/8`, `127.0.0.0/8` (Loopback & Private)
   * `169.254.0.0/16` (Cloud instance metadata: AWS, GCP, Azure)
   * `172.16.0.0/12`, `192.168.0.0/16` (Private RFC 1918)
   * `::1/128`, `fc00::/7`, `fe80::/10` (IPv6 loopback & link-local)
   * Enforces HTTPS scheme for non-synthetic endpoints.
4. **Data Isolation:** All demo datasets are synthetic and isolated; no sensitive private records or real credentials are committed.

---

## 12. Human-Review Decision Model

VerityAI strictly separates automated **findings** from consequential **decisions**:
* The system produces **Reviewer Recommendations** with categorized urgency.
* Adverse determinations (such as deficiency notices or application rejections) require manual sign-off by a qualified Scrutiny Officer.
* Reviewers can accept, reject, or annotate findings; all adjudications are recorded with actor attribution in the `audit_events` ledger.

---

## 13. Test Methodology & Actual Verification Results

Verification was performed through automated test suites in WSL2 Ubuntu 24.04 (Python 3.12.3) and Vite production build checks:

### Automated Test Matrix
| Test Module | Coverage Area | Status | Count |
|---|---|---|---|
| `tests/test_auth.py` | Argon2id, JWT cookies, CSRF, RBAC guards | `PASSED` | 14 |
| `tests/test_applications.py` | Application models, categories, lifecycle | `PASSED` | 8 |
| `tests/test_documents.py` | Uploads, MIME validation, storage protections | `PASSED` | 15 |
| `tests/test_extraction.py` | PyMuPDF text, RapidOCR, quality bands | `PASSED` | 13 |
| `tests/test_validation.py` | Deterministic rules, validation runs, checks | `PASSED` | 19 |
| `tests/test_anomalies.py` | Cross-document discrepancies, findings | `PASSED` | 6 |
| `tests/test_workflow.py` | State machine, review readiness, queue | `PASSED` | 6 |
| `tests/test_reports.py` | PyMuPDF multi-page PDF generation, downloads | `PASSED` | 5 |
| `tests/test_security.py` | Headers, sanitized errors, health probes | `PASSED` | 6 |
| `tests/test_registry.py` | AISHE synthetic adapter, official stub, deduplication | `PASSED` | 9 |
| `tests/test_multilingual.py` | Devanagari numerals, script classifier, glossary | `PASSED` | 7 |
| `tests/test_versioning.py` | Snapshots, document revisions, freshness audit | `PASSED` | 7 |
| `tests/test_integration.py` | SSRF defenses, Category A/B/C adapters, sync log | `PASSED` | 6 |
| **Total Test Suite** | **Comprehensive Full Regression Suite** | **`PASSED`** | **121** |

* **Backend Test Result:** 121 passed, 0 failures in 17.13s.
* **Frontend Build Result:** `vite build` completed in 4.81s with 0 errors.
* **Pre-flight Readiness Audit:** 10/10 checks passed (100% readiness score).

---

## 14. Demonstration Scenarios

1. **Scenario 1 — Fully Compliant Technical Institute (`VAI-2026-0001`):** Complete supporting documents (EoA + Land use certificate), all 6 validation rules pass, synthetic registry matches approved intake 120, ready for immediate approval.
2. **Scenario 2 — Intake Discrepancy & Bilingual Document (`VAI-2026-0002`):** Declared intake 180 vs Devanagari certificate stating १२० (120). Anomaly `ANM-XDOC-INTAKE` elevated; reviewer adjudicates deficiency note.
3. **Scenario 3 — SSRF Security & Statutory Stub:** Attempts to call private metadata endpoints are blocked; probing official AICTE gateway yields clear unconfigured status.
4. **Scenario 4 — Version Freshness & Executive Report:** Document amendment uploads increment revision ledger; PyMuPDF generates multi-page official scrutiny PDF dossier.

---

## 15. Known Limitations & Prototype Boundaries

1. **Prototype Scope:** VerityAI is a hackathon proof-of-concept and does not connect to live, internal AICTE production databases.
2. **Synthetic Data:** All institutional names, AISHE codes, and certificates are synthetic demonstrations.
3. **OCR Engine:** RapidOCR runs on local CPU in the prototype; GPU acceleration would be recommended for large-scale production deployments.
4. **Local File Storage:** Uploads are stored on the local filesystem (`var/uploads`); an S3/MinIO backend would be utilized in multi-node production clusters.

---

## 16. Future Scope & Production Roadmap

* **DigiLocker Direct Integration:** Native OAuth2 API integration for fetching verifiable digital certificates directly from state issuers.
* **Geo-Tagging & Satellite Verification:** Integrating drone/satellite imagery to verify physical contiguous campus land area against GIS land records.
* **National Academic Depository (NAD) Hook:** Cross-referencing faculty rosters with Aadhaar-verified DigiLocker degree credentials.
* **Distributed Async Workers:** Migrating document processing to Celery/RabbitMQ worker pools for horizontal throughput scaling.
