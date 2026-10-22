# VerityAI / EntityLocker — Production Deployment Guide

**Smart India Hackathon 2026 — Smart Automation Track**  
**Document:** Deployment Strategy, Environment Validation & Production Configuration  
**Status:** Verified Operational  

---

## 1. Deployment Architecture Overview

VerityAI / EntityLocker is architected as an explainable, self-contained regulatory decision-support platform designed for institutional scrutiny.

```text
                                  +---------------------------------+
                                  |    Reverse Proxy / Ingress      |
                                  |    (Nginx / TLS 1.3 Termination)|
                                  +---------------------------------+
                                            │              │
                     Static Assets (/)      │              │ API Calls (/api/*)
                                            ▼              ▼
+------------------------------------+             +------------------------------------+
|         Frontend Container         |             |          Backend Container         |
|  - Nginx Alpine                    |             |  - Python 3.12-slim (FastAPI)      |
|  - Compiled React 19 SPA           |             |  - PyMuPDF, RapidOCR (ONNX)        |
|  - Port 80                         |             |  - Non-root User (UID 1000)        |
+------------------------------------+             +------------------------------------+
                                                           │
                                                           ▼
                                           +------------------------------------+
                                           |      Persistent Storage Volume     |
                                           |  - SQLite Database with WAL Mode   |
                                           |  - Encrypted/Protected Uploads Dir |
                                           +------------------------------------+
```

---

## 2. System Prerequisites

### Minimum Hardware Requirements
* **CPU:** 2 vCPU (x86_64 or ARM64)
* **RAM:** 4 GB (8 GB recommended for concurrent OCR inference)
* **Disk:** 20 GB SSD storage (persistent volume for `./var`)
* **OS:** Linux (Ubuntu 22.04/24.04 LTS), macOS, or Windows with WSL2 / Docker Desktop

### Software Runtimes
* **Docker:** v24.0+ and **Docker Compose:** v2.20+
* **Alternatively (Bare Metal / VM):**
  * Python 3.12 (with `libgl1`, `libglib2.0-0` OS packages for OpenCV/MuPDF)
  * Node.js v20.x or v22.x LTS with npm 10+

---

## 3. Environment Configuration (`.env`)

A reference template is maintained in [`.env.example`](../.env.example). Copy to `.env` before starting:

```ini
# Application Runtime & Mode
ENVIRONMENT=production
DEBUG=false
PROJECT_NAME="VerityAI"
VERSION="1.0.0"
API_V1_PREFIX=/api/v1

# CORS Allowed Origins (JSON array of strings)
ALLOWED_ORIGINS=["http://localhost","http://localhost:80","http://localhost:5173","http://127.0.0.1"]

# Security & Authentication (Generate secure 32+ char key!)
JWT_SECRET_KEY=generate-a-cryptographically-secure-random-32-byte-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
COOKIE_SECURE=true              # Set to true when serving behind HTTPS
COOKIE_SAMESITE=lax

# Database Configuration (SQLite default with WAL mode; PostgreSQL supported)
DATABASE_URL=sqlite:///./var/verityai.db

# Storage Configuration
STORAGE_LOCAL_DIR=./var/uploads
STORAGE_ROOT=./var/uploads
MAX_UPLOAD_SIZE_BYTES=20971520
ALLOWED_UPLOAD_EXTENSIONS=[".pdf",".png",".jpg",".jpeg"]
ALLOWED_UPLOAD_MIME_TYPES=["application/pdf","image/png","image/jpeg"]
```

---

## 4. Containerized Deployment (Recommended)

### A. One-Command Launch via Docker Compose
From the repository root:

```bash
# Build and start services in detached mode
docker compose up -d --build
```

### B. Verifying Container Health
```bash
# Check container status and automated healthchecks
docker compose ps

# Inspect backend logs
docker compose logs -f backend

# Verify backend healthcheck
curl -f http://localhost:8000/api/v1/health

# Verify frontend healthcheck
curl -f http://localhost/healthz
```

### C. Persistent Volume Management
All database records (`verityai.db`) and uploaded institutional documents (`/var/uploads`) are mounted to the named volume `verityai_data`. They persist across container restarts and image updates.

---

## 5. Bare-Metal / Local Production Startup

For running directly on a Linux server without Docker:

### Step 1: Backend Setup
```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations to latest schema head
alembic upgrade head

# Seed demo dataset, accounts, and synthetic PDFs
PYTHONPATH=. python -m app.db.seed

# Start production ASGI server with multiple workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

### Step 2: Frontend Setup
```bash
cd frontend
npm ci
npm run build

# Serve compiled dist/ directory with Nginx, Caddy, or static server
```

---

## 6. Security Hardening in Production

1. **Non-Root Execution:** The production Docker image creates and runs under `appuser` (UID 1000).
2. **SSRF Outbound Shield:** Outbound regulatory gateway calls are checked against private and cloud metadata CIDR blocks (`0.0.0.0/8`, `10.0.0.0/8`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `::1`).
3. **HTTP Security Headers:** Nginx and FastAPI automatically inject:
   * `X-Content-Type-Options: nosniff`
   * `X-Frame-Options: DENY`
   * `X-XSS-Protection: 1; mode=block`
   * `Referrer-Policy: strict-origin-when-cross-origin`
4. **CSRF & Cookies:** State-mutating endpoints enforce `X-Requested-With: VerityAI`. JWT tokens are delivered via `HttpOnly`, `SameSite=Lax` cookies.

---

## 7. Troubleshooting & Recovery

* **Database Locked:** SQLite WAL mode handles concurrent readers. If a lock occurs during high concurrency, ensure permissions on `./var/verityai.db` belong to `appuser`.
* **Missing Documents on Upload:** Check permissions of `./var/uploads`:
  ```bash
  mkdir -p backend/var/uploads && chmod 755 backend/var/uploads
  ```
* **Readiness Audit:** Run the pre-flight auditor at any time to verify system health:
  ```bash
  cd backend && PYTHONPATH=. .venv/bin/python -m app.cli.readiness
  ```
