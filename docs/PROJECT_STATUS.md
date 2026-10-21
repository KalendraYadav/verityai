# PROJECT_STATUS.md — VerityAI

**Project:** VerityAI (Smart India Hackathon 2026, Smart Automation Track)  
**Milestone:** Phase 2 Complete — Core Records & Application Ingestion (P0)  
**Last Updated:** 2026-10-22  
**Baseline Environment:** WSL2 Ubuntu 24.04 LTS (Python 3.12.3, Node.js v22.23.2, npm 10.9.8, SQLite with WAL mode)

---

## 1. Feature Status Inventory

| Component / Feature | Status | Notes / Verified Capabilities |
|---|---|---|
| **Repository Baseline & Tooling** | Implemented | Git initialized; root `.gitignore` and `.env.example` protecting secrets/databases; backend `.venv` with Python 3.12.3; frontend packages with React 19 / Vite. |
| **Documentation Alignment** | Implemented | Standardized `/api/v1/` prefix and HttpOnly session cookie authorization across planning documents and API implementations. |
| **System Liveness (`GET /api/v1/health`)** | Implemented | Live `SELECT 1` database query probe, version and timestamp diagnostics; verified via automated unit and regression tests. |
| **Database Migrations** | Implemented | Alembic migrations (`alembic/versions/c31b1d8b8fbf_0001_initial_core_records.py`) tested with forward migration (`upgrade head`) and rollback (`downgrade base`) on fresh SQLite instances. |
| **Core Models (`User`, `Institution`, `ApplicationCategory`, `Application`, `AuditEvent`)** | Implemented | SQLAlchemy 2.0 models conforming to `DATA_MODEL_AND_API.md`. Foreign keys enforce `RESTRICT`/`SET NULL`; SQLite WAL and PRAGMA foreign_keys=ON verified. |
| **Institutions API (`GET /api/v1/institutions`, `POST /api/v1/institutions`)** | Implemented | Lists active institutions and allows registering institutional applicant entities. |
| **Application Categories API (`GET /api/v1/application-categories`)** | Implemented | Exposes enabled application categories (e.g. `EOA_ILLUSTRATIVE`) and required fields. |
| **Applications Ingestion API (`POST /api/v1/applications`)** | Implemented | Validates foreign keys (institutions, categories), enforces `YYYY-MM-DD` date formatting for declared dates, generates `VAI-YYYY-XXXX` references, and writes an `APPLICATION_CREATED` audit event in the same transaction. |
| **Applications Scrutiny List API (`GET /api/v1/applications`)** | Implemented | Supports pagination (`page`, `page_size`), lifecycle filtering (`DRAFT`, `SUBMITTED`), free-text search (`q`), and sorting (`-created_at`). |
| **Application Detail & Audit API (`GET /api/v1/applications/{id}`, `GET /api/v1/applications/{id}/audit-events`)** | Implemented | Returns full application object and append-only audit event timeline. |
| **Synthetic Demo Data Seeder (`app.db.seed`)** | Implemented | Deterministic, idempotent script creating 2 synthetic institutions, 4 role-based synthetic users (admin, reviewer, registrar, dean with Argon2id passwords), 1 category, 2 sample applications (`DRAFT` and `SUBMITTED`), and audit events. |
| **Frontend UI (Health Monitor & Application Workspace)** | Implemented | React/Vite/TS dashboard displaying mandatory amber synthetic data banner, AICTE header, live connectivity status card, application filters, searchable records table, and application creation modal. Verified via `npm run build`. |
| **Document Processing & OCR** | Planned | Phase 3 (Upload, size/mime validation, storage) and Phase 4 (Text extraction via PyMuPDF + RapidOCR fallback). |
| **Automated Compliance Engine** | Planned | Phase 5 (Rule evaluation and evidence linking). |
| **External Registry Verification** | Planned | Phase 6 (Simulated verification registry). |

---

## 2. Test Execution & Verified Results

| Test Target | Command | Real Result |
|---|---|---|
| **Backend Test Suite (13 tests)** | `pytest -v` | **13 passed**, 0 failed (1.19s) |
| • `test_create_and_list_institution` | In-memory SQLite | Passed |
| • `test_create_application_success` | In-memory SQLite + Audit check | Passed |
| • `test_list_applications_with_pagination_and_filter` | Query filters & pagination meta | Passed |
| • `test_get_application_detail` | Detail retrieval by ID | Passed |
| • `test_get_application_not_found` | 404 with standard error body | Passed |
| • `test_create_application_nonexistent_institution` | 404 INSTITUTION_NOT_FOUND | Passed |
| • `test_create_application_nonexistent_category` | 404 CATEGORY_NOT_FOUND | Passed |
| • `test_create_application_invalid_date_format` | 422 VALIDATION_ERROR on non-ISO date | Passed |
| • `test_get_application_audit_events` | Audit timeline ordered by timestamp | Passed |
| • `test_health_endpoint_healthy` | Live probe regression | Passed |
| • `test_root_endpoint` | Root schema regression | Passed |
| • `test_alembic_migrations_fresh_database` | Fresh SQLite upgrade & downgrade | Passed |
| • `test_database_persistence_across_restart` | Disk persistence across engine close | Passed |
| **Frontend TypeScript Build** | `npm run build` | **Built successfully** in 6.92s with 0 errors |
| **Seed Data Idempotency** | `python -m app.db.seed` | Verified 2 consecutive runs without duplicate errors |

---

## 3. Known Limitations and Deferred Requirements

* **Authentication Sessions (Deferred to Phase 7 / Auth Slice):**
  Full session cookie authentication (`POST /api/v1/auth/login`) is not yet implemented. In Phase 2, `created_by` on draft applications safely resolves to the applicant institution's assigned user or the baseline synthetic institution representative (`USR-INST-01`).
* **Document Processing & OCR (Phase 3 & 4):**
  Document upload endpoints and file handling remain deferred to Phase 3. Applications currently persist metadata and declared fields.
* **Findings Count:**
  `open_findings_count` on the application list returns `null` for applicant views per `DATA_MODEL_AND_API.md` (preliminary findings are internal and hidden until official review).

---

## 4. Next Recommended Action

**Phase 3 — Document Handling & Secure Uploads (P0):**
1. Define `Document` and `ProcessingRun` SQLAlchemy models with SHA-256 deduplication and storage metadata.
2. Implement `POST /api/v1/applications/{id}/documents` with file type validation (PDF, JPEG, PNG via magic numbers/signatures), size limits, and randomized secure local storage paths.
3. Add document listing and metadata retrieval endpoints.
