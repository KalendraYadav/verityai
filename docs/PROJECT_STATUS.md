# PROJECT_STATUS.md — VerityAI & EntityLocker

**Project:** VerityAI / EntityLocker (Smart India Hackathon 2026, Smart Automation Track)  
**Milestone:** Phase 3 — Document Handling & Secure Uploads (P0)  
**Last Updated:** 2026-10-22  
**Baseline Environment:** WSL2 Ubuntu 24.04 LTS (Python 3.12.3, Node.js v22.23.2, npm 10.9.8, SQLite with WAL mode)

---

## 1. Feature Status Inventory

| Component / Feature | Status | Notes / Verified Capabilities |
|---|---|---|
| **Design System & Visual Tokens** | Implemented | Unified tokens for Brand (Lavender `#CBB3E8`, Purple `#7450D8`, Deep Purple `#5633B8`), Primary Actions (Tomato Red `#E34234`, Button Red `#F04438`), Neutrals (`#FAF9FC`, `#FFFFFF`, `#171B45`, `#5F6485`), and Statuses. Inter typography and 8px spacing grid. |
| **Shared Application Shell (`AppShell`)** | Implemented | Collapsible left sidebar (Dashboard, Applications, Documents, Entities, Workflows, Analytics, Audit Logs, Settings) with active lavender states, storage quota meter, global search, and reviewer profile badge (`RY`). Matches Reference 4. |
| **Public-Facing Landing Page (`LandingPage`)** | Implemented | High-fidelity hero with organic lavender background blobs, "For Entities, Organizations and MSMEs" typography, tomato-red CTA, floating document illustration, 3-step "How It Works" circular process cards, and regulatory compliance features. Matches References 1, 2, and 3. |
| **Authenticated Portal Dashboard (`DashboardView`)** | Implemented | 4 summary metric cards, recent applications/documents table, alerts & notifications panel, linked entities card, circular validation gauge, and real-time activity timeline backed by live backend APIs. Upload Document button opens the document upload dialog with real application selection. Matches Reference 4. |
| **Institutional Entities View (`EntitiesView`)** | Implemented | Tenant directory displaying registered institutions from the live SQLite database, isolation badges, and search filtering. |
| **Regulatory Audit Timeline (`AuditTimelineView`)** | Implemented | Chronological timeline of audit events loaded directly from `GET /api/v1/audit-events`. |
| **Global Audit Events API (`GET /api/v1/audit-events`)** | Implemented | Endpoint supporting query limit for platform-wide audit log scrutiny. |
| **Core Models (`User`, `Institution`, `ApplicationCategory`, `Application`, `AuditEvent`)** | Implemented | SQLAlchemy 2.0 models conforming to `DATA_MODEL_AND_API.md`. Foreign keys enforce `RESTRICT`/`SET NULL`; SQLite WAL and PRAGMA foreign_keys=ON verified. |
| **Document & Processing Run Models (`Document`, `ProcessingRun`)** | Implemented | Conforms to Section 6.6 and Section 6.7 of `DATA_MODEL_AND_API.md`. UUID primary keys, relative storage keys, SHA-256 deduplication indexing, lifecycle status tracking, and cascading processing runs. Migration `5770d28a3aaa` applied. |
| **Secure File Storage (`backend/app/services/storage.py`)** | Implemented | Isolated storage root outside public directories (`./var/uploads`), relative key pattern `<app_id>/<doc_id>/original.<ext>`, strict path traversal and directory escape prevention, atomic file write with temporary file cleanup on failure. |
| **Multi-Layer File Validation & Security** | Implemented | Content-based magic byte inspection for PDF (`%PDF-`), PNG (`\x89PNG\r\n\x1a\n`), and JPEG (`\xff\xd8\xff`). Checks extension allowlist, compares detected mime against extension and declared mime, rejects empty files (422), enforces 20MB size limit (413) during streaming. |
| **Document Upload Endpoint (`POST /api/v1/applications/{id}/documents`)** | Implemented | Multipart upload returning HTTP 202 Accepted. Verifies application existence and lifecycle status, computes SHA-256 checksum, checks duplicate content, writes Document and ProcessingRun records, and records `DOCUMENT_UPLOADED` or `FILE_REJECTED` audit event. |
| **Document Listing & Metadata APIs** | Implemented | `GET /api/v1/applications/{id}/documents`, `GET /api/v1/documents`, and `GET /api/v1/documents/{id}` return paginated metadata without exposing internal filesystem paths. |
| **Secure File Preview/Download (`GET /api/v1/documents/{id}/file`)** | Implemented | Protected streaming endpoint with `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, sanitized Content-Disposition (`inline` or `attachment`), missing-file graceful handling (marks file `MISSING`), and audit logging (`DOCUMENT_VIEWED`/`DOCUMENT_DOWNLOADED`). |
| **Frontend Document Upload Modal (`DocumentUploadModal.tsx`)** | Implemented | EntityLocker lavender/purple/tomato-red modal with drag-and-drop dropzone, application selector, document category selector, client-side validation, progress/loading spinner, duplicate detection warnings, and success summary. |
| **Documents Workspace (`DocumentsView.tsx`)** | Implemented | Replaces placeholder with full document management table: search by filename, application filter, file type badges, formatted sizes, status badges, inline PDF/image preview modal, and secure download action. |
| **System Liveness (`GET /api/v1/health`)** | Implemented | Live `SELECT 1` database query probe, version and timestamp diagnostics; verified via automated unit and regression tests. |
| **Synthetic Demo Data Seeder (`app.db.seed`)** | Implemented | Idempotent script creating 2 synthetic institutions, 4 role-based synthetic users with Argon2id passwords, 1 category, 2 sample applications (`DRAFT` and `SUBMITTED`), and audit events. |
| **Document Text Extraction & OCR** | Planned | Phase 4 (Text extraction via PyMuPDF + RapidOCR fallback, page-level confidence tracking). |
| **Automated Compliance Engine** | Planned | Phase 5 (Rule evaluation and evidence linking). |

---

## 2. Test Execution & Verified Results

| Test Target | Command | Real Result |
|---|---|---|
| **Backend Test Suite (27 tests)** | `pytest tests/ -v` | **27 passed**, 0 failed (1.63s) |
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
| • `test_upload_pdf_success` | 202 Accepted, Document + ProcessingRun + Audit | Passed |
| • `test_upload_png_success` | Content magic byte detection for PNG | Passed |
| • `test_upload_jpeg_success` | Content magic byte detection for JPEG | Passed |
| • `test_empty_file_rejected` | 422 EMPTY_FILE + FILE_REJECTED audit | Passed |
| • `test_unsupported_extension_rejected` | 415 UNSUPPORTED_MEDIA_TYPE | Passed |
| • `test_extension_content_mismatch_rejected` | 415 FILE_TYPE_MISMATCH | Passed |
| • `test_file_too_large_rejected` | 413 FILE_TOO_LARGE streaming abort | Passed |
| • `test_upload_nonexistent_application_rejected` | 404 APPLICATION_NOT_FOUND | Passed |
| • `test_duplicate_content_detected` | Flags `possible_duplicate: true` on SHA-256 match | Passed |
| • `test_list_and_get_document_metadata` | Paginated listing, no absolute paths exposed | Passed |
| • `test_preview_and_download_document_file` | Nosniff, cache-control: no-store, Content-Disposition | Passed |
| • `test_missing_stored_file_handling` | Graceful 404 FILE_NOT_FOUND and marks MISSING | Passed |
| • `test_storage_path_traversal_protection` | Directory traversal blocked in storage resolver | Passed |
| • `test_health_endpoint_healthy` | Live probe regression | Passed |
| • `test_root_endpoint` | Root schema regression | Passed |
| • `test_alembic_migrations_fresh_database` | Fresh SQLite upgrade & downgrade including documents | Passed |
| • `test_database_persistence_across_restart` | Disk persistence across engine close | Passed |
| **Frontend TypeScript Build** | `npm run build` | **Built successfully** (`tsc -b && vite build`) in 32.92s with 0 errors |
| **Seed Data Idempotency** | `python -m app.db.seed` | Verified 2 consecutive runs without duplicate errors |

---

## 3. Known Limitations and Deferred Requirements

* **Automated Text Extraction / OCR (Phase 4):** Documents are currently ingested and queued in status `QUEUED`. Text extraction and classification pipelines are scheduled for Phase 4.
* **Authentication Sessions (Deferred to Phase 7):** Full cookie-based login (`POST /api/v1/auth/login`) is scheduled after document processing and the rule engine. Document uploads currently resolve the acting user from the application's institution or the baseline synthetic institution representative (`USR-INST-01`).

---

## 4. Next Recommended Action

**Phase 4 — Document Text Extraction & Scrutiny OCR Pipeline (P0):**
1. Implement text extraction worker using PyMuPDF for native digital PDFs and RapidOCR fallback for scanned/image pages.
2. Store page-level extracted text and confidence scores in `document_pages`.
3. Implement `GET /api/v1/documents/{id}/pages` and `GET /api/v1/documents/{id}/processing` endpoints for progress polling.
