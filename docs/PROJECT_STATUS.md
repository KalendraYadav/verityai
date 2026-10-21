# PROJECT_STATUS.md — VerityAI & EntityLocker

**Project:** VerityAI / EntityLocker (Smart India Hackathon 2026, Smart Automation Track)  
**Milestone:** Visual Design System Integration & Core Records Workspace  
**Last Updated:** 2026-10-22  
**Baseline Environment:** WSL2 Ubuntu 24.04 LTS (Python 3.12.3, Node.js v22.23.2, npm 10.9.8, SQLite with WAL mode)

---

## 1. Feature Status Inventory

| Component / Feature | Status | Notes / Verified Capabilities |
|---|---|---|
| **Design System & Visual Tokens** | Implemented | Unified tokens for Brand (Lavender `#CBB3E8`, Purple `#7450D8`, Deep Purple `#5633B8`), Primary Actions (Tomato Red `#E34234`, Button Red `#F04438`), Neutrals (`#FAF9FC`, `#FFFFFF`, `#171B45`, `#5F6485`), and Statuses. Inter typography and 8px spacing grid. |
| **Shared Application Shell (`AppShell`)** | Implemented | Collapsible left sidebar (Dashboard, Applications, Documents, Entities, Workflows, Analytics, Audit Logs, Settings) with active lavender states, storage quota meter, global search, and reviewer profile badge (`RY`). Matches Reference 4. |
| **Public-Facing Landing Page (`LandingPage`)** | Implemented | High-fidelity hero with organic lavender background blobs, "For Entities, Organizations and MSMEs" typography, tomato-red CTA, floating document illustration, 3-step "How It Works" circular process cards, and regulatory compliance features. Matches References 1, 2, and 3. |
| **Authenticated Portal Dashboard (`DashboardView`)** | Implemented | 4 summary metric cards, recent applications/documents table, alerts & notifications panel, linked entities card, circular validation gauge, and real-time activity timeline backed by live backend APIs. Matches Reference 4. |
| **Institutional Entities View (`EntitiesView`)** | Implemented | Tenant directory displaying registered institutions from the live SQLite database, isolation badges, and search filtering. |
| **Regulatory Audit Timeline (`AuditTimelineView`)** | Implemented | Chronological timeline of audit events loaded directly from `GET /api/v1/audit-events`. |
| **Global Audit Events API (`GET /api/v1/audit-events`)** | Implemented | Added endpoint supporting query limit for platform-wide audit log scrutiny. |
| **Core Models (`User`, `Institution`, `ApplicationCategory`, `Application`, `AuditEvent`)** | Implemented | SQLAlchemy 2.0 models conforming to `DATA_MODEL_AND_API.md`. Foreign keys enforce `RESTRICT`/`SET NULL`; SQLite WAL and PRAGMA foreign_keys=ON verified. |
| **Applications Ingestion API (`POST /api/v1/applications`)** | Implemented | Validates foreign keys, enforces `YYYY-MM-DD` date formatting for declared dates, generates `VAI-YYYY-XXXX` references, and writes an `APPLICATION_CREATED` audit event in the same transaction. |
| **Applications Scrutiny List API (`GET /api/v1/applications`)** | Implemented | Supports pagination (`page`, `page_size`), lifecycle filtering (`DRAFT`, `SUBMITTED`), free-text search (`q`), and sorting (`-created_at`). |
| **System Liveness (`GET /api/v1/health`)** | Implemented | Live `SELECT 1` database query probe, version and timestamp diagnostics; verified via automated unit and regression tests. |
| **Synthetic Demo Data Seeder (`app.db.seed`)** | Implemented | Idempotent script creating 2 synthetic institutions, 4 role-based synthetic users with Argon2id passwords, 1 category, 2 sample applications (`DRAFT` and `SUBMITTED`), and audit events. |
| **Document Processing & OCR** | Planned | Phase 3 (Upload, size/mime validation, storage) and Phase 4 (Text extraction via PyMuPDF + RapidOCR fallback). |
| **Automated Compliance Engine** | Planned | Phase 5 (Rule evaluation and evidence linking). |

---

## 2. Test Execution & Verified Results

| Test Target | Command | Real Result |
|---|---|---|
| **Backend Test Suite (14 tests)** | `pytest -v` | **14 passed**, 0 failed (1.25s) |
| • `test_create_and_list_institution` | In-memory SQLite | Passed |
| • `test_create_application_success` | In-memory SQLite + Audit check | Passed |
| • `test_list_applications_with_pagination_and_filter` | Query filters & pagination meta | Passed |
| • `test_get_application_detail` | Detail retrieval by ID | Passed |
| • `test_get_application_not_found` | 404 with standard error body | Passed |
| • `test_create_application_nonexistent_institution` | 404 INSTITUTION_NOT_FOUND | Passed |
| • `test_create_application_nonexistent_category` | 404 CATEGORY_NOT_FOUND | Passed |
| • `test_create_application_invalid_date_format` | 422 VALIDATION_ERROR on non-ISO date | Passed |
| • `test_get_application_audit_events` | Audit timeline ordered by timestamp | Passed |
| • `test_list_global_audit_events` | Global audit events endpoint check | Passed |
| • `test_health_endpoint_healthy` | Live probe regression | Passed |
| • `test_root_endpoint` | Root schema regression | Passed |
| • `test_alembic_migrations_fresh_database` | Fresh SQLite upgrade & downgrade | Passed |
| • `test_database_persistence_across_restart` | Disk persistence across engine close | Passed |
| **Frontend TypeScript Build** | `npm run build` | **Built successfully** in 5.07s with 0 errors |
| **Seed Data Idempotency** | `python -m app.db.seed` | Verified 2 consecutive runs without duplicate errors |

---

## 3. Known Limitations and Deferred Requirements

* **Document File Upload Pipeline (Phase 3):** File attachment ingestion and SHA-256 storage are deferred to Phase 3. The UI currently supports creating applications with preliminary declared metadata.
* **Authentication Sessions (Deferred to Phase 7):** Full cookie-based login (`POST /api/v1/auth/login`) is scheduled after document processing and the rule engine. For now, `created_by` on newly created draft applications safely maps to the institution's designated applicant user or the baseline synthetic institution representative (`USR-INST-01`).

---

## 4. Next Recommended Action

**Phase 3 — Document Handling & Secure Uploads (P0):**
1. Define `Document` and `ProcessingRun` SQLAlchemy models with SHA-256 deduplication and storage metadata.
2. Implement `POST /api/v1/applications/{id}/documents` with file validation (PDF, PNG, JPEG), size enforcement, and safe local storage outside web-accessible directories.
3. Add drag-and-drop document upload interface in the frontend connecting directly to the upload endpoint.
