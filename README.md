# VerityAI / EntityLocker

> **Smart India Hackathon 2026 — Smart Automation Track**  
> **Intelligent Decision-Support Platform for Institutional Application Scrutiny & Regulatory Verification**

[![Backend Tests](https://img.shields.io/badge/pytest-121%20passed-success)](backend/tests)
[![Python](https://img.shields.io/badge/python-3.12-blue)](backend)
[![React](https://img.shields.io/badge/react-19-blue)](frontend)
[![Vite](https://img.shields.io/badge/vite-8-purple)](frontend)
[![Security](https://img.shields.io/badge/security-Argon2id%20%7C%20SSRF%20Shield-green)](backend/app/core/security.py)

---

## 1. Project Overview

**VerityAI** is an evidence-traceable, explainable decision-support prototype built to assist regulatory scrutiny officers in evaluating institutional applications (e.g. AICTE Extension of Approval, program introductions, intake expansions) and their supporting evidentiary documents.

### Key Highlights
* **Zero Paid AI Token Dependencies:** Runs completely offline using open-source PyMuPDF and RapidOCR engines.
* **Deterministic Validation Engine:** Rigid compliance rules evaluate required documents, expiration dates, and intake ceilings with zero LLM hallucination.
* **Evidence Traceability:** Every finding links directly to the source document, page number, and extracted text fragment.
* **Devanagari & Multilingual Scrutiny:** Normalizes Devanagari numerals (`०-९` to `0-9`) and parses bilingual state certificates.
* **Robust Defense in Depth:** Enforces Argon2id password hashing, HttpOnly session cookies, CSRF protection, and socket-level SSRF defenses.
* **Human-in-the-Loop Authority:** AI assists but never issues adverse decisions; qualified scrutiny officers retain ultimate decision authority.

---

## 2. System Architecture

```text
+---------------------------------------------------------------+
|             Frontend (React 19, TypeScript, Vite)             |
|   Dashboard, Scrutiny Queue, 10-Tab Application Workspace     |
+---------------------------------------------------------------+
                               │ (REST API / CSRF Protected)
                               ▼
+---------------------------------------------------------------+
|                  Backend API (FastAPI / Starlette)            |
|   Auth (Argon2id), RBAC, Validation Engine, Workflow State    |
+---------------------------------------------------------------+
        │                      │                      │
        ▼                      ▼                      ▼
+---------------+      +---------------+      +---------------+
| PyMuPDF / OCR |      | Interoperable |      | SQLite 3 /    |
| Text & Tables |      | Gateways      |      | Audit Ledger  |
+---------------+      +---------------+      +---------------+
```

---

## 3. Quickstart Guide

### Prerequisites
* **Python 3.11+** (Python 3.12 recommended)
* **Node.js 18+** & npm
* **WSL2 / Linux / macOS** or Windows with bash

### 1. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate
pip install -r requirements.txt # Or install pyproject dependencies

# Apply database migrations
alembic upgrade head

# Seed synthetic demo applications, users, rules & PDF files
PYTHONPATH=. python -m app.db.seed
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build   # Production bundle verification
npm run dev     # Starts development server at http://localhost:5173
```

### 3. Verify Demonstration Readiness
Run the pre-flight readiness audit tool from the backend directory:
```bash
PYTHONPATH=. python -m app.cli.readiness
```

---

## 4. Demo Accounts & Credentials

The system provides quick-switch demo profiles in the login modal:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin@verityai.gov.in` | `AdminSecurePass123!` | System configuration, gateway adapters, user management |
| **Reviewer** | `reviewer@verityai.gov.in` | `ReviewerPass123!` | Scrutiny queue, anomaly adjudication, PDF reports |
| **Operator** | `operator@verityai.gov.in` | `OperatorPass123!` | Application submission, document amendment uploads |

---

## 5. Automated Test Suite

VerityAI maintains a 100% passing automated test suite with zero regressions:

```bash
cd backend

# Run the complete test suite (121 tests)
pytest -v

# Run specific functional modules
pytest tests/test_validation.py -v   # Deterministic validation engine
pytest tests/test_anomalies.py -v    # Cross-document inconsistency checks
pytest tests/test_multilingual.py -v # Devanagari numerals & translation
pytest tests/test_integration.py -v  # SSRF defenses & gateway adapters
pytest tests/test_versioning.py -v   # Revisions & freshness auditing
```

---

## 6. Demonstration Scenarios

* **Scenario 1 (`VAI-2026-0001` - Apex Institute):** Fully compliant technical institute dossier with certified intake capacity of 120 and valid land possession.
* **Scenario 2 (`VAI-2026-0002` - Zenith College):** Declared intake 180 vs Devanagari certificate stating १२० (120). Flags `ANM-XDOC-INTAKE` anomaly for reviewer adjudication.
* **Scenario 3 (Interoperability Gateways):** Category A (Synthetic AISHE), Category B (Generic REST with SSRF defense), Category C (Official AICTE statutory stub disclosing unconfigured production credentials).

For full step-by-step presentation instructions, see [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).  
For the complete technical evaluation package, see [`docs/EVALUATION_PACKAGE.md`](docs/EVALUATION_PACKAGE.md).

---

## 7. Security & Statutory Disclosures

* **Prototype Disclaimer:** VerityAI is a hackathon prototype developed for Smart India Hackathon 2026. It is not an operational AICTE production portal.
* **Synthetic Data:** All demonstration institutions, certificates, and reference registries are synthetic.
* **SSRF Defenses:** Outbound external requests to loopback addresses (`127.0.0.1`), private networks (`10.0.0.0/8`, `192.168.0.0/16`), and cloud instance metadata (`169.254.169.254`) are intercepted and rejected at the socket layer.

---

## 8. License

Developed for **Smart India Hackathon (SIH) 2026**. Prototype intellectual property and documentation.
