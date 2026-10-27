# Independent VerityAI Scrutiny Platform: Architecture & Migration Plan

**Project:** VerityAI (Core Document-Scrutiny Intelligence Engine)  
**Document Ref:** `docs/aicte-audit/INDEPENDENT_VERITYAI_ARCHITECTURE.md`  
**Execution Timestamp:** 2026-10-25T15:30:00+05:30  
**Status:** Approved for Implementation (Phases A–J)

---

## 1. Executive Summary & Core Principle

### The Core Architectural Principle
> **VerityAI is the product. The institutional applicant and reviewer portal is only one integration client.**

The existing institutional portal (built for SIH 2026) is a client application providing institutional profiles, intake wizards, and officer review dossiers. It must not become a permanent dependency of VerityAI's core intelligence engine. 

VerityAI independently owns:
1. Reusable document text extraction and OCR (multi-engine fallback).
2. Deterministic regulatory validation rule execution (AICTE APH 2024-27 norms).
3. Cross-document anomaly detection and statutory discrepancy indicators.
4. Evidence generation and provenance tracking (`document_id`, page, snippet, confidence).
5. Scrutiny dossier report synthesis (PDF and JSON artifacts).
6. Provider-independent AI abstraction interface (`BaseAIProvider`).
7. Persistent scrutiny job lifecycle orchestration (`QUEUED` -> `PROCESSING` -> `COMPLETED` / `FAILED`).
8. Secure external API gateway (`/api/v1/integrations/...`) with cryptographically hashed API keys, client tenant isolation, and idempotency protection.

---

## 2. Current Architecture vs. Target Architecture

### 2.1 Current Architecture (Tight Coupling)
In the earlier hackathon phases, the officer clicked "Trigger Scrutiny" inside `ApplicationDetailWorkspace.tsx`, which called `/api/v1/applications/{application_id}/scrutiny-jobs`. The scrutiny service queried the `applications` and `documents` tables directly using internal relational foreign keys. A third-party client could not submit an ad-hoc dossier without creating an AICTE institutional user, an institution record, and an application row in the database.

```text
[Current Portal Only]
        │ (Session Cookie)
        ▼
[/api/v1/applications/{app_id}/scrutiny-jobs]
        │
        ▼ (Hardcoded foreign key to applications.id)
[Internal Database Models: applications, institutions]
        │
        ▼
[Validation & Anomaly Pipeline]
```

### 2.2 Target Architecture (Decoupled Platform & Multi-Client Gateway)

```text
                         EXTERNAL CLIENTS
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
Current Portal Backend     Second Demo Client     Future University/Gov Portal
(Server-Side API Client)  (Independent CLI/App)   (State Directorate Portal)
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                       Authenticated API Gateway
                       [/api/v1/integrations/...]
                                │
        ┌───────────────────────┴───────────────────────┐
        │ - API Key Authentication (X-API-Key Header)   │
        │ - Cryptographic Secret Verification (SHA-256) │
        │ - Scope Enforcement (scrutiny:create, etc.)   │
        │ - Rate Limiting & Payload Size Protection     │
        │ - Client Tenant Isolation & Idempotency Cache │
        └───────────────────────┬───────────────────────┘
                                ▼
                   VerityAI Scrutiny Service
        ┌───────────────────────────────────────────────┐
        │ - Async Job Lifecycle Orchestration           │
        │ - Normalized Scrutiny Context & Documents     │
        │ - Multi-Engine OCR (PyMuPDF / pdfplumber)     │
        │ - Deterministic Regulatory Validation Rules   │
        │ - Cross-Document Anomaly Detection Heuristics │
        │ - Evidence Provenance Linker                  │
        │ - Statutory PDF/JSON Report Synthesizer       │
        │ - Provider-Independent AI Interface Adapter   │
        └───────────────────────┬───────────────────────┘
                                ▼
                    Persistence & Audit Layer
        ┌───────────────────────────────────────────────┐
        │ - integration_clients (client_id, secret_hash)│
        │ - integration_scrutiny_jobs (status, findings)│
        │ - audit_events (immutable security trail)     │
        │ - Secure Document Storage (UUID storage names)│
        └───────────────────────────────────────────────┘
```

---

## 3. Core Service Boundaries

| Service Boundary | Responsibility | Inbound/Outbound Dependencies |
|---|---|---|
| **VerityAI Gateway (`/api/v1/integrations`)** | Authenticate callers via API Key, enforce scopes, validate schemas, ensure idempotency, rate limit, and route to job orchestrator. | Inbound: External HTTP clients.<br>Outbound: Integration Client Store, Job Orchestrator. |
| **API Client & Credential Manager** | Generate cryptographically secure keys (`vai_client_...`, `vai_sec_...`), store SHA-256 hashes, rotate/revoke keys, track last-used timestamps. | Inbound: VerityAI Admin UI / CLI.<br>Outbound: `integration_clients` table. |
| **Scrutiny Job Orchestrator** | Manage lifecycle (`QUEUED` -> `PROCESSING` -> `COMPLETED`/`FAILED`), background execution worker, deduplication locks, crash reconciliation. | Inbound: Gateway.<br>Outbound: Intelligence Service, `integration_scrutiny_jobs`. |
| **Intelligence Engine** | Pure functional / domain services: document extraction, OCR fallback, deterministic validation rules, anomaly heuristics, evidence linkage. | Inbound: Job Orchestrator.<br>Outbound: None (pure computational engine). |
| **AI Provider Adapter (`BaseAIProvider`)** | Provider abstraction. Dispatches to Local Deterministic Engine, local Ollama LLM, or cloud provider with graceful offline degradation. | Inbound: Intelligence Engine.<br>Outbound: Local rules or external LLM endpoint. |
| **Institutional Portal (Client 1)** | Institutional identity, applicant wizard, document uploading, officer review dossier. Calls VerityAI Gateway via server-side client. | Inbound: Institutional Users / Reviewers.<br>Outbound: VerityAI Gateway (`/api/v1/integrations`). |
| **Standalone Second Client (Client 2)** | Independent verification client demonstrating pure API consumption without portal components or portal database records. | Inbound: Terminal / External trigger.<br>Outbound: VerityAI Gateway. |

---

## 4. API Request and Response Flow

### 4.1 Step 1: Health Probe
- **Endpoint:** `GET /api/v1/integrations/health`
- **Auth:** Public or optional client auth
- **Response:** Engine status, OCR availability, active AI provider mode, database connectivity.

### 4.2 Step 2: Create Scrutiny Request
- **Endpoint:** `POST /api/v1/integrations/scrutiny-jobs`
- **Auth:** `X-API-Key: vai_client_...:vai_sec_...`
- **Required Scope:** `scrutiny:create`
- **Payload:** Multipart form or JSON payload with:
  - `external_reference`: Client's internal reference string (e.g. `EXT-APP-2026-9901`).
  - `idempotency_key`: Optional client token to prevent duplicate runs on network retries.
  - `category_code`: Statutory scrutiny category (e.g. `ENGINEERING_AND_TECHNOLOGY`, `EOA_ILLUSTRATIVE`).
  - `declared_data`: JSON key-value metrics (land area, built-up area, intake, etc.).
  - `files`: One or more binary document files (`application/pdf`, `image/png`, `image/jpeg`).
  - `document_types`: Optional mapping of filenames to canonical statutory document types.
- **Immediate Response (`202 Accepted`):**
  ```json
  {
    "data": {
      "job_id": "VAI-JOB-8A9C12E4",
      "client_id": "vai_client_portal_01",
      "external_reference": "EXT-APP-2026-9901",
      "status": "QUEUED",
      "created_at": "2026-10-25T15:35:00Z",
      "polling_url": "/api/v1/integrations/scrutiny-jobs/VAI-JOB-8A9C12E4"
    }
  }
  ```

### 4.3 Step 3: Polling Job Status
- **Endpoint:** `GET /api/v1/integrations/scrutiny-jobs/{job_id}`
- **Auth:** `X-API-Key: vai_client_...:vai_sec_...`
- **Required Scope:** `scrutiny:read`
- **Tenant Check:** Client can only view jobs created under its own `client_id` (403 Forbidden on cross-client access).
- **Response (`200 OK`):**
  Returns status (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`), duration in milliseconds, stage breakdown, and completion timestamp.

### 4.4 Step 4: Retrieve Results and Evidence
- **Endpoint:** `GET /api/v1/integrations/scrutiny-jobs/{job_id}/results`
- **Auth:** `X-API-Key`
- **Required Scope:** `scrutiny:read`
- **Response (`200 OK`):**
  ```json
  {
    "data": {
      "job_id": "VAI-JOB-8A9C12E4",
      "external_reference": "EXT-APP-2026-9901",
      "status": "COMPLETED",
      "summary": {
        "total_documents": 2,
        "passed_rules": 14,
        "failed_rules": 0,
        "total_findings": 1,
        "severities": { "ANOMALY_INDICATOR": 1 }
      },
      "findings": [
        {
          "finding_id": "FIND-001",
          "category": "STATUTORY_VALIDATION",
          "severity": "ANOMALY_INDICATOR",
          "title": "Minor Variance in Land Coordinate Survey",
          "description": "Contiguous plot boundary certificate indicates 10.45 acres vs 10.5 acres declared.",
          "rule_code": "RULE-APH-LAND-CONTINUITY",
          "document_id": "doc_01",
          "page_number": 2,
          "evidence_text": "...total contiguous surveyed land: 10.45 acres...",
          "confidence": 0.98
        }
      ],
      "provider_metadata": {
        "provider_id": "local_deterministic_v1",
        "provider_status": "ACTIVE",
        "human_decision_required": true
      }
    }
  }
  ```

### 4.5 Step 5: Download Official Summary Report
- **Endpoint:** `GET /api/v1/integrations/scrutiny-jobs/{job_id}/report`
- **Auth:** `X-API-Key`
- **Required Scope:** `scrutiny:read`
- **Response (`200 OK`):** Binary PDF stream with `Content-Type: application/pdf`.

---

## 5. Authentication, Credential Lifecycle & Security

### 5.1 Credential Structure
- **Client Identifier (`client_id`):** `vai_client_` + 16 random hex characters (public non-secret).
- **Client Secret (`client_secret`):** `vai_sec_` + 32 random URL-safe characters (cryptographically secure random).
- **Combined Header Format:** `X-API-Key: vai_client_...:vai_sec_...` or `Authorization: Bearer vai_client_...:vai_sec_...`.

### 5.2 Cryptographic Hash Storage
- The plain-text secret is **never stored** in the database.
- Database records only store:
  - `salt`: 16-byte random salt.
  - `secret_hash`: SHA-256 HMAC or PBKDF2 hash of the secret using the salt and system pepper.
- Secret verification uses `hmac.compare_digest` (constant-time comparison) to prevent timing side-channel attacks.

### 5.3 One-Time Reveal Dialog
When an administrator clicks **Create API Key**:
1. Server generates `client_id` and raw `client_secret`.
2. Computes and commits the secure hash.
3. Returns the plain secret in the HTTP response **once**.
4. Frontend presents a modal dialog with a prominent warning:
   > *"Copy this API Secret immediately. For security reasons, it cannot be recovered or displayed again."*
5. Future API queries only return `client_id`, truncated prefix (e.g. `vai_sec_a8f...`), creation date, and status.

### 5.4 Scopes & Principle of Least Privilege
Supported granular scopes:
- `scrutiny:create` — Permission to submit documents and initiate scrutiny.
- `scrutiny:read` — Permission to query job status, findings, and download reports.
- `documents:upload` — Permission to upload and register documents.
- `admin:all` — Full administrative capability (key management).

---

## 6. Migration Plan

1. **Phase A (Architecture Audit & Migration Specification):**
   - Document boundaries, models, and endpoints (this document).
2. **Phase B (Independent VerityAI Workspace in UI):**
   - Add dedicated VerityAI platform workspace in frontend (`AppShell.tsx` navigation, overview dashboard, API integrations manager, API documentation page, scrutiny job explorer).
3. **Phase C (Secure API Key Model & Management):**
   - Implement `IntegrationClient` SQLAlchemy model in `backend/app/models/integration_client.py`.
   - Implement key generation, secure hashing, constant-time verification, rotation, and revocation in `backend/app/services/api_key.py`.
   - Add admin management routes under `/api/v1/integrations/clients`.
4. **Phase D (Versioned Integration Gateway API):**
   - Implement `/api/v1/integrations/` router with endpoints for health, job creation (multipart document submission), status polling, results retrieval, and PDF report download.
   - Enforce cross-client tenant boundaries and idempotency.
5. **Phase E (Decouple Intelligence Engine):**
   - Wire integration jobs to the normalized AI adapter and deterministic validation rules without requiring `Application` or `User` records.
6. **Phase F (Connect Current Institutional Portal as Client 1):**
   - Implement a server-side integration client in the portal backend (`backend/app/services/verity_client.py`).
   - Add the **VerityAI Document Scrutiny** section in the officer dossier workspace.
7. **Phase G (Demonstrate Second Independent Client):**
   - Implement a standalone script `backend/scripts/demo_independent_client.py` using pure HTTP calls with its own API key.
8. **Phase H (Interactive API Documentation):**
   - Build a clean documentation view in the VerityAI workspace with copyable curl commands, schemas, and lifecycle diagrams.
9. **Phase I & J (Security, Regression & Verification):**
   - Comprehensive unit and integration test suite covering credential lifecycle, scope checks, cross-client isolation, job execution, and regression checks.

---

## 7. Safety Commitments
- **No destruction of existing demonstration database:** All existing institutions, applications, documents, and audit logs remain untouched.
- **Backward compatibility:** Existing `/api/v1/applications/...` routes remain fully operational for the hackathon demo.
- **Offline operation:** The platform continues to operate without requiring paid external AI API keys.
- **Human supremacy:** The platform provides decision-support findings; regulatory decisions remain strictly under human officer authority.
