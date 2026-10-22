# PROJECT_STATUS.md — VerityAI & EntityLocker

**Project:** VerityAI / EntityLocker (Smart India Hackathon 2026, Smart Automation Track)  
**Milestone:** Phase 4 + UI Direction Correction (VerityAI Institutional Information Architecture)  
**Last Updated:** 2026-10-22  
**Baseline Environment:** WSL2 Ubuntu 24.04 LTS (Python 3.12.3, Node.js v22.23.2, npm 10.9.8, SQLite with WAL mode)

---

## 1. Feature Status Inventory

| Component / Feature | Status | Notes / Verified Capabilities |
|---|---|---|
| **Design System & Visual Tokens** | Implemented | Unified tokens for Brand (Lavender `#CBB3E8`, Purple `#7450D8`, Deep Purple `#5633B8`), Primary Actions (Tomato Red `#E34234`, Button Red `#F04438`), Neutrals (`#FAF9FC`, `#FFFFFF`, `#171B45`, `#5F6485`), and Statuses. Inter typography and 8px spacing grid. Reference images treated strictly as color palette and styling guide. |
| **VerityAI Information Architecture & Shell (`AppShell`)** | Implemented | Product-centric navigation: Overview, Applications, Scrutiny Queue, Documents, Validation Rules, Institutions, Audit Trail. Removed copied SaaS patterns (storage quota meter, generic SaaS labels). Added truthful Scrutiny Session metadata panel (Reviewer role, SQLite WAL storage, VerityAI v0.2). |
| **Institutional Overview Dashboard (`DashboardView`)** | Implemented | Workload-centric: registered applications, awaiting scrutiny count, drafts, document processing distribution (Extracted, Processing, Needs Review), active applications work queue with direct Scrutiny Workspace triggers, and live regulatory audit events feed. Removed fake +12% metrics, fake compliance percentages, and circular gauge. |
| **Application Scrutiny Workspace (`ApplicationDetailWorkspace`)** | Implemented | Central scrutiny workspace: Application dossier, category required documents checklist (evaluates PRESENT vs MISSING), submitted documents with extraction quality badges, live scrutiny audit trail, and institution profile. |
| **Scrutiny Queue (`ScrutinyQueueView`)** | Implemented | Dedicated queue for submitted applications awaiting official review, tracking document readiness, extraction completeness, and direct "Examine Scrutiny" workspace triggers. |
| **Validation & Compliance Rules (`ValidationComplianceView`)** | Implemented | Deterministic rule type definitions (`REQUIRED_DOCUMENT`, `REQUIRED_FIELD`, `EXPIRY_CHECK`, `DATE_SANITY`, `FIELD_EQUALS_APPLICATION`, `UNIQUENESS`), result status vocabulary (`PASS`, `FAIL`, `NEEDS_REVIEW`, `UNABLE_TO_EVALUATE`), evidence-linking standards, and live category required document checklists. |
| **Registered Technical Institutions (`EntitiesView`)** | Implemented | AICTE institutional directory displaying registered engineering and technical colleges from the live SQLite database, AISHE identifiers, city, state, and tenant isolation status. |
| **Regulatory Audit Timeline (`AuditTimelineView`)** | Implemented | Chronological timeline of regulatory audit events loaded directly from `GET /api/v1/audit-events`. |
| **Core Models (`User`, `Institution`, `ApplicationCategory`, `Application`, `AuditEvent`)** | Implemented | SQLAlchemy 2.0 models conforming to `DATA_MODEL_AND_API.md`. Foreign keys enforce `RESTRICT`/`SET NULL`; SQLite WAL and PRAGMA foreign_keys=ON verified. |
| **Document & Processing Run Models (`Document`, `ProcessingRun`)** | Implemented | Conforms to Section 6.6 and Section 6.7 of `DATA_MODEL_AND_API.md`. UUID primary keys, relative storage keys, SHA-256 deduplication indexing, lifecycle status tracking, and cascading processing runs. Migration `5770d28a3aaa` applied. |
| **Document Pages Model (`DocumentPage`)** | Implemented | Conforms strictly to Section 6.7 of `DATA_MODEL_AND_API.md`. Tracks `document_id`, `processing_run_id`, `page_number`, `text_source` (`DIGITAL_TEXT`, `OCR`, `NONE`), `raw_text`, `clean_text`, `char_count`, `ocr_mean_confidence` (engine-reported float, strictly null for digital text), `rotation_applied`, `status`, `error_code`, `duration_ms`. Alembic migration `66af7474b624` applied. |
| **Secure File Storage (`backend/app/services/storage.py`)** | Implemented | Isolated storage root outside public directories (`./var/uploads`), relative key pattern `<app_id>/<doc_id>/original.<ext>`, strict path traversal and directory escape prevention, atomic file write with temporary file cleanup on failure. |
| **Multi-Layer File Validation & Security** | Implemented | Content-based magic byte inspection for PDF (`%PDF-`), PNG (`\x89PNG\r\n\x1a\n`), and JPEG (`\xff\xd8\xff`). Checks extension allowlist, compares detected mime against extension and declared mime, rejects empty files (422), enforces 20MB size limit (413) during streaming. |
| **Document Upload Endpoint (`POST /api/v1/applications/{id}/documents`)** | Implemented | Multipart upload returning HTTP 202 Accepted. Enqueues asynchronous text extraction in `BackgroundTasks` so upload returns immediately. |
| **Document Listing & Metadata APIs** | Implemented | `GET /api/v1/applications/{id}/documents`, `GET /api/v1/documents`, and `GET /api/v1/documents/{id}` return paginated metadata without exposing internal filesystem paths. Exposes `extraction_quality_band`. |
| **Secure File Preview/Download (`GET /api/v1/documents/{id}/file`)** | Implemented | Protected streaming endpoint with `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, sanitized Content-Disposition (`inline` or `attachment`), missing-file graceful handling (marks file `MISSING`), and audit logging (`DOCUMENT_VIEWED`/`DOCUMENT_DOWNLOADED`). |
| **Modular Text Extraction Service (`backend/app/services/extraction.py`)** | Implemented | PyMuPDF for native digital text extraction (>= 50 chars threshold); conservative normalization (Unicode NFKC, de-hyphenation, whitespace collapse). Scanned PDF fallback and PNG/JPEG OCR via RapidOCR (`rapidocr-onnxruntime`). |
| **Page-Level Extraction API (`GET /api/v1/documents/{id}/pages`)** | Implemented | Returns page-level text, text source (`DIGITAL_TEXT`, `OCR`, `NONE`), engine-reported confidence, character counts, and timings. |
| **Processing Status & Quality API (`GET /api/v1/documents/{id}/processing`)** | Implemented | Exposes current processing run, status, quality summary (`pages_total`, `pages_processed`, `pages_failed`, `text_source_mix`, `ocr_mean_confidence`, `extraction_quality_band`, `total_characters`), safe error summaries, and warnings. |
| **Idempotent Reprocess Endpoint (`POST /api/v1/documents/{id}/reprocess`)** | Implemented | Allows re-running extraction and OCR on demand. Enforces conflict rejection (409) if processing is currently active; replaces previous page records safely without orphans. |
| **EntityLocker Document Extraction Workspace (`DocumentsView.tsx`)** | Implemented | Comprehensive multi-tab document workspace: page-by-page extracted text viewer with copy action, OCR engine confidence disclaimers, inline document preview, pipeline run metadata & quality breakdown, live status badges, automated polling for in-progress jobs, and reprocess actions. |
| **System Liveness (`GET /api/v1/health`)** | Implemented | Live `SELECT 1` database query probe, version and timestamp diagnostics; verified via automated unit and regression tests. |
| **Automated Compliance Engine** | Planned | Phase 5 (Deterministic rule evaluation, findings registry, evidence linking). |

---

## 2. Test Execution & Verified Results

| Test Target | Command | Real Result |
|---|---|---|
| **Backend Test Suite (36 tests)** | `pytest backend/tests -v` | **36 passed**, 0 failed in 4.55s |
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
| • `test_text_normalization_utility` | Unicode NFKC, de-hyphenation, and whitespace collapse | Passed |
| • `test_digital_pdf_extraction` | Digital PDF extraction via PyMuPDF (strictly null confidence) | Passed |
| • `test_multi_page_digital_pdf_extraction` | Multi-page text extraction retaining page order | Passed |
| • `test_scanned_pdf_ocr_fallback` | Genuine RapidOCR fallback for scanned PDF (real confidence float) | Passed |
| • `test_image_png_ocr` | Genuine RapidOCR inference on PNG document | Passed |
| • `test_blank_image_no_text_extracted` | Blank image -> MANUAL_REVIEW_REQUIRED and NO_TEXT_EXTRACTED | Passed |
| • `test_corrupt_pdf_failure_handling` | Malformed PDF -> FAILED and FILE_CORRUPTED | Passed |
| • `test_missing_file_failure_handling` | Missing stored file -> FAILED and FILE_MISSING | Passed |
| • `test_pages_and_processing_api_endpoints` | GET /pages, GET /processing, POST /reprocess verification | Passed |
| • `test_health_endpoint_healthy` | Live probe regression | Passed |
| • `test_root_endpoint` | Root schema regression | Passed |
| • `test_alembic_migrations_fresh_database` | Fresh SQLite upgrade & downgrade including document_pages | Passed |
| • `test_database_persistence_across_restart` | Disk persistence across engine close | Passed |
| **Frontend TypeScript Build** | `npm run build` | **Built successfully** (`tsc -b && vite build`) in 9.53s with 0 errors |
| **Genuine OCR Smoke Test** | `RapidOCR() & test_scanned_pdf_ocr_fallback` | Executed real ONNX runtime inference, verified non-null confidence in `[0.0, 1.0]` |

---

## 3. Known Limitations and Deferred Requirements

* **Authentication Sessions (Deferred to Phase 7):** Full cookie-based login (`POST /api/v1/auth/login`) is scheduled after document processing and the rule engine.
* **Layout / Table Analysis (P1):** Multi-column reading order and complex table structure parsing are P1 enhancements; current pipeline extracts text in conservative reading order.
* **Hindi Language Pack (P1):** Current OCR model uses default English/Latin weights; multi-lingual models can be loaded via configuration in P1.

---

## 4. Next Recommended Action

**Phase 5 — Deterministic Validation Engine & Rule Results (P0):**
1. Implement document-type clue matching and classification.
2. Build rule evaluation engine (`REQUIRED_DOCUMENT`, `REQUIRED_FIELD`, `EXPIRY_CHECK`, `FIELD_EQUALS_APPLICATION`).
3. Persist rule evaluation results and findings linked to page-level extracted text evidence.
