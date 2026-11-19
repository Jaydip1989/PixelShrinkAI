FROM python:3.12-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install Inkscape and required Linux runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends inkscape fonts-dejavu-core && rm -rf /var/lib/apt/lists/*

# Install existing pinned Python dependencies
COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt

# Copy the existing FastAPI application
COPY app/ ./app/

# Verify Python and Inkscape installations
RUN python --version && inkscape --version

# Start FastAPI using Railway's assigned port
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
