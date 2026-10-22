# ==============================================================================
# VerityAI Backend — Production Container Image (Python 3.12)
# Multi-stage security-hardened container for Smart India Hackathon 2026
#
# OPTIMIZATIONS APPLIED:
#   1. Pinned to python:3.12-slim-bookworm (Debian 12 stable) — more widely
#      cached by CDN than trixie, consistent package versions.
#   2. BuildKit cache mounts on /var/cache/apt and /var/lib/apt so that
#      apt metadata and downloaded .deb files are reused across rebuilds.
#   3. BuildKit cache mount on /root/.cache/pip so pip wheel downloads
#      are reused across rebuilds without landing in the image layer.
#   4. opencv-python REPLACED with opencv-python-headless:
#      - opencv-python pulls libgl1 which cascades into 51 Mesa/DRM/X11
#        packages (libllvm15, libdrm-*, libgl1-mesa-dri, 200 MB+) adding
#        7+ minutes to apt-get on first build.
#      - opencv-python-headless provides identical cv2 image-processing API
#        without X11/OpenGL dependencies — correct for a headless server.
#      - We install headless first, then rapidocr installs opencv-python as
#        a transitive dep; we immediately uninstall it and keep headless.
#      - This eliminates libgl1 from the apt step entirely.
#   5. backend/.dockerignore excludes .venv, var/, caches, and secrets,
#      drastically shrinking context transfer and preventing cache misses
#      on COPY instructions caused by runtime-state changes.
#   6. requirements.txt copied and installed before application source so
#      the pip layer is only invalidated when dependencies change.
#   7. Single combined apt-get layer; apt lists cleaned after install.
#
# REQUIRED RUNTIME LIBRARIES (after removing libgl1):
#   libglib2.0-0  — required for libgthread-2.0.so.0 used by GLib/OpenCV.
#   libgomp1      — required by ONNX Runtime for OpenMP multi-threading.
#   curl          — used by the HEALTHCHECK command.
#   libgl1        — NO LONGER NEEDED (removed by using opencv-headless).
#
# BuildKit MUST be enabled.  Docker >= 23 enables it by default.
# For older Docker:  DOCKER_BUILDKIT=1 docker build ...
# ==============================================================================

# syntax=docker/dockerfile:1.4
FROM python:3.12-slim-bookworm AS runtime

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install minimal OS runtime libraries.
# libgl1 is intentionally omitted — opencv-python-headless does not require it.
# BuildKit cache mounts keep apt metadata + downloaded .deb files across
# rebuilds so subsequent builds skip the index download entirely.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
        curl \
        libglib2.0-0 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user
RUN groupadd -g 1000 veritygroup && \
    useradd -u 1000 -g veritygroup -s /bin/bash -m appuser

# Install Python dependencies.
# Copy requirements.txt BEFORE application source so this layer is only
# invalidated when requirements change, not when source code changes.
#
# opencv-python-headless is installed first to pin the headless variant.
# rapidocr-onnxruntime pulls opencv-python (full, with GUI) as a transitive
# dependency; we uninstall it immediately after and keep headless only.
# This prevents libGL.so.1 import errors at runtime without needing libgl1.
#
# BuildKit pip cache mount reuses downloaded wheels across rebuilds.
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip uninstall -y opencv-python && \
    pip install opencv-python-headless

# Copy backend application source code
COPY --chown=appuser:veritygroup . /app

# Ensure var directories exist and have proper permissions for persistence
RUN mkdir -p /app/var/uploads && \
    chown -R appuser:veritygroup /app/var

USER appuser

# Expose FastAPI backend port
EXPOSE 8000

# Container healthcheck via live HTTP probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Default startup command: run migrations, seed demo assets, and start uvicorn
CMD ["sh", "-c", "alembic upgrade head && python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]
