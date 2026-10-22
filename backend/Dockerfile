# ==============================================================================
# VerityAI Backend — Production Container Image (Python 3.12)
# Multi-stage security-hardened container for Smart India Hackathon 2026
# ==============================================================================

FROM python:3.12-slim AS runtime

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install minimal OS runtime libraries required by PyMuPDF and ONNX RapidOCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user
RUN groupadd -g 1000 veritygroup && \
    useradd -u 1000 -g veritygroup -s /bin/bash -m appuser

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY --chown=appuser:veritygroup . /app

# Ensure var directories exist and have proper permissions for persistence
RUN mkdir -p /app/var/uploads && \
    chown -R appuser:veritygroup /app/var

USER appuser

# Expose FastAPI backend port
EXPOSE 8000

# Container healthcheck via live SQLite probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Default startup command: run migrations, seed demo assets, and start uvicorn
CMD ["sh", "-c", "alembic upgrade head && python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]
