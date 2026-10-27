# VerityAI — Role-Based Access Control (RBAC) Permission Matrix

**Classification:** Official Regulatory Technical Specification  
**Version:** 1.0.0 (SIH 2026 Prototype)  
**Enforcement Authority:** Backend FastAPI Service Layer & Security Dependencies  

---

## 1. Executive Overview

VerityAI strictly isolates the functional responsibilities and security boundaries between the **Scrutiny Officer (Reviewer)** and the **Regulatory Administrator (Admin)**. This matrix establishes authoritative permissions, server-side enforcement mechanisms, and audit logging mandates.

Hiding UI elements or disabling buttons does **not** constitute authorization. All security decisions are authenticated and authorized on the server side using cryptographically validated JWT access tokens (stored in secure HttpOnly cookies) with role claims verified against active database user records.

---

## 2. Definitive Permission Matrix

| Feature / Action | Reviewer | Admin | Enforcement Location | Audit Required | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **View Scrutiny Workspace / Dashboard** | Allowed | Denied (redirects to Admin Dashboard) | Frontend route guard + workspace router | No | Reviewer workspace focuses on application scrutiny queue and findings. |
| **View Administrative Workspace / Dashboard** | Denied | Allowed | Frontend route guard + workspace router | No | Admin dashboard focuses on platform health, user management, and operational oversight. |
| **View Scrutiny Queue** | Allowed | Allowed (Oversight) | Backend `GET /api/v1/scrutiny-queue` (`REVIEWER`, `ADMIN`) | No | Filtered by assignment / readiness status. |
| **View Authorized Applications** | Allowed | Allowed (Oversight) | Backend `GET /api/v1/applications` (`REVIEWER`, `ADMIN`) | No | Institution users strictly limited to their own tenant. |
| **View / Preview / Download Documents** | Allowed | Allowed | Backend `GET /api/v1/documents/{id}/file` (`get_current_user`) | Yes (`DOCUMENT_VIEWED` / `DOCUMENT_DOWNLOADED`) | Enforces object-level tenant isolation; logs actor identity. |
| **Upload Application Documents** | Allowed | Allowed | Backend `POST /api/v1/applications/{id}/documents` (`REVIEWER`, `ADMIN`, `INSTITUTION_USER`) | Yes (`DOCUMENT_UPLOADED`) | Validates MIME magic bytes, size limits, and SHA-256 integrity. |
| **Trigger Document Reprocessing / OCR** | Allowed | Allowed | Backend `POST /api/v1/documents/{id}/reprocess` (`REVIEWER`, `ADMIN`) | Yes (`DOCUMENT_REPROCESSED`) | Re-extracts text and updates field provenance. |
| **Run Deterministic Validation Engine** | Allowed | Allowed | Backend `POST /api/v1/applications/{id}/validate` (`REVIEWER`, `ADMIN`) | Yes (`VALIDATION_TRIGGERED`) | Evaluates APH 2024–27 normative rule checklist. |
| **Run Anomaly & Cross-Doc Analysis** | Allowed | Allowed | Backend `POST /api/v1/applications/{id}/analyze` (`REVIEWER`, `ADMIN`) | Yes (`ANOMALY_SCAN_TRIGGERED`) | Cross-document inconsistency and candidate field extraction. |
| **View Findings & Evidence Citations** | Allowed | Allowed | Backend `GET /api/v1/applications/{id}/anomalies` (`REVIEWER`, `ADMIN`) | No | Read-only inspection of discrepancies and bounding boxes. |
| **Adjudicate / Review Findings** | Allowed | Allowed (Oversight) | Backend `POST /api/v1/anomalies/{id}/review` (`REVIEWER`, `ADMIN`) | Yes (`FINDING_REVIEWED`) | Reviewer records explanatory finding status and audit notes. |
| **Execute Application State Transition** | Allowed | Allowed (Oversight) | Backend `POST /api/v1/applications/{id}/workflow/transitions` (`REVIEWER`, `ADMIN`) | Yes (`LIFECYCLE_TRANSITION`) | Advances state machine (e.g. SUBMITTED -> UNDER_SCRUTINY). |
| **Generate Scrutiny Reports (PDF/JSON)** | Allowed | Allowed | Backend `POST /api/v1/applications/{id}/reports` (`REVIEWER`, `ADMIN`) | Yes (`REPORT_GENERATED`) | Creates timestamped, cryptographic evidence dossier. |
| **Download Scrutiny Reports** | Allowed | Allowed | Backend `GET /api/v1/reports/{id}/download` (`REVIEWER`, `ADMIN`) | Yes (`REPORT_DOWNLOADED`) | Streams signed report with nosniff headers. |
| **View Validation Rules Catalog** | Allowed | Allowed | Backend `GET /api/v1/validation-rules` (`REVIEWER`, `ADMIN`) | No | Reference view of deterministic rules and thresholds. |
| **Modify Regulatory Rules & Versions** | Denied | Allowed only under authorized change workflow | Backend `POST/PATCH /api/v1/validation-rules` (`ADMIN`) | Yes (`RULE_CONFIG_CHANGED`) | Scrutiny officers cannot alter statutory rule criteria. |
| **View User Accounts & Roles** | Denied | Allowed | Backend `GET /api/v1/users` (`ADMIN`) | No | Strictly restricted to administrators. |
| **Create New User Account** | Denied | Allowed | Backend `POST /api/v1/users` (`ADMIN`) | Yes (`USER_CREATED`) | Assigns role (ADMIN, REVIEWER, etc.) and Argon2 password. |
| **Activate / Deactivate Users** | Denied | Allowed | Backend `PATCH /api/v1/users/{id}/status` (`ADMIN`) | Yes (`USER_STATUS_UPDATED`) | Disables login immediately; self-deactivation prohibited. |
| **View Global Platform Audit Log** | Denied | Allowed | Backend `GET /api/v1/audit-events` (`ADMIN`) | No | Reviewer accesses only application-specific history. |
| **View Regulatory Gateways & Adapters** | Allowed (Read-only) | Allowed | Backend `GET /api/v1/integrations/providers` (`REVIEWER`, `ADMIN`) | No | Reviews external connectivity posture without secrets. |
| **Probe Gateway Live Health** | Denied | Allowed | Backend `GET /api/v1/integrations/providers/{id}/status` (`ADMIN`) | Yes (`GATEWAY_PROBED`) | Active probe against external endpoints with SSRF guards. |
| **Import Regulatory Reference Datasets**| Denied | Allowed | Backend `POST /api/v1/registry/imports` (`ADMIN`) | Yes (`REGISTRY_IMPORTED`) | AISHE / statutory reference registry baseline imports. |
| **Resolve Registry Discrepancies** | Allowed | Allowed | Backend `PATCH /api/v1/registry-verification/{id}/resolve` (`REVIEWER`, `ADMIN`) | Yes (`DISCREPANCY_RESOLVED`) | Scrutiny officer marks verified physical gazette evidence. |
| **Delete Audit Records** | Denied | Denied | Immutable Architecture / Database Constraint | N/A | Audit log is strictly append-only; even admins cannot delete. |
| **Access Another Institution's Data** | Condition-dependent | Condition-dependent | Backend Object-level Tenant Authorization | Yes | Reviewers and Admins have regulatory oversight across applications; Institution users are strictly locked to their institution. |

---

## 3. Key Role Boundaries & Safeguards

1. **Least Privilege Principle:**
   - Reviewers have full operational access to the scrutiny pipeline (documents, OCR, validation, anomalies, findings, reports), but zero administrative access to user accounts, global audit logs, gateway health probing, or reference dataset imports.
   - Administrators have oversight of platform metrics, users, rules, and system configurations, but do not replace human scrutiny officers for statutory evaluations.
2. **Untrusted Client Data:**
   - Identity and roles are resolved exclusively from the server-side decrypted JWT session token. Request body parameters attempting to supply `reviewer_id` or `role` are discarded or validated against `current_user`.
3. **No Dead Buttons or Hidden-Only Security:**
   - If a route or action is forbidden to a role, the backend rejects it with `403 Forbidden` (`FORBIDDEN`).
   - The frontend dynamically renders the correct navigation links, dashboard metrics, and action buttons tailored to the user's role.
