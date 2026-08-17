# PixelShrinkAI Python Engine

This directory contains the server-side processing layer for PixelShrinkAI.

## Phase 2 foundation

The first milestone is a minimal FastAPI service with a health endpoint.

### 1. Create the virtual environment

macOS / Linux:

```bash
cd python
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the development server

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Test the engine

Open:

```text
http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "PixelShrinkAI Python Engine"
}
```

The frontend can later communicate with this service from the Astro/Preact development server on port 4321.

Do not add conversion logic here yet. This is the foundation only.
