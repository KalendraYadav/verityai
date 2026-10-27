# Security, Privacy & Data Governance Audit

**Document ID:** SEC-AUDIT-001  
**Project:** VerityAI / EntityLocker  
**Audit Standard:** OWASP Top 10 API Security, CERT-In Guidelines, Digital Personal Data Protection Act (DPDPA 2023)  
**Date of Audit:** 2026-10-24  

---

## 1. Security Architecture & Controls Inventory

| Security Domain | Existing Safeguards Implemented | Implementation Evidence | Test Verification | Security Evaluation |
|---|---|---|---|---|
| **Authentication** | Argon2id password hashing; JWT session cookies with `HttpOnly`, `SameSite=Lax`, and `Secure` flags | `services/auth.py`<br>`core/security.py` | 14 passed in `test_auth.py` | **ROBUST**: State-of-the-art password derivation; protected against XSS credential theft. |
| **CSRF Defense** | Strict `X-Requested-With: VerityAI` header verification on state-changing requests | `services/auth.py` line 92 | Tested in `test_auth.py` | **ROBUST**: Blocks cross-site form submissions and standard CSRF attacks. |
| **Role-Based Access Control (RBAC)** | Endpoint route guards enforcing roles (`ADMIN`, `REVIEWER`, `INSTITUTION_USER`) | `api/deps.py` (`require_roles`) | Tested in `test_auth.py` | **GOOD**: Server-side enforcement; client role claims ignored. |
| **File Storage Security** | Content magic-byte validation (`%PDF-`, PNG, JPEG); UUID storage keys outside public web roots; 20MB limit | `services/storage.py` | 15 passed in `test_documents.py` | **ROBUST**: Blocks executable script uploads and directory traversal attacks. |
| **Outbound SSRF Protection** | Outbound URL parsing; DNS socket-level resolution; 11 blocked private & cloud-metadata CIDRs | `services/integration.py` | Tested in `test_integration.py` | **ROBUST**: Prevents SSRF attacks against AWS/GCP metadata (`169.254.169.254`) and internal subnets. |
| **HTTP Security Headers** | Middleware injecting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` | `main.py` lines 74–84 | Tested in `test_security_hardening.py` | **GOOD**: Protects against MIME sniffing and clickjacking. |
| **Error Sanitization** | Global exception handlers masking internal server stack traces and database errors | `main.py` lines 18–72 | Tested in `test_security_hardening.py` | **GOOD**: Returns standardized error codes without exposing file paths. |
| **Sensitive Header Masking** | Redaction of authorization headers (`Authorization`, `api-key`, `secret`) before logging | `services/integration.py` line 95 | Tested in `test_integration.py` | **GOOD**: Prevents credential leakage in sync logs. |

---

## 2. Confirmed Vulnerabilities and Identified Security Risks

### SEC-VULN-001: Missing Institution Tenant Ownership Guard on Document Download Route
- **Vulnerability Category:** Insecure Direct Object Reference (IDOR) / Broken Object Level Authorization (BOLA - OWASP API1:2023).
- **Affected File:** `backend/app/api/v1/endpoints/documents.py` (Route `GET /api/v1/documents/{document_id}/file`).
- **Inspection Finding:**
  ```python
  @router.get("/{document_id}/file")
  def download_document_file(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
      doc = db.get(Document, document_id)
      # RBAC checks user is logged in, BUT does not verify if INSTITUTION_USER owns the application
  ```
  While `INSTITUTION_USER` is restricted when listing applications, a direct request to `GET /documents/{document_id}/file` with a known UUID allows downloading files uploaded by other institutions.
- **Impact:** **HIGH**. Potential unauthorized disclosure of proprietary institutional land deeds and financials between competing institutions.
- **Mitigation:** Enforce ownership validation in route dependency:
  ```python
  if current_user.role == "INSTITUTION_USER":
      if not doc.application or doc.application.institution_id != current_user.institution_id:
          raise ForbiddenException("Access denied to foreign institutional evidence.")
  ```

### SEC-VULN-002: In-Memory Token Blacklist Non-Persistence
- **Vulnerability Category:** Incomplete Session Invalidation across Server Restarts.
- **Affected File:** `backend/app/services/auth.py` (`revoked_tokens = set()`).
- **Inspection Finding:** User logouts add token JTI to a Python in-memory set. If the server worker restarts or in a multi-worker deployment, previously logged-out tokens become valid until expiration (60 minutes).
- **Impact:** **LOW to MEDIUM**.
- **Mitigation:** Persist revoked token identifiers in a dedicated database table `revoked_tokens` with automatic TTL cleanup.

---

## 3. Data Governance & Regulatory Privacy Compliance (DPDPA 2023)

### Compliance Evaluation under Indian Digital Personal Data Protection Act, 2023
1. **Purpose Limitation:** Evidentiary documents (faculty Aadhaar/PAN seedings, salary slips, student admission rosters) are processed strictly for regulatory approval scrutiny under the AICTE Act, 1987.
2. **Data Minimization:** Full Aadhaar numbers must not be stored in plain text. Faculty records should only store masked Aadhaar (last 4 digits) or virtual IDs per UIDAI guidelines.
3. **No External Transmission without Authorization:** Institutional filings and confidential financial statements are never transmitted to third-party commercial LLMs or overseas cloud endpoints.
4. **Append-Only Auditing:** Every inspection, review, and report generation action is logged in `audit_events` with actor ID, timestamp, and entity reference, ensuring institutional accountability.
