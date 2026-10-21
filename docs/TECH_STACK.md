# VerityAI — Technology Stack Specification

**Document:** `docs/TECH_STACK.md` (second project document)
**Companion document:** `docs/ARCHITECTURE.md` (primary architectural reference)
**Project:** VerityAI — Problem Statement SIH26261
**Status:** Implementation-ready, provisional until `ARCHITECTURE.md` is cross-checked (see Section 3)

---

## 1. Document Purpose

This document fixes the technology choices for the VerityAI hackathon prototype. It exists so that a beginner developer and an AI coding agent can build the application without re-debating tools halfway through the three-to-four-day schedule.

How to use it:

- Treat every row in Section 5 and Section 19 as a **decision**, not a suggestion. If the agent proposes a different library, the answer is "no" unless this document is updated first.
- Where a section says **P0**, build it first. **P1** only after P0 works end to end. **P2** only if time remains.
- This document contains no application source code and no complete dependency manifest. Exact versions are resolved at install time and recorded in lock files.

---

## 2. Project Overview

**VerityAI** is an AI-assisted document-validation and compliance-verification platform for institutional applications to the **All India Council for Technical Education (AICTE)**, Ministry of Education, Government of India. It addresses **SIH26261**: *AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification* (theme: Smart Automation).

The prototype demonstrates one coherent workflow:

```
Application creation → Document upload → File validation → Text extraction / OCR
→ Classification → Structured field extraction → Normalization
→ Configurable validation → Cross-document comparison → Anomaly indicators
→ Verification-source handling → Compliance assessment
→ Evidence-linked findings → Human review → Report → Audit history
```

Non-negotiable properties of the prototype:

- **Working end to end.** Real uploads, real extraction, real database records, real dashboard numbers. No hardcoded statistics, no fake AI responses.
- **Decision support only.** The system never auto-rejects an institution and never declares a document fraudulent. Authorized officials retain every regulatory decision.
- **Runs locally** on an ordinary laptop without GPU, paid APIs, or access to private AICTE systems.
- **Honest labelling.** Synthetic data and simulated verification are always labelled as such.
- **Deadline:** approximately three to four days.

---

## 3. Architecture Alignment

### 3.1 Status of `ARCHITECTURE.md`

`docs/ARCHITECTURE.md` was **not available** in the environment where this document was written. The stack below is therefore derived from the project requirements and from the following **assumptions about the architecture**. These assumptions are consistent with the requirements stated for the project and must be verified against the actual file.

| # | Assumption | If wrong, impact |
|---|-----------|------------------|
| A1 | Modular monolith: one backend service, one SPA frontend, no microservices. | Low; stack is monolith-friendly. |
| A2 | Frontend talks to backend only via documented REST/JSON endpoints and never computes authoritative validation results. | None. |
| A3 | Document-processing pipeline is staged: file validation → text extraction/OCR → classification → field extraction → normalization → validation. | Low. |
| A4 | A rules engine (validation + compliance) lives in the backend as a separate module. | Low. |
| A5 | A verification-provider abstraction exists, supporting simulated, manual, and future real providers. | None. |
| A6 | Relational data model (users, institutions, applications, documents, fields, rules, findings, verification results, compliance checks, reviewer actions, audit events). | Low. |
| A7 | Document files stored outside the frontend's public directory behind an access-controlled download endpoint. | None. |
| A8 | Three roles: institution user, authorized reviewer, administrator. | Low. |
| A9 | Priorities P0/P1/P2 exist; this document re-states them for the stack only. | Low. |

### 3.2 Rule for conflicts

If `ARCHITECTURE.md` already finalized a technology (for example a different web framework or database), **that decision wins** and the corresponding row here must be changed. Where `ARCHITECTURE.md` is silent or provisional, this document's choice applies.

Genuine open items are listed in Section 26.

---

## 4. Technology Selection Principles

Every choice was scored against these criteria, roughly in this order of weight for this project:

1. **Implementation speed** and **ease of setup** — three to four days is very short.
2. **Beginner friendliness** and **AI-coding-agent compatibility** — prefer mainstream tools with abundant, stable documentation; agents write these most reliably.
3. **Compatibility with the architecture** — modular monolith, REST boundary.
4. **Free, open-source, local execution** — no paid API, no GPU, no cloud requirement.
5. **Reliability, security, testing support.**
6. **Low integration complexity and low maintenance burden.**
7. **Suitability for a live demonstration.**

Dependency discipline rules applied:

- One library per job; no overlapping libraries.
- No message broker, vector database, microservice, or Kubernetes.
- No GPU-specific packages.
- Libraries needing native build steps are avoided unless essential. The only unavoidable system-level install is the **Tesseract OCR binary** (Section 9).
- "Choose the simplest thing that works" beats "impressive".

---

## 5. Final Recommended Technology Stack

| Component | Selected technology | Purpose | Reason for selection | Priority | Status |
|---|---|---|---|---|---|
| Frontend framework | React + Vite (single-page app) | Admin UI | Most AI-agent-friendly stack; Vite starts instantly; no server-side rendering needed behind a login | P0 | Required |
| Frontend language | TypeScript | Type-safe UI code | Catches agent mistakes at build time; types align with API schemas | P0 | Required |
| Styling | Tailwind CSS | Layout and theming | Fast, consistent, minimal custom CSS | P0 | Required |
| Components | shadcn/ui (Radix primitives, copied into repo) | Tables, dialogs, tabs, badges, forms | Polished, accessible, no heavy runtime library | P0 | Required |
| Icons | lucide-react | Icons | Default pairing with shadcn/ui | P0 | Required |
| Charts | Recharts | Dashboard/analytics charts | Simple declarative API; adequate for bar/line/pie | P1 | Required for analytics |
| Routing | React Router | Pages and role-guarded routes | Standard | P0 | Required |
| API client | TanStack Query + thin typed `fetch` wrapper | Fetching, caching, polling job status | Handles loading/error/polling cleanly | P0 | Required |
| Form validation | React Hook Form + Zod | Client-side input checks (UX only) | Standard, well documented | P0 | Required |
| Backend framework | FastAPI | REST API | Automatic OpenAPI docs, Pydantic integration, excellent agent support | P0 | Required |
| Python version | Python 3.12 (3.11 acceptable) | Runtime | Wheels exist for all chosen libraries | P0 | Required |
| Request/response validation | Pydantic v2 (+ pydantic-settings) | Schemas and configuration | Native to FastAPI | P0 | Required |
| ORM | SQLAlchemy 2.x (typed, sync sessions) | Database access | Mature; portable between SQLite and PostgreSQL | P0 | Required |
| Database | SQLite (WAL mode, foreign keys ON) | Persistence | Zero setup; sufficient for prototype load | P0 | Required |
| Migrations | Alembic (batch mode for SQLite) | Schema versioning | Standard companion to SQLAlchemy | P0 | Required |
| PDF text extraction | PyMuPDF (`pymupdf`) | Direct text + positions from digital PDFs | Fast, one library for text, rendering, metadata | P0 | Required |
| PDF rendering | PyMuPDF | Rasterize scanned pages for OCR | Same library; no Poppler install | P0 | Required |
| OCR | Tesseract 5 via `pytesseract` | OCR with word confidence | Free, offline, CPU-only, per-word confidence and boxes | P0 | Required |
| Image processing | Pillow | Open, validate, convert, simple preprocessing | Pure wheels, enough for prototype | P0 | Required |
| Hashing | Python `hashlib` (SHA-256) | Exact duplicate detection, integrity | Standard library | P0 | Required |
| File-type detection | `filetype` (magic bytes) + open-test with PyMuPDF/Pillow | Content-based file validation | Pure Python, no `libmagic` install pain | P0 | Required |
| Document classification | Keyword/regex scoring classifier | Assign document type with confidence | Deterministic, explainable, testable | P0 | Required |
| Field extraction | Regex + label-proximity parsing (+ `python-dateutil`) | Structured fields from text | Reliable on synthetic and semi-structured docs | P0 | Required |
| Fuzzy matching | RapidFuzz | Institution-name and text similarity | Fast, pip-only | P1 | Required for cross-document checks |
| Rule execution | Custom registry-based rules engine; rules defined in YAML (PyYAML), validated by Pydantic | Validation and compliance checks | Understandable, testable, no framework | P0 | Required |
| Anomaly detection | Explainable heuristic indicators (PDF metadata, OCR confidence, date logic, duplicates) | Flag items for human attention | Honest and feasible; no custom ML | P1 | Required (basic) |
| Optional LLM | Ollama (local) via `httpx`, behind an interface, disabled by default | Optional extraction/classification assist | Free, local, private; core never depends on it | P2 | Optional |
| File storage | Local filesystem behind a `StorageBackend` interface | Store uploaded files | Simplest secure option; swappable later | P0 | Required |
| Authentication | Username/password login → signed JWT (PyJWT) in HttpOnly cookie | Identify users | Simple, secure enough for prototype | P0 | Required |
| Password hashing | argon2-cffi (Argon2id) | Store password hashes | Modern, prebuilt wheels | P0 | Required |
| Authorization | FastAPI dependency-based role checks + object-level ownership checks | Enforce RBAC on backend | Backend-enforced; frontend only mirrors it | P0 | Required |
| Verification adapter | Python `Protocol`/ABC `VerificationProvider` with Simulated, Manual (and stub-only Real) providers | Issuer verification abstraction | Provider-independent, honest labelling | P0 | Required |
| Reporting (PDF) | ReportLab | Downloadable review report | Pure wheels; no GTK/browser dependency | P1 | Optional (but desirable) |
| Reporting (data) | Python `csv` standard library | CSV export | No dependency | P1 | Required |
| Unit testing | pytest (+ pytest-cov) | Backend tests | Standard | P0 | Required |
| API testing | FastAPI `TestClient` (httpx) with pytest | Endpoint and RBAC tests | No extra tool | P0 | Required |
| Frontend testing | Vitest + React Testing Library | Component tests | Vite-native | P1 | Optional |
| End-to-end testing | Playwright | Demo-path regression | Reliable, installs its own browsers | P1 | Optional |
| Performance testing | Custom benchmark script (`time.perf_counter`) + Locust | Pipeline duration; API latency/throughput | Simple, pip-only | P1 | Required for benchmarks |
| Logging | Python standard `logging` with request-ID middleware | Application logs | No extra dependency | P0 | Required |
| Environment config | `.env` file + pydantic-settings | Configuration and secrets | Typed, validated config | P0 | Required |
| Dependency management (backend) | `uv` with `pyproject.toml` and lock file (plain `pip` + venv as fallback) | Reproducible installs | Fast, one tool | P0 | Required |
| Dependency management (frontend) | npm with `package-lock.json` | Reproducible installs | Ships with Node | P0 | Required |
| Linting/formatting | Ruff (backend); ESLint + Prettier (frontend) | Code quality | Fast; agents run them easily | P1 | Optional |
| Local development | Two processes: `uvicorn` backend + Vite dev server | Daily workflow | No Docker needed | P0 | Required |
| Optional deployment | Docker (single multi-stage image / Docker Compose) | Reproducible demo deployment | Convenience only | P2 | Optional |

---

## 6. Frontend Stack

### 6.1 Selections

- **Framework:** React with **Vite** as a single-page application.
  *Why not Next.js:* the app is an authenticated admin tool with a separate API. Server components, SSR, and a second server runtime add complexity with no demo benefit.
- **Language:** TypeScript with strict mode.
- **Styling:** Tailwind CSS. Colors, spacing, and radius defined once as theme tokens so the UI looks consistent.
- **Components:** shadcn/ui. Components are generated into the repository (`frontend/src/components/ui/`) and owned by the project, not pulled as a large runtime dependency. Use for: Button, Card, Table, Tabs, Dialog, Badge, Input, Select, Textarea, Toast, Dropdown Menu, Progress, Skeleton.
- **Icons:** lucide-react only.
- **Charts:** Recharts (bar, line, donut). Charts render data returned by backend statistics endpoints; the frontend never recomputes metrics.
- **Routing:** React Router with a role-aware route guard (UX convenience only).
- **API client:** a single small typed wrapper around `fetch` in `frontend/src/api/`, used through **TanStack Query** hooks. Polling of processing-job status uses TanStack Query's refetch interval. Optional (P1): generate TypeScript types from the backend's OpenAPI schema with `openapi-typescript` to keep the contract in sync.
- **Forms:** React Hook Form with Zod schemas. Client validation is for usability only; **the backend re-validates everything**.
- **Testing:** Vitest + React Testing Library (P1) for a few key components; Playwright (P1) for the main demo path.

### 6.2 Status vocabulary (UI contract)

The UI must display **six separate status dimensions**, never a single merged "status". Each has its own badge component and color mapping, defined once in `frontend/src/lib/status.ts` (or equivalent) and mirroring backend enums:

| Dimension | Example values |
|---|---|
| Processing status | `queued`, `processing`, `completed`, `failed` |
| Extraction status | `not_started`, `text_extracted`, `ocr_extracted`, `low_confidence`, `extraction_failed` |
| Validation status | `not_run`, `passed`, `failed`, `needs_review`, `not_applicable`, `unable_to_evaluate` (per finding; rolled up for display) |
| Issuing-authority verification status | `not_requested`, `pending`, `verified_real`, `verified_simulated`, `mismatch_reported`, `source_unavailable`, `manual_review_required` |
| Compliance status | `not_assessed`, `compliant_on_checked_items`, `gaps_identified`, `incomplete_assessment` |
| Human-review status | `awaiting_review`, `in_review`, `accepted`, `flagged`, `returned_for_clarification` |

The backend owns the definitive enum lists; the values above are the planned set and must be reconciled with `ARCHITECTURE.md`.

Visual rules: simulated results always carry a visible **SIMULATED** badge; synthetic data carries a **SYNTHETIC DATA** banner; anomaly findings use the word **"indicator"**, never "fraud".

### 6.3 Frontend limitations (accepted)

No offline support, no internationalization framework, no mobile-first design (desktop admin usage assumed).

---

## 7. Backend Stack

### 7.1 Selections

- **Framework:** FastAPI served by `uvicorn`. Synchronous route handlers (plain `def`) for database and processing work; FastAPI runs them in a threadpool. This avoids async SQLAlchemy complexity, which is a common source of agent-generated bugs.
- **Python:** 3.12 preferred; 3.11 acceptable. Do not use 3.13+ until all OCR/PDF wheels are confirmed available on the developer's OS.
- **Validation/serialization:** Pydantic v2 models for every request and response; `pydantic-settings` for configuration.
- **ORM:** SQLAlchemy 2.x with the typed declarative style and synchronous sessions; one session per request via a FastAPI dependency.
- **Migrations:** Alembic, with `render_as_batch=True` so SQLite `ALTER TABLE` limitations don't block schema changes. Migrations are committed. A single `alembic upgrade head` creates the database.
- **API documentation:** the auto-generated OpenAPI/Swagger UI at `/docs` (and `/openapi.json`). All endpoints must have response models, so this serves as the documented API boundary. Endpoints live under `/api/v1/`.
- **Logging:** standard-library `logging`. A middleware assigns a request ID, logs method/path/status/duration, and includes the ID in log lines. Logs must never contain document text, passwords, or tokens. Console output in development; optional JSON format later.
- **Background processing:** see 7.2.
- **Testing:** pytest; FastAPI `TestClient`; a temporary SQLite database per test session (see Section 16).

### 7.2 Background processing decision

**Decision:** No Celery, no Redis, no external broker.

Document processing (rendering + OCR) can take seconds per page, which is too long for a blocking HTTP request, but the dataset is small (a few applications, a few dozen documents).

- Upload endpoint saves the file, creates a `Document` row and a `ProcessingJob` row with status `queued`, and returns immediately (HTTP 202-style response with the job/document ID).
- A small **in-process worker** (standard-library `concurrent.futures.ThreadPoolExecutor`, 2 workers) runs the pipeline. Each pipeline stage updates the persisted job record (stage name, status, timing, error message).
- The frontend polls the document/job status endpoint (TanStack Query refetch interval).
- On backend startup, any job left in `processing` is marked `failed` with reason "interrupted by restart" so nothing is stuck forever. A "Reprocess" button re-queues it.
- Because job state lives in the database and not in memory, this design can be swapped for a real queue later without changing the API.

*Fallback:* if threading causes SQLite locking problems during development, lower the worker count to 1. Throughput is not a P0 goal.

*Why not FastAPI `BackgroundTasks` alone:* it works, but gives no bounded concurrency control and is harder to reason about for OCR-heavy work. The executor adds roughly ten lines of structure and is clearer.

### 7.3 Module boundaries (stack view)

The backend is a modular monolith. Modules communicate via Python function calls and service classes, never via HTTP to each other:

`api` (routers) → `services` → `processing` (pipeline), `rules` (engine), `verification` (providers), `storage`, `reports` → `db` (models/repositories). Detailed structure is in Section 21.

---

## 8. Database and Persistence

### 8.1 Decision: SQLite for the prototype

| Criterion | SQLite | PostgreSQL |
|---|---|---|
| Setup | None; a file | Docker or installer, credentials, service management |
| Beginner friendliness | Highest | Medium |
| Concurrency | Single writer; fine for a few users and 2 workers | Excellent |
| Demo portability | Copy a file | Requires running service |
| Testing | In-memory or temp file, instant | Needs a running server |
| Future production | Not suitable for multi-user load | Suitable |

**Selected: SQLite** (via the Python standard `sqlite3` driver underneath SQLAlchemy).

Assumptions under which SQLite is sufficient:

1. Single-machine deployment, a handful of concurrent users (demo/judging).
2. Tens of applications and low hundreds of documents.
3. At most two concurrent processing workers.
4. No requirement for high availability.

Required SQLite configuration (implemented in the database session setup, specified here for the agent):

- `PRAGMA foreign_keys=ON` on every connection (SQLite ignores foreign keys otherwise).
- `PRAGMA journal_mode=WAL` for better read/write concurrency.
- A busy timeout so short lock waits retry instead of failing.
- All timestamps stored in **UTC**.
- Enumerated values stored as strings with constraints.
- Structured payloads (for example evidence references, extracted-value metadata) stored in JSON columns where a relation would be overkill.

### 8.2 Path to PostgreSQL

The ORM and migrations are portable. To move to PostgreSQL later: change `DATABASE_URL`, add the `psycopg` driver, regenerate/validate migrations against PostgreSQL, replace SQLite-specific pragmas, and run the test suite against PostgreSQL. No application logic should use SQLite-specific SQL; the agent must not write raw SQL strings except in clearly isolated analytics queries.

Docker is **not needed** for the database in the prototype.

### 8.3 What is persisted

Users and roles; institutions; applications; documents (metadata, hash, storage key, status); extracted fields (value, normalized value, source page, bounding box, confidence, extraction method); processing jobs; rule definitions (synced from YAML); validation findings; verification requests/results; compliance checks; reviewer actions; audit events; report records.

### 8.4 Dashboard statistics

All dashboard and analytics numbers are computed from live queries (SQLAlchemy aggregate queries) through dedicated statistics endpoints. There is **no** hardcoded or pre-baked metric. Status definitions come from the same enums used everywhere else.

### 8.5 Database testing strategy

- Tests use a **temporary SQLite database** created fresh for each test session and migrated with Alembic (so migrations are tested too), or `create_all` for fast unit tests.
- Each test runs in a transaction or against a clean database.
- A dedicated test verifies that deleting/archiving behaves consistently with foreign keys on.
- A seed script populates synthetic demo data (clearly flagged `is_synthetic`).

---

## 9. Document Processing and OCR

### 9.1 Minimal library set

| Job | Library | Notes |
|---|---|---|
| Direct PDF text, page text blocks with coordinates, metadata, page rendering, embedded images | **PyMuPDF** | One library replaces pypdf, pdfplumber, and pdf2image/Poppler |
| OCR | **Tesseract 5 + pytesseract** | Word-level confidence and bounding boxes via TSV output |
| Image handling | **Pillow** | Open, verify, convert, resize, grayscale, simple contrast/threshold |
| Hashing | `hashlib` SHA-256 | Streamed hashing of uploaded bytes |
| Content-type detection | **filetype** + open-test | See Section 11 |
| Date/ID normalization | `re` + **python-dateutil** (with explicit day-first handling for Indian date formats) | Ambiguous dates are flagged, not silently guessed |
| Fuzzy comparison | **RapidFuzz** (P1) | Names, addresses, near-duplicate text |

**Not selected:** pdfplumber and pypdf (redundant with PyMuPDF); OpenCV (heavy, optional later for deskewing/QR detection); PaddleOCR (large model downloads, heavier dependencies, painful installs on some systems); cloud OCR services.

**Licensing note:** PyMuPDF is licensed under AGPL (with a commercial option). This is acceptable for an open-source hackathon prototype, but the licence must be reviewed before any proprietary or government deployment. Fallback if licensing becomes a problem: `pypdf` for text plus `pypdfium2` for rendering.

### 9.2 Installation difficulty (documented explicitly)

**Tesseract is the one dependency with a system-level install.** It is a normal installer or package, not a compile step:

- Windows: install a Tesseract 5 build and add it to `PATH` (or set `TESSERACT_CMD` in `.env`).
- macOS: install via the standard package manager.
- Linux/Docker: install the `tesseract-ocr` package (plus language data).

Language data: English (`eng`) required; Hindi (`hin`) optional (P2). The startup health check must verify that the Tesseract binary is reachable and report a clear error if not.

**Documented fallback:** if Tesseract cannot be installed on the developer's machine within the first hours, switch the OCR adapter to **RapidOCR (onnxruntime)**, which installs with pip only. Because OCR is behind an `OcrEngine` interface, only one adapter changes. This is a fallback, not a parallel implementation: do not build both unless needed.

### 9.3 Processing pipeline decisions

1. **Input classification** (per file): digital PDF, scanned PDF, or standalone image.
2. **Digital PDF test:** extract text per page with PyMuPDF. If a page has a meaningful amount of text (a configurable minimum character count), use it as **direct text** (extraction method = `pdf_text`, confidence not applicable/high by construction).
3. **Scanned page or image:** render page at a configurable DPI (start around 200–300) and run Tesseract; record per-word confidence and bounding boxes; compute page-level mean confidence. Extraction method = `ocr`.
4. **Mixed PDFs:** decide per page.
5. **Page and size limits:** a configurable maximum page count per document and maximum pixel dimensions for images (defends against decompression bombs and runaway processing).
6. **Classification** → **field extraction** → **normalization** (Sections 9.4–9.5).
7. Every extracted field stores: raw value, normalized value, document, page number, bounding box (when available), extraction method, confidence (when available), and a link back to the source text span. This is the basis for evidence-linked findings and evidence highlighting in the UI.

### 9.4 OCR failure handling

| Situation | Behaviour |
|---|---|
| Tesseract binary missing | Health check fails loudly at startup; documents stay `failed` with a clear "OCR unavailable" reason |
| Unreadable/corrupt file | Document marked `failed`, error stored, audit event written; no stack trace shown to the user |
| Very low OCR confidence | Extraction status `low_confidence`; dependent rules return **`unable_to_evaluate`** or **`needs_review`**, **not** `failed` |
| Empty text | Same as above; the reviewer sees the page image |
| Page/size limit exceeded | Rejected with an explanatory message |
| Processing exception | Job failed; "Reprocess" available |

**Key principle:** if extraction fails, the system must never claim the document failed a regulatory check that could not actually be performed. The result is `unable_to_evaluate`.

### 9.5 Classification and field extraction

- **Classification (P0):** a keyword/regex scoring classifier. A YAML configuration lists, for each document type, indicative phrases and weights. The output is a type plus a confidence score and the matched phrases (so the decision is explainable). Low-confidence classifications are marked `needs_review`. The reviewer can override the type (recorded in the audit log).
- **Field extraction (P0):** regex and label-proximity parsing ("label: value" patterns, known headings), configured per document type in YAML. Normalization handles dates, institution names (case/punctuation/whitespace), numeric values (intake counts), and identifiers (formatting/whitespace stripped, uppercase).
- **Optional LLM assist (P2):** see Section 10.
- **Synthetic documents** are generated in a consistent, labelled layout so extraction accuracy can be measured meaningfully (Section 16). The document must state this limitation: accuracy on synthetic documents does not predict accuracy on real-world documents.

### 9.6 Extraction is not authentication

Successfully extracting text, a seal-like image, or a QR payload proves nothing about authenticity. Extraction results feed validation and review only. Authenticity claims are possible solely through the verification-provider mechanism (Section 14), and only when a real source actually responded.

---

## 10. AI and Machine Learning

### 10.1 Task allocation

| Task | Approach | Priority |
|---|---|---|
| File-type/size/safety validation | Deterministic code (magic bytes, limits, open-test) | P0 |
| Exact duplicate detection | SHA-256 hash comparison | P0 |
| Near-duplicate detection | Normalized-text similarity (RapidFuzz or shingle Jaccard) | P1 |
| Text from digital PDFs | PyMuPDF (conventional library) | P0 |
| Text from scans/images | Tesseract OCR | P0 |
| Document classification | Keyword/regex scoring (deterministic, explainable) | P0 |
| Field extraction | Regex + layout/label parsing | P0 |
| Optional extraction/classification assist | Local LLM via Ollama | P2 |
| Missing required document/field | Deterministic rules | P0 |
| Expiry-date comparison | Deterministic rules | P0 |
| Identifier matching | Deterministic rules | P0 |
| Cross-document name/field comparison | Deterministic normalization + fuzzy similarity with thresholds | P0/P1 |
| Anomaly indicators | Explainable heuristics (below) | P1 |
| Advanced image-forensic models | Deferred | P2/out of scope |
| Issuer confirmation | External official source only (or labelled simulation) | P0 (framework) |

### 10.2 Anomaly detection (P1) — explainable indicators only

Examples of indicators the prototype can compute without custom ML:

- PDF metadata oddities: modification timestamp later than creation timestamp, producer/creator tool inconsistent with the claimed origin, or an image-editing tool signature. (These are weak signals; many legitimate documents trigger them.)
- Very low OCR confidence in an otherwise high-quality scan region.
- Date logic oddities (issue date after expiry date, future issue date).
- Same file hash or near-identical content reused across unrelated applications or institutions.
- Identifier/name format inconsistencies versus other documents.
- Mixed page resolutions or unusual embedded-image structure (optional).

Every indicator has an ID, a human-readable explanation, a severity of `info`/`low`/`medium`, and evidence references. The wording in the UI and reports is **"indicator requiring review"**. An anomaly is a reason for investigation, **never proof of fraud**, and the system never produces a "fraudulent" verdict.

### 10.3 Optional LLM integration (P2)

If time remains:

- **Runtime:** Ollama running locally with a small open-weight instruction model. Accessed with `httpx` over the local HTTP API. No vendor SDK, no API key, no data leaving the machine.
- **Switch:** `LLM_ENABLED=false` by default. With the switch off, the application behaves identically except that the optional assist step is skipped.
- **Interface:** a `LlmAssistant` interface with a "disabled" implementation (default) and an "Ollama" implementation.
- **Use cases:** suggesting a document type when the rule classifier is uncertain; proposing candidate field values from messy OCR text.
- **Output control:** the model must return JSON that is parsed and validated against a Pydantic schema. Invalid output is discarded and logged.
- **Verification of model claims:** every value an LLM proposes must be located in the OCR/PDF text (string or fuzzy match with a recorded position). Values that cannot be found in the source text are rejected, so unsupported claims never become "extracted facts".
- **Labelling:** LLM-derived fields are stored with `method = llm_assisted` and a visible "AI-suggested" marker; the reviewer must confirm them.
- **Authority:** the model never produces a finding status, a compliance verdict, or a recommendation to reject.
- **Privacy:** hosted third-party LLM APIs are **not** used with institutional documents. If a hosted API is ever added for demonstration, it must be opt-in, off by default, use synthetic documents only, and be documented as such.

### 10.4 What we are explicitly not doing

No custom deep-learning training, no GPU dependencies, no vector database, no separate AI microservice, no tamper-detection neural networks.

---

## 11. File Storage

### 11.1 Decision: local filesystem behind a storage interface

| Option | Verdict |
|---|---|
| **Local filesystem** | **Selected** — no setup, easy debugging, fits a single-machine prototype |
| S3-compatible object storage (MinIO etc.) | Deferred — extra service with no prototype benefit |
| Database BLOBs | Rejected — bloats SQLite, complicates backups |

### 11.2 Design

- A `StorageBackend` interface (save, open/read stream, delete, exists, and optionally a size lookup), keyed by an opaque **storage key**. The processing code only ever uses the interface and the key, never a filesystem path, so an S3/MinIO backend can be added later by writing one new class and changing one setting.
- Files are stored under a configurable `STORAGE_ROOT` **outside** the frontend directory and outside any statically served path (the application serves no uploaded content as static files).
- Stored filename = server-generated UUID (+ no user-controlled path components). The original filename is stored only as metadata (sanitized, length-limited) and is never used to build a path.
- Directory layout derived from application ID/document ID, never from user input.
- Filesystem permissions: storage directory owned by the application user, not world-readable (documented for Linux/macOS; on Windows rely on user-profile permissions).
- Downloads go through an authenticated API endpoint that performs an authorization check (role and institution ownership), streams the file with `Content-Disposition` and a safe content type, and writes an audit event.
- No public or guessable URLs.
- Deletion is soft by default (marked, file retained) for audit consistency; hard deletion is an administrator action.

### 11.3 Upload safety checks (all server-side, before any processing)

1. Maximum file size (configurable, e.g. 10–20 MB), enforced while streaming, not after reading everything into memory.
2. Allowed extensions from an allowlist (PDF, PNG, JPG/JPEG, optionally TIFF) — **necessary but never sufficient**.
3. **Magic-byte content detection** (`filetype`) must agree with the claimed type.
4. **Open test:** PDFs must open in PyMuPDF; images must pass Pillow's verification. Failure → rejected as malformed.
5. Reject encrypted/password-protected PDFs with a clear message (or flag them for manual handling).
6. Limit page count and image pixel dimensions (decompression-bomb protection; use Pillow's maximum image pixel setting).
7. Filename sanitization and path-traversal prevention (storage key is generated, never derived from the supplied name).
8. SHA-256 computed during streaming; duplicate check against existing hashes.
9. PDFs are never executed or rendered by a browser from untrusted storage without the authenticated endpoint; the frontend displays page **images** rendered by the backend or a controlled viewer.

Optional (P2): malware scanning (for example ClamAV) is out of scope for the prototype and is documented as a production requirement.

---

## 12. Authentication and Authorization

### 12.1 Decision

- **Login:** `POST /api/v1/auth/login` with username and password.
- **Password storage:** **Argon2id** via `argon2-cffi`. No plaintext, no reversible encryption.
- **Session mechanism:** a short-lived signed **JWT** (PyJWT, HS256, secret from environment) carried in an **HttpOnly, SameSite=Lax cookie** (`Secure` enabled outside local HTTP development). Expiry of a few hours. No refresh tokens (acceptable simplification).
- **Frontend/backend origin:** during development the Vite dev server proxies `/api` to FastAPI, so cookies are same-origin and CORS stays minimal. In the single-process demo deployment, FastAPI serves the built frontend on the same origin.
- **CSRF mitigation:** SameSite cookies plus a required custom request header on state-changing requests (set by the frontend API wrapper) and a strict CORS allowlist.
- **Rate limiting:** a simple login-attempt throttle (in-memory counter with lockout window) is sufficient for the prototype (P1).

### 12.2 Authorization

- Roles: `institution_user`, `reviewer`, `admin`.
- **Backend enforcement via FastAPI dependencies** (for example "current user" and "require role(s)"), applied to every router. The default for any new endpoint is "authentication required".
- **Object-level checks:** institution users may access only applications/documents belonging to their own institution; reviewers may access all applications assigned/visible to them; only reviewers/admins may record review decisions; only admins manage users and rule configurations.
- Frontend role-aware navigation mirrors permissions for usability but is **never** the enforcement layer. Tests assert that forbidden calls return 403/404 directly against the API.
- Every login, failed login, download, review action, and role-sensitive operation writes an audit event.

### 12.3 Test-user provisioning

A seed script creates demo users (one per role) with **passwords supplied by environment variables or generated and printed once at seed time** — never committed to the repository. Demo credentials, if shown on the login screen for judges, must be clearly demo-only accounts on synthetic data.

### 12.4 Limitations (must be stated honestly)

No multi-factor authentication, no single sign-on (a real deployment would integrate government identity/SSO), no refresh-token rotation, no password-reset flow (admin resets), in-memory rate limiting only. The prototype must not be described as production-secure.

---

## 13. Validation and Compliance Rules

### 13.1 Approach: registry-based rules engine with YAML definitions

**Decision:** a small custom engine, not a general-purpose rules framework.

- **Rule definitions** live in YAML files (`backend/app/rules/definitions/`), validated at load time with Pydantic, and synchronized into the `rules` database table (so findings reference stable rule IDs and the UI can list rules).
- **Rule types** are implemented as small, individually tested Python evaluator functions registered by name (for example: `required_document`, `field_present`, `date_not_expired`, `date_order`, `fields_match_across_documents`, `value_in_range`, `identifier_format`, `duplicate_document`, `verification_status_acceptable`).
- A rule definition specifies: stable ID (e.g. `VAL-EXP-001`), name, description, rule type, parameters, the application categories it applies to, severity, `is_illustrative` flag, and optional source/regulation reference field.
- An **executor** loads applicable rules for an application's category, gathers required fields, runs evaluators, and writes findings.
- Rules are **configurable without code changes** (edit YAML, reload/seed). An admin UI for editing rules is P2.

### 13.2 Finding structure

Every finding stores: rule ID, rule name, **result status**, severity/priority, human-readable explanation, **evidence references** (document ID, page, bounding box/text span, extracted-field IDs), the relevant field values used in the comparison, timestamp, and engine/rule version.

**Result statuses (fixed set):**

| Status | Meaning |
|---|---|
| `passed` | Rule evaluated and satisfied |
| `failed` | Rule evaluated and not satisfied |
| `needs_review` | Evaluated but ambiguous or low-confidence; human judgement required |
| `not_applicable` | Rule does not apply to this application/document |
| `unable_to_evaluate` | Required input missing or unreadable (for example OCR failure); no regulatory conclusion drawn |

### 13.3 Compliance assessment

The compliance module aggregates rule findings into a **checklist per application category**, showing which items were checked, which could not be checked, and which need human action. The aggregate label never says "compliant" unconditionally; it says what was *checked* (for example "no gaps identified on checked items"). Items not evaluated reduce the aggregate to "incomplete assessment".

### 13.4 Regulatory honesty

The prototype **must not invent AICTE regulatory requirements**. All shipped rules are marked `is_illustrative: true` and displayed in the UI/report as "Illustrative prototype rule — not an official AICTE requirement" until verified against the applicable official documents by authorized personnel.

---

## 14. Verification Integrations

### 14.1 Provider abstraction

A `VerificationProvider` interface (Python `Protocol`/abstract base class) with a single main operation: given a document reference plus extracted identifiers (and optionally QR payload or signature data), return a `VerificationResult`.

`VerificationResult` carries:

- `mode`: `real`, `simulated`, or `manual`
- `status`: `pending`, `verified`, `mismatch_reported`, `source_unavailable`, `manual_review_required`, `not_supported`
- provider name, timestamp, the identifiers used, a source reference (when a real source exists), and a message
- an explicit boolean-style flag derived from `mode`: only `mode = real` with `status = verified` may ever be displayed as "verified by issuing authority".

### 14.2 Providers in the prototype

| Provider | Priority | Behaviour |
|---|---|---|
| **SimulatedProvider** | P0 | Reads a local JSON fixture of synthetic issuer records and returns results with `mode = simulated`. UI shows a prominent **SIMULATED** badge; reports say "Simulated verification — not issuer confirmation". Can simulate `source_unavailable` and `mismatch` for demos. |
| **ManualProvider** | P0 | Creates a `manual_review_required` verification task; a reviewer records the outcome and evidence note manually. Stored as `mode = manual`. |
| **RealProvider (stub only)** | P2 | An interface-conforming placeholder that returns `not_supported` / `source_unavailable`. **No endpoints, credentials, or APIs are invented.** Documentation describes where an official API, portal check, digital-signature validation, or QR-to-trusted-source lookup would plug in. |

Provider choice is configuration-driven. Selecting a provider is a settings change, not a code change in the pipeline.

### 14.3 QR codes and signatures

Decoding a QR code is **not** verification. If QR decoding is implemented at all (P2; use PyMuPDF image extraction plus an OpenCV or dedicated QR decoder only if time remains), the decoded payload is stored as an *extracted field*, with the note "QR content decoded; not verified". It becomes verification evidence only when a trusted provider validates it. Digital signature validation is deferred (P2) and would live in a real provider.

---

## 15. Reporting and Analytics

### 15.1 Analytics

- Statistics endpoints compute metrics with SQLAlchemy aggregate queries from live data: total applications, documents processed, applications needing review, missing-document counts, expired-document counts, unresolved findings by severity, verification status counts (split by `simulated`/`real`/`manual`), average and median processing duration, and processing statistics over time (grouped by day).
- A central backend module defines status enums and metric definitions so the dashboard, CSV exports, and PDF reports use identical meanings.
- Charts are rendered with **Recharts** from these endpoint results.

### 15.2 Exports and reports

- **CSV export** (P1) using Python's `csv` module for: application list, findings, and processing statistics. Cells beginning with formula characters (`=`, `+`, `-`, `@`) must be neutralized to prevent CSV injection when opened in spreadsheet software.
- **PDF review report** (P1) using **ReportLab**: application summary, document list with statuses, findings table with evidence references, verification statuses (with mode labels), reviewer actions, a mandatory disclaimer ("Decision-support output; final decisions rest with authorized officials"), simulation/synthetic-data banners where applicable, generation timestamp, and report ID. The report contains tables and text; charts are not required inside the PDF.
- *Why ReportLab:* installs with pip on all major platforms. WeasyPrint needs native libraries that are awkward on Windows; headless-browser PDF generation adds a heavy dependency.
- If time is short, the PDF report may be replaced by a print-friendly HTML view without affecting the core workflow.

---

## 16. Testing and Benchmarking

### 16.1 Tools

| Need | Tool |
|---|---|
| Backend unit and integration tests | pytest, pytest-cov |
| API tests, RBAC tests | FastAPI `TestClient` |
| Frontend component tests (P1) | Vitest + React Testing Library |
| End-to-end demo-path tests (P1) | Playwright |
| Load/latency tests (P1) | Locust |
| Accuracy evaluation | Custom evaluation script + labelled dataset |
| Synthetic data generation (P1) | Faker + ReportLab + Pillow (scan simulation) |
| Lint/type (P1) | Ruff; ESLint |

### 16.2 What must be tested (mapped to requirements)

| Area | Test type |
|---|---|
| File upload (valid, oversize, wrong type, spoofed extension, malformed) | API tests with fixture files |
| PDF parsing (digital vs scanned detection) | Unit tests with small fixture PDFs |
| OCR | Integration test on a small fixture image; skipped with a clear message if Tesseract is unavailable |
| Field extraction | Unit tests per document type against ground-truth values |
| Expiry validation, missing-field detection | Unit tests including boundary dates |
| Cross-document consistency | Unit tests with matching/mismatching/ambiguous cases |
| Duplicate detection | Unit tests (same hash, different name; near-duplicate) |
| Verification-status handling | Unit tests for every status and mode; test that `simulated` can never render as real |
| Compliance rules | Unit tests per rule, including `unable_to_evaluate` paths |
| API endpoints | TestClient tests, schema checks |
| Database persistence | Create → restart session → read back; relationships intact |
| Role-based authorization | Tests that each role gets 200/403/404 as appropriate, directly against the API |
| Dashboard calculations | Seed known data → assert exact counts |
| Error handling | Corrupt file, missing OCR engine (mocked), database error paths |

### 16.3 Performance and accuracy measurement

All measurements must be **reproducible** and reported with their environment.

1. **Test dataset:** a documented, versioned synthetic dataset in `datasets/` (documents plus a `ground_truth` file listing the true document type, true field values, and which seeded defects each document contains). The dataset README records how it was generated (generator script, random seed), its size, and its limitations.
2. **Document-processing duration:** the pipeline records per-stage timings (extraction, OCR, classification, field extraction, validation) in the job record. A benchmark script runs the dataset N times and reports min/median/p95/mean per stage and per document type.
3. **API latency:** Locust runs a small scenario against the running backend (login, list applications, fetch findings, dashboard statistics) and reports median and p95 latency and requests per second. Upload throughput measured separately with a small number of concurrent users.
4. **Throughput:** documents processed per minute for the dataset with the configured worker count.
5. **Field-extraction accuracy:** per field and per document type, comparison of extracted normalized values to ground truth (exact match after normalization), reported as precision/recall/F1 or accuracy with counts, separately for digital-text and OCR'd documents.
6. **Validation accuracy:** confusion matrix of expected versus actual rule outcomes (using the seeded defects as truth).
7. **False-positive rate:** among documents/findings with no seeded defect, the fraction of findings raised; reported per rule.
8. **Environment record:** OS, CPU, RAM, Python/Node versions, Tesseract version, dataset version, git commit, and date saved alongside every result file.

**Reporting rule:** no accuracy percentage, latency figure, or "time saved" claim appears in any slide, README, or UI until it has been produced by these scripts. Results on synthetic data must be labelled as such; they are not evidence of real-world performance.

### 16.4 Test pyramid for a 3–4 day project

Backend unit and API tests are the priority (P0). One Playwright test covering login → create application → upload → see findings → review → download report is a valuable P1. Frontend component tests are optional.

---

## 17. Security Dependencies and Practices

| Concern | How the stack addresses it |
|---|---|
| Untrusted uploads | Allowlist + magic-byte check (`filetype`) + open-test (PyMuPDF/Pillow) + size/page/pixel limits; extension alone never trusted |
| Path traversal | Generated UUID storage keys; no user-supplied path components; storage root configured and resolved server-side |
| Public exposure of files | Files never under static/frontend directories; access only via authenticated, authorized endpoint with audit logging |
| Malformed/malicious files | Parsing wrapped in error handling; failures marked, not crashing; processing in worker threads with time/size limits |
| Password security | Argon2id hashes; no plaintext; no default passwords in repo |
| Session security | HttpOnly SameSite cookie, short expiry, `Secure` outside local HTTP, CSRF header check |
| Authorization | Backend dependencies + object-level checks; tests at API level |
| Injection | SQLAlchemy parameterized queries; Pydantic validation; CSV formula neutralization; frontend output escaping (React default) |
| Secrets | `.env` (git-ignored) + pydantic-settings; `.env.example` with placeholders only; startup refuses to run with a placeholder JWT secret outside development mode |
| Logging hygiene | No document contents, passwords, or tokens in logs; request IDs for traceability |
| Audit trail | Append-only audit events table: who, what, when, target, outcome; written for logins, uploads, downloads, processing, rule changes, review actions, verification requests |
| Privacy of documents | No external AI/OCR services; LLM (optional) is local; synthetic data used for demos |
| Dependency hygiene | Lock files; limited dependency set; periodic `pip-audit` / `npm audit` (P1) |
| HTTP hardening | CORS allowlist; security headers (basic) in the production-style demo deployment; upload endpoint size enforcement |

Out of scope for the prototype (documented as production needs): antivirus scanning, encryption at rest, SSO/MFA, key management, formal penetration testing, data retention policies.

---

## 18. Local Development Environment

### 18.1 Required software

| Software | Version strategy |
|---|---|
| Python | 3.12 recommended; 3.11 acceptable. Avoid very new releases until wheels are confirmed |
| Node.js | Current LTS release (npm included) |
| `uv` | Latest stable (installs Python dependencies); `pip` + `venv` is an acceptable fallback |
| Tesseract OCR | Version 5.x, with `eng` language data |
| Git | Any recent version |
| Docker | **Optional** (P2) — only for packaged demo |
| Ollama | **Optional** (P2) — only for the LLM assist |

No GPU, no database server, no message broker, no cloud account.

Version pinning policy: do **not** pin exact versions in this document. Use lock files (`uv.lock`, `package-lock.json`) to freeze whatever resolves at first install, and commit them. Pin a specific version only to fix a demonstrated incompatibility, and record the reason in a comment next to the pin.

### 18.2 Platform notes

- Windows is the likeliest developer environment: install Tesseract with its installer and set `TESSERACT_CMD` if it isn't on `PATH`; use forward-slash-agnostic path handling (`pathlib`); avoid shell scripts that require bash (provide cross-platform commands in the README).
- If a Windows-specific problem blocks progress, WSL2 or Docker is a valid escape hatch, but not the primary path.

---

## 19. Dependency Installation Strategy

### 19.1 Backend

- A single `backend/pyproject.toml` managed with `uv`, producing `uv.lock`.
- Dependencies grouped:
  - **core (P0):** web framework and server, validation/settings, ORM, migrations, PDF/OCR/image libraries, hashing/type detection, YAML, password hashing, JWT, date parsing, multipart upload support.
  - **P1 group:** fuzzy matching, PDF reporting.
  - **dev group:** testing, coverage, linting, load testing, synthetic-data generation.
  - **optional group (P2):** HTTP client for optional LLM integration (if not already present).
- Install the core and dev groups by default. Optional/P1 groups are added when the corresponding feature starts, so the base install stays small.
- No dependency may require compiling C/C++ code on the developer's machine. If an agent proposes one, it must be rejected or justified in this document.

### 19.2 Frontend

- npm with `package-lock.json`.
- Runtime dependencies kept small: React, React Router, TanStack Query, React Hook Form, Zod (+ resolver), Recharts, lucide-react, Tailwind CSS and the small helper utilities shadcn/ui requires (class-name merge helpers, Radix primitives pulled in per component).
- Dev dependencies: TypeScript, Vite, ESLint, Prettier, Vitest, React Testing Library, Playwright (P1).
- Add shadcn/ui components one at a time, only when used.

### 19.3 Dependencies with unusual installation difficulty

| Dependency | Issue | Mitigation |
|---|---|---|
| Tesseract binary | System-level install, `PATH` configuration | Health check; documented fallback (RapidOCR); included in Docker image |
| PyMuPDF | AGPL licence | Documented; fallback pypdf + pypdfium2 |
| Playwright | Downloads browser binaries | P1 only; skip if bandwidth/time limited |
| Ollama | Separate install and model download (GBs) | P2 only |

### 19.4 Deferrable optional dependencies

OpenCV (QR/deskew), Ollama and its model, Locust (can be replaced by a simple script), Playwright, ReportLab (fallback: HTML print view), RapidFuzz (fallback: standard-library difflib), Docker.

---

## 20. Environment Variables and Secrets

Configuration is loaded by pydantic-settings from environment variables, with a git-ignored `.env` for local use and a committed `.env.example` containing **placeholder names and safe defaults only**. No real credentials or secrets are ever committed. This document defines **categories**; names are finalized during implementation.

| Category | Examples of what is configured |
|---|---|
| App mode | Environment name (development/demo/production-like), debug flag, API base path, allowed CORS origins |
| Security | JWT signing secret, token lifetime, cookie secure flag, login-throttle settings, seed-user passwords (supplied locally, never committed) |
| Database | Database URL (SQLite path in development), SQLite busy timeout |
| Storage | Storage backend selector, storage root path, maximum file size, allowed file types, maximum pages, maximum image pixels |
| Processing | Worker count, PDF-text minimum-character threshold, OCR render DPI, OCR language(s), Tesseract command path, per-job timeout, OCR confidence thresholds |
| Rules | Rule definitions directory, classification and extraction configuration paths |
| Verification | Active provider selector (simulated/manual/real-stub), simulated fixture path |
| Optional LLM | Enabled flag (default off), local endpoint URL, model name, request timeout |
| Reporting | Report output settings, organization/disclaimer text |
| Logging | Log level, log format |
| Frontend | API base URL (or dev proxy target); no secrets in frontend variables (everything prefixed for the frontend is public) |

Rules for secrets:

- Startup must **fail fast** if the JWT secret is missing or is the placeholder value outside development mode.
- Frontend environment variables are treated as public.
- Seed-user passwords come from the environment or are generated once and printed.
- `.env`, storage directory, database file, and generated reports are all in `.gitignore`.

---

## 21. Recommended Repository Organization

Consistent with a modular monolith and a separate SPA; folder names should be reconciled with `ARCHITECTURE.md`.

```
verityai/
├── README.md
├── .gitignore
├── .env.example
├── docs/
│   ├── ARCHITECTURE.md
│   └── TECH_STACK.md
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── alembic.ini
│   ├── alembic/                      # migration scripts
│   ├── app/
│   │   ├── main.py                   # app creation, router registration
│   │   ├── core/                     # settings, security, logging, errors, enums
│   │   ├── api/
│   │   │   └── v1/                   # routers: auth, institutions, applications,
│   │   │                             #   documents, findings, review, verification,
│   │   │                             #   compliance, stats, reports, audit, admin
│   │   ├── schemas/                  # Pydantic request/response models
│   │   ├── db/                       # engine/session, models, repositories
│   │   ├── services/                 # application-level orchestration
│   │   ├── processing/               # pipeline stages
│   │   │   ├── file_validation/
│   │   │   ├── extraction/           # PDF text, OCR adapter, preprocessing
│   │   │   ├── classification/
│   │   │   ├── fields/               # extraction + normalization
│   │   │   ├── anomaly/
│   │   │   └── jobs/                 # in-process worker, job tracking
│   │   ├── rules/
│   │   │   ├── engine/               # registry, executor, evaluators
│   │   │   └── definitions/          # YAML rule files (illustrative)
│   │   ├── compliance/
│   │   ├── verification/             # provider interface + providers
│   │   ├── storage/                  # StorageBackend + local implementation
│   │   ├── llm/                      # optional assistant interface (P2)
│   │   ├── reports/                  # CSV + PDF generation
│   │   └── audit/
│   ├── config/                       # classification/extraction YAML
│   ├── scripts/                      # seed data, create users, benchmarks
│   └── tests/
│       ├── unit/
│       ├── api/
│       ├── integration/
│       └── fixtures/                 # tiny sample PDFs/images
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── routes/ (or pages/)
│   │   ├── components/
│   │   │   └── ui/                   # shadcn/ui components
│   │   ├── features/                 # applications, documents, findings, review, analytics...
│   │   ├── api/                      # typed client, query hooks
│   │   ├── lib/                      # status vocabulary, utilities
│   │   └── test/
│   └── e2e/                          # Playwright tests (P1)
├── datasets/
│   ├── README.md                     # how generated, seed, limitations
│   ├── generator/                    # synthetic data generator scripts
│   ├── synthetic/                    # generated documents (labelled)
│   ├── ground_truth/
│   └── simulated_verification/       # fixture for SimulatedProvider
├── benchmarks/
│   ├── locustfile (load scenario)
│   ├── run scripts
│   └── results/                      # dated results + environment record
├── var/                              # git-ignored runtime data
│   ├── verityai.db
│   └── storage/                      # uploaded files (never served statically)
└── docker/                           # optional (P2)
```

---

## 22. Local Startup and Testing Workflow

Commands are **provisional** until implementation; the agent must keep the README in sync.

**One-time setup**

1. Install Python, Node.js LTS, `uv`, Git, and Tesseract; confirm the Tesseract command runs.
2. Copy `.env.example` to `.env`; set a development JWT secret and seed-user passwords.
3. Backend: install dependencies with `uv`; run the Alembic upgrade to create the SQLite database; run the seed script (users, synthetic institutions, rules sync).
4. Frontend: `npm install`.

**Daily run (two terminals)**

- Terminal 1: start the FastAPI app with `uvicorn` in reload mode (backend on a local port). Open `/docs` to see the API.
- Terminal 2: start the Vite dev server; it proxies `/api` to the backend.
- Open the frontend URL and log in as a demo user.

**Testing**

- Backend: run `pytest` (with coverage when wanted). OCR tests skip clearly if Tesseract is missing.
- Frontend: run the Vitest suite (P1).
- End to end: start both servers, then run Playwright (P1).
- Benchmarks: run the benchmark script and Locust scenario against a running backend with the documented dataset; results are saved with an environment record.
- Lint (P1): Ruff, ESLint.

**Demo mode (single-process, P1/P2):** build the frontend once; configure FastAPI to serve the static build, so the whole demo runs from one command on one port. Optional Docker image wraps the same thing.

**Suggested schedule for a 3–4 day build** (a guide, not a commitment):

- Day 1: repository, database models/migrations, auth/RBAC, application and document APIs, upload validation and storage, basic frontend shell with login and application list.
- Day 2: processing pipeline (PDF text, OCR, classification, extraction, normalization), job tracking, document detail UI with extracted fields.
- Day 3: rules engine and findings, cross-document checks, compliance checklist, verification providers, review workflow, audit trail, dashboard.
- Day 4: report/CSV, synthetic dataset and benchmark runs, polish, tests, demo rehearsal, README.

---

## 23. Implementation Priorities

### P0 — Essential (the demonstrable core)

- React + Vite + TypeScript + Tailwind + shadcn/ui + lucide-react + React Router + TanStack Query + React Hook Form + Zod
- FastAPI, Pydantic v2, pydantic-settings, SQLAlchemy 2.x, Alembic, SQLite with correct pragmas
- Auth with Argon2id + JWT cookie, backend RBAC with object-level checks, seed users
- Local filesystem storage behind `StorageBackend`; full upload safety checks; authenticated downloads
- PyMuPDF text and rendering; Tesseract OCR via `pytesseract`; Pillow; SHA-256 hashing
- In-process job worker with persisted job state and polling
- Rule-based classification; regex/label field extraction and normalization
- YAML-driven rules engine; findings with five statuses and evidence links; compliance checklist
- Verification provider interface with Simulated and Manual providers and honest labelling
- Reviewer actions and audit events
- Statistics from live data; basic dashboard
- pytest + TestClient suite covering upload, extraction, rules, RBAC, persistence, dashboard
- Standard-library logging; `.env` config; `uv` + npm

### P1 — Important

- Recharts analytics charts and time-series statistics
- RapidFuzz-based cross-document and near-duplicate comparison
- Explainable anomaly indicators
- CSV export; ReportLab PDF report
- Synthetic dataset generator, ground truth, accuracy/latency benchmarks (script + Locust)
- Playwright demo-path test; Vitest component tests
- Ruff/ESLint/Prettier; login throttling; `pip-audit`/`npm audit`
- Single-process demo mode (FastAPI serves frontend build)
- OpenAPI-generated TypeScript types

### P2 — Optional or deferred

- Ollama-based optional LLM assist with validated JSON output and source-text verification
- QR extraction (stored as unverified field)
- Admin UI for editing rules
- Hindi OCR language data; OpenCV preprocessing
- Docker/Docker Compose packaging
- PostgreSQL migration, object storage backend
- Real verification provider implementation (requires authorized access)
- Digital-signature validation
- Antivirus scanning, SSO/MFA, encryption at rest
- Advanced forensic/tamper-detection models

---

## 24. Alternatives Considered

| Decision | Selected | Main alternatives | Why the selection wins |
|---|---|---|---|
| Frontend framework | React + Vite | Next.js; Vue; Streamlit | Next.js adds SSR/runtime complexity not needed behind login; Vue has less agent-training coverage for this component ecosystem; Streamlit is quick but looks less like a professional admin product and limits RBAC and UX control |
| Components | shadcn/ui + Tailwind | MUI; Ant Design; Chakra | MUI/Ant are heavy and harder to restyle; shadcn/ui is lightweight, polished, and code lives in-repo |
| Backend | FastAPI | Django; Flask | Django's admin/ORM is powerful but heavier and slower to shape into a REST+OpenAPI app; Flask lacks built-in validation and docs |
| ORM | SQLAlchemy 2.x | SQLModel; Django ORM; raw SQL | SQLModel is thinner but less stable for complex relations; SQLAlchemy has the best documentation and portability |
| Database | SQLite | PostgreSQL | PostgreSQL is better for production but costs setup time and an extra service; SQLite is adequate under the stated assumptions and portable through SQLAlchemy |
| Background jobs | In-process `ThreadPoolExecutor` + DB job table | Celery + Redis; RQ; FastAPI `BackgroundTasks` only | Brokers are unjustified for this dataset; plain `BackgroundTasks` offers less control and visibility |
| PDF library | PyMuPDF | pdfplumber + pypdf + pdf2image | One library covers text, rendering, metadata; no Poppler dependency |
| OCR | Tesseract | PaddleOCR; EasyOCR; RapidOCR; cloud OCR | Tesseract: small, CPU-only, mature, confidence data. PaddleOCR/EasyOCR: heavy installs/model downloads. RapidOCR: good pip-only fallback. Cloud OCR: violates privacy and free-only constraints |
| Image processing | Pillow | OpenCV | Pillow suffices; OpenCV is heavier and optional later |
| Auth | JWT in HttpOnly cookie + Argon2 | Session store; OAuth/Keycloak; passlib/bcrypt | Keycloak/OAuth is overkill; server-side session store adds state; passlib is poorly maintained relative to argon2-cffi |
| Rules engine | Custom registry + YAML | `durable_rules`, Drools-style engines, JSON-Logic | General frameworks add learning cost and obscure behaviour; custom is easier to test and explain |
| PDF reports | ReportLab | WeasyPrint; headless Chromium; fpdf2 | WeasyPrint/Chromium have heavy native dependencies; fpdf2 is a fair alternative, but ReportLab is better documented for tables |
| LLM | Optional Ollama | OpenAI/Gemini APIs; Hugging Face transformers in-process | Hosted APIs conflict with privacy and cost constraints; in-process models need heavy dependencies/GPU |
| Load testing | Locust | k6; Apache Bench | k6 requires a separate binary and JavaScript scenarios; Locust is pip-installable Python |
| Dependency mgmt | uv + npm | pip + requirements.txt; poetry; pnpm | uv is fast with a lock file; requirements.txt lacks locking; poetry/pnpm add tooling friction |
| Storage | Local filesystem | MinIO/S3; DB BLOB | Extra service/complexity vs. no benefit for a single-machine prototype |

---

## 25. Trade-Offs and Limitations

**Stack limitations**

- **SQLite** limits concurrent writers and is unsuitable for multi-user production loads. Migration to PostgreSQL is straightforward but untested until performed.
- **In-process workers** are lost if the process stops mid-job (mitigated by startup recovery and re-queue), and throughput is bounded by one machine.
- **Tesseract** accuracy declines on low-quality scans, stamps, handwriting, tables, and non-Latin scripts. Real AICTE documents will vary far more than synthetic ones.
- **Rule-based classification/extraction** is reliable on known layouts but brittle with unfamiliar formats; adding new document types requires configuration work.
- **Heuristic anomaly indicators** are weak signals with false positives; they cannot detect sophisticated forgery.
- **PyMuPDF's AGPL licence** needs review before non-open-source use.
- **Simple authentication** lacks MFA, SSO, and refresh-token handling.
- **No antivirus/malware scanning, no encryption at rest.**
- **ReportLab** reports are functional rather than richly designed.

**Prototype limitations (must be stated in the demo and README)**

- All institutional data and documents are **synthetic** and must be labelled as such; they are not genuine AICTE records.
- Verification is **simulated** unless an authorized real provider is added; no real issuing authority is contacted.
- All compliance rules are **illustrative**, not official AICTE requirements.
- The platform provides decision support; it makes no regulatory decision and issues no fraud verdict.
- Accuracy and speed figures, once measured, apply to the synthetic dataset and test machine only.
- No integration with AICTE systems, DigiLocker, or any government service is assumed or implemented.

---

## 26. Architecture Alignment and Open Decisions

**Genuine open items (to settle after checking `docs/ARCHITECTURE.md`):**

1. **`ARCHITECTURE.md` was unavailable** to the author of this document. All assumptions in Section 3.1 require verification. If any technology in `ARCHITECTURE.md` is already final and differs from this document, the architecture wins and the affected rows (Sections 5 and 19) must be updated.
2. **Status enum names and exact values** (Section 6.2) are planned here and must be reconciled with the status model in `ARCHITECTURE.md`.
3. **Repository folder names** (Section 21) should be reconciled with the module boundaries in `ARCHITECTURE.md`.
4. **Tesseract availability on the developer's machine** is unverified. Decision rule: if Tesseract is not working within the first hours of Day 1, switch the OCR adapter to RapidOCR (documented fallback, Section 9.2).
5. **PyMuPDF licence acceptability** for any use beyond the hackathon should be confirmed by the team (fallback documented in Section 9.1).
6. **Whether the demo is presented from a local machine or a hosted instance** is undecided. The default is local; hosting (Docker on a small VM) is P2 and must only ever contain synthetic data.

No serious conflict between the architecture requirements and the available implementation constraints has been identified.

---

## 27. Final Technology Decision Summary

**Frontend:** React · Vite · TypeScript (strict) · Tailwind CSS · shadcn/ui · lucide-react · React Router · TanStack Query + typed `fetch` wrapper · React Hook Form + Zod · Recharts · Vitest + React Testing Library (P1) · Playwright (P1)

**Backend:** Python 3.12 (3.11 acceptable) · FastAPI + uvicorn · Pydantic v2 + pydantic-settings · SQLAlchemy 2.x (sync) · Alembic (batch mode) · OpenAPI at `/docs` · standard `logging` with request IDs · in-process `ThreadPoolExecutor` job worker with persisted job state

**Database:** SQLite (WAL, foreign keys on, UTC timestamps); PostgreSQL is the documented future migration

**Document processing:** PyMuPDF (text, rendering, metadata) · Tesseract 5 via pytesseract (RapidOCR documented fallback) · Pillow · `hashlib` SHA-256 · `filetype` + open-test · python-dateutil + regex · RapidFuzz (P1)

**Intelligence:** rule-based classification · regex/label-proximity field extraction · YAML-driven custom rules engine · explainable heuristic anomaly indicators (P1) · optional local Ollama LLM assist behind an interface, off by default (P2)

**Storage:** local filesystem behind `StorageBackend` interface, UUID keys, outside any public path, authenticated downloads

**Security:** Argon2id (argon2-cffi) · PyJWT in HttpOnly SameSite cookie · backend RBAC with object-level checks · append-only audit events · `.env` secrets via pydantic-settings

**Verification:** `VerificationProvider` interface · SimulatedProvider (always labelled) · ManualProvider · stub-only RealProvider (P2)

**Reporting:** Recharts charts · Python `csv` export (with formula-injection protection) · ReportLab PDF report (P1)

**Testing and measurement:** pytest + pytest-cov · FastAPI TestClient · Vitest (P1) · Playwright (P1) · Locust + custom benchmark/accuracy scripts on a documented synthetic dataset · Ruff/ESLint (P1)

**Tooling:** `uv` (backend) · npm (frontend) · two-process local run (uvicorn + Vite) · optional Docker (P2)

**Guiding rules:** no paid API in the core workflow · no broker · no GPU · no microservices · extraction ≠ authentication · anomaly ≠ fraud · simulated ≠ real · AI output ≠ regulatory decision · measured results only