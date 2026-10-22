# PROJECT_STATUS.md — VerityAI & EntityLocker

**Project:** VerityAI / EntityLocker (Smart India Hackathon 2026, Smart Automation Track)  
**Milestone:** Phase 6 — AI-Assisted Document Analysis & Anomaly Detection (P0)  
**Last Updated:** 2026-10-22  
**Baseline Environment:** WSL2 Ubuntu 24.04 LTS (Python 3.12.3, Node.js v22.23.2, npm 10.9.8, SQLite with WAL mode)

---

## 1. Feature Status Inventory

| Component / Feature | Status | Notes / Verified Capabilities |
|---|---|---|
| **AI-Assisted Anomaly Detection Engine (`backend/app/services/anomaly.py`)** | Implemented | Discovers candidate fields (`certificate_number`, `institution_name`, `approved_intake`, `academic_year`, `expiry_date`, `issue_date`, `aishe_code`) with document/page provenance. Detects cross-document name conflict (`ANM-XDOC-NAME`), intake mismatch (`ANM-XDOC-INTAKE`), chronological date inversion (`ANM-DATE-SANITY`), duplicate file upload collision (`ANM-DUPLICATE-FILE`), and degraded OCR quality (`ANM-EXTRACTION-QUALITY`). Carry-over of human reviews on re-analysis. |
| **Findings & Candidate Field Models (`findings`, `finding_evidence`, `extracted_fields`)** | Implemented | Strict conformance to `DATA_MODEL_AND_API.md` (Tables 10, 14, 15). Review states (`OPEN`, `UNDER_REVIEW`, `CONFIRMED`, `DISMISSED`, `RESOLVED`, `AWAITING_EVIDENCE`). Alembic migration `f6afdebbf862` applied and verified. |
| **Anomaly & Analysis APIs (`/api/v1/applications/{id}/analyze`, `/anomalies*`)** | Implemented | `POST /applications/{id}/analyze`, `GET /applications/{id}/analysis`, `GET /applications/{id}/anomalies`, `GET /anomalies/{id}`, `POST /anomalies/{id}/review`, `GET /applications/{id}/extracted-fields`. Full Pydantic v2 schemas. |
| **Scrutiny Workspace Anomalies Tab (`ApplicationDetailWorkspace.tsx`)** | Implemented | Interactive scrutiny tab: advisory banner, scrutiny scan trigger, metric counters, severity/verdict filters, discrepancy cards with expected vs observed values, evidence citations, and human reviewer verdict controls. |
| **Deterministic Validation Engine (`backend/app/services/validation.py`)** | Implemented | Evaluates 4 required rule types (`REQUIRED_DOCUMENT`, `REQUIRED_FIELD`, `EXPIRY_CHECK`, `FIELD_EQUALS_APPLICATION`) against stored applications, uploaded documents, and page-level extracted OCR/text. Injected/deterministic `evaluation_date`. ISO/DMY/Textual date parsing with ambiguity detection. Robust regex with digit lookaheads. Idempotent evaluation with previous-run deactivation and full audit logging (`VALIDATION_INITIATED`, `VALIDATION_COMPLETED`). |
| **Validation Models & Alembic Migration (`validation_rules`, `validation_runs`, `rule_results`)** | Implemented | Conforms strictly to `DATA_MODEL_AND_API.md` (Tables 11, 12, 13). Full foreign key references, status vocabularies (`PASS`, `FAIL`, `NEEDS_REVIEW`, `NOT_APPLICABLE`, `UNABLE_TO_EVALUATE`), and evidence payload snapshots. Alembic migration `6a9eaf48f7bc` applied and verified. |
| **Validation API Endpoints (`/api/v1/validation*`)** | Implemented | `GET /api/v1/validation-rules`, `POST /api/v1/applications/{id}/validate`, `GET /api/v1/applications/{id}/validation-summary`, `GET /api/v1/applications/{id}/validation-results`, `GET /api/v1/validation-results/{id}`. Pydantic v2 schemas and consistent error responses. |
| **Application Scrutiny Workspace Validation Tab (`ApplicationDetailWorkspace.tsx`)** | Implemented | Full interactive validation tab in Scrutiny Workspace: "Run Scrutiny Validation" / "Re-run Validation" triggers, status banner (`All Passed`, `Requires Review`, `Failed`), metric counters, status filter pills, evidence-linked result cards with expected vs observed value comparisons, page badges, OCR confidence, unresolved reason tags, and direct document OCR inspection links. Zero fabricated statistics. |
| **Validation Rules Live Catalog (`ValidationComplianceView.tsx`)** | Implemented | Displays live database-persisted scrutiny rules catalog fetched from `GET /api/v1/validation-rules`. Shows rule code, version, severity, rule type, parameter breakdown, category applicability, and synthetic demonstration labeling. |
| **Design System & Visual Tokens** | Implemented | Unified tokens for Brand (Lavender `#CBB3E8`, Purple `#7450D8`, Deep Purple `#5633B8`), Primary Actions (Tomato Red `#E34234`, Button Red `#F04438`), Neutrals (`#FAF9FC`, `#FFFFFF`, `#171B45`, `#5F6485`), and Statuses. Inter typography and 8px spacing grid. |
| **VerityAI Information Architecture & Shell (`AppShell`)** | Implemented | Navigation: Overview, Applications, Scrutiny Queue, Documents, Validation Rules, Institutions, Audit Trail. Truthful Scrutiny Session metadata panel (Reviewer role, SQLite WAL storage, VerityAI v0.2). |
| **Institutional Overview Dashboard (`DashboardView`)** | Implemented | Workload-centric: registered applications, awaiting scrutiny count, drafts, document processing distribution (Extracted, Processing, Needs Review), active applications work queue with direct Scrutiny Workspace triggers, and live regulatory audit events feed. Zero fabricated percentages or metrics. |
| **Scrutiny Queue (`ScrutinyQueueView`)** | Implemented | Dedicated queue for submitted applications awaiting official review, tracking document readiness, extraction completeness, and direct "Examine Scrutiny" workspace triggers. |
| **Registered Technical Institutions (`EntitiesView`)** | Implemented | AICTE institutional directory displaying registered engineering and technical colleges from the live SQLite database, AISHE identifiers, city, state, and tenant isolation status. |
| **Regulatory Audit Timeline (`AuditTimelineView`)** | Implemented | Chronological timeline of regulatory audit events loaded directly from `GET /api/v1/audit-events`. Actor-isolation for system events (`actor_id = None`, `actor_type = 'SYSTEM'`). |
| **Core Models (`User`, `Institution`, `ApplicationCategory`, `Application`, `AuditEvent`)** | Implemented | SQLAlchemy 2.0 models conforming to `DATA_MODEL_AND_API.md`. Foreign keys enforce `RESTRICT`/`SET NULL`; SQLite WAL and PRAGMA foreign_keys=ON verified. |
| **Document & Processing Run Models (`Document`, `ProcessingRun`)** | Implemented | UUID primary keys, relative storage keys, SHA-256 deduplication indexing, lifecycle status tracking, and cascading processing runs. Migration `5770d28a3aaa` applied. |
| **Document Pages Model (`DocumentPage`)** | Implemented | Tracks `document_id`, `processing_run_id`, `page_number`, `text_source` (`DIGITAL_TEXT`, `OCR`, `NONE`), `raw_text`, `clean_text`, `char_count`, `ocr_mean_confidence` (strictly null for digital text), `rotation_applied`, `status`, `error_code`, `duration_ms`. Migration `66af7474b624` applied. |
| **Secure File Storage (`backend/app/services/storage.py`)** | Implemented | Isolated storage root outside public directories (`./var/uploads`), relative key pattern `<app_id>/<doc_id>/original.<ext>`, strict path traversal prevention, atomic file write with temporary file cleanup on failure. |
| **Multi-Layer File Validation & Security** | Implemented | Content-based magic byte inspection for PDF (`%PDF-`), PNG (`\x89PNG\r\n\x1a\n`), and JPEG (`\xff\xd8\xff`). Checks extension allowlist, compares detected mime against extension and declared mime, rejects empty files (422), enforces 20MB size limit (413). |
| **Document Upload Endpoint (`POST /api/v1/applications/{id}/documents`)** | Implemented | Multipart upload returning HTTP 202 Accepted. Enqueues asynchronous text extraction in `BackgroundTasks` so upload returns immediately. |
| **Document Listing & Metadata APIs** | Implemented | `GET /api/v1/applications/{id}/documents`, `GET /api/v1/documents`, and `GET /api/v1/documents/{id}` return paginated metadata without exposing internal filesystem paths. Exposes `extraction_quality_band`. |
| **Secure File Preview/Download (`GET /api/v1/documents/{id}/file`)** | Implemented | Protected streaming endpoint with `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, sanitized Content-Disposition (`inline` or `attachment`), missing-file graceful handling, and audit logging. |
| **Modular Text Extraction Service (`backend/app/services/extraction.py`)** | Implemented | PyMuPDF for native digital text extraction (>= 50 chars threshold); conservative normalization (Unicode NFKC, de-hyphenation, whitespace collapse). Scanned PDF fallback and PNG/JPEG OCR via RapidOCR (`rapidocr-onnxruntime`). |
| **Page-Level Extraction API (`GET /api/v1/documents/{id}/pages`)** | Implemented | Returns page-level text, text source (`DIGITAL_TEXT`, `OCR`, `NONE`), engine-reported confidence, character counts, and timings. |
| **Processing Status & Quality API (`GET /api/v1/documents/{id}/processing`)** | Implemented | Exposes current processing run, status, quality summary, safe error summaries, and warnings. |
| **Idempotent Reprocess Endpoint (`POST /api/v1/documents/{id}/reprocess`)** | Implemented | Allows re-running extraction and OCR on demand. Enforces conflict rejection (409) if processing is active; replaces previous page records safely without orphans. |
| **Document Extraction Workspace (`DocumentsView.tsx`)** | Implemented | Comprehensive multi-tab document workspace: page-by-page extracted text viewer with copy action, OCR engine confidence disclaimers, inline document preview, pipeline run metadata & quality breakdown, live status badges, automated polling for in-progress jobs, and reprocess actions. |
| **System Liveness (`GET /api/v1/health`)** | Implemented | Live `SELECT 1` database query probe, version and timestamp diagnostics; verified via automated unit and regression tests. |

---

## 2. Test Execution & Verified Results

| Test Target | Command | Real Result |
|---|---|---|
| **Backend Test Suite (61 tests)** | `pytest backend/tests -v` | **61 passed**, 0 failed in 5.37s |
| • `test_candidate_field_extraction` | Regex-based candidate field extraction with page provenance | Passed |
| • `test_cross_document_name_and_intake_anomalies` | Detects ANM-XDOC-NAME and ANM-XDOC-INTAKE with citations | Passed |
| • `test_date_sanity_and_duplicate_file_anomalies` | Detects inverted dates (ANM-DATE-SANITY) and duplicate SHA-256 | Passed |
| • `test_degraded_ocr_extraction_quality_anomaly` | Detects ANM-EXTRACTION-QUALITY for poor OCR quality bands | Passed |
| • `test_reviewer_workflow_and_carry_over` | Human reviewer verdict updates & carry-over on re-analysis | Passed |
| • `test_anomaly_api_endpoints` | Tests all /api/v1/applications/{id}/analyze and anomaly endpoints | Passed |
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
| • `test_alembic_migrations_fresh_database` | Fresh SQLite upgrade & downgrade including validation tables | Passed |
| • `test_database_persistence_across_restart` | Disk persistence across engine close | Passed |
| • `test_parse_date_string_iso` | Parses ISO dates (2026-10-22) | Passed |
| • `test_parse_date_string_dmy` | Parses DMY dates with slashes/dashes | Passed |
| • `test_parse_date_string_ambiguous` | Flags ambiguous MM/DD vs DD/MM as uncertain | Passed |
| • `test_parse_date_string_textual_month` | Parses dates with month names (31 March 2026) | Passed |
| • `test_parse_date_string_malformed` | Rejects malformed dates cleanly without crash | Passed |
| • `test_required_document_missing` | Flags missing mandatory doc as FAIL with clear explanation | Passed |
| • `test_required_document_present_and_processed` | Reports PASS when doc is uploaded and processed | Passed |
| • `test_required_document_processing_in_progress` | Flags in-flight doc as NEEDS_REVIEW (not FAIL or PASS) | Passed |
| • `test_required_document_extraction_failed` | Flags failed extraction as NEEDS_REVIEW (manual review) | Passed |
| • `test_required_field_present_on_page` | Identifies certificate_number on page, captures page # & OCR conf | Passed |
| • `test_required_field_missing_on_readable_document` | Distinguishes missing field from missing document | Passed |
| • `test_expiry_check_valid_date` | Verifies certificate validity against evaluation_date baseline | Passed |
| • `test_expiry_check_expired_date` | Reports FAIL on expired certificate with exact day deficit | Passed |
| • `test_field_equals_application_name_matching` | Cross-checks declared name vs certificate with case/space norm | Passed |
| • `test_field_equals_application_numeric_intake_mismatch` | Reports FAIL on numeric intake capacity mismatch | Passed |
| • `test_validation_idempotency_and_audit` | Repeated evaluation archives old run, creates audit events | Passed |
| • `test_api_list_validation_rules` | GET /api/v1/validation-rules returns synthetic rule catalog | Passed |
| • `test_api_trigger_and_get_summary` | POST /validate and GET /validation-summary API integration | Passed |
| • `test_api_nonexistent_application_404` | 404 on nonexistent application validation | Passed |
| **Frontend TypeScript Build** | `npm run build` | **Built successfully** (`tsc -b && vite build`) in 8.49s with 0 errors |

---

## 3. Known Limitations and Deferred Requirements

* **Authentication Sessions (Deferred to Phase 7):** Full cookie-based login (`POST /api/v1/auth/login`) is scheduled after document processing and the rule engine.
* **Layout / Table Analysis (P1):** Multi-column reading order and complex table structure parsing are P1 enhancements; current pipeline extracts text in conservative reading order.
* **Official AICTE Rule Catalog Verification (Production Requirement):** Demonstration rules (`RULE-DOC-ACCRED`, `RULE-DOC-LAND`, `RULE-FLD-CERTNO`, `RULE-EXP-ACCRED`, `RULE-CMP-NAME`, `RULE-CMP-INTAKE`) are realistic synthetic prototypes. Production deployment requires verifying exact statutory rules and tolerance thresholds against the AICTE Approval Process Handbook (APH).

---

## 4. Next Recommended Action

**Phase 6 — Cross-Document Checks, Verification Registry & Issuer Verification (P0):**
1. Implement cross-document consistency checks (corroborating institution identifiers across multiple distinct documents).
2. Implement synthetic verification registry (`verification_attempts` model and simulated issuer fixture lookup).
3. Connect issuer verification status to evidence findings and human reviewer adjudication.
