from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.services.vector_service import raster_to_svg


app = FastAPI(
    title="PixelShrinkAI Python Engine",
    version="0.1.0",
)


# -----------------------------------------------------------------
# CORS
# -----------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4321",
        "http://127.0.0.1:4321",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------
# HEALTH CHECK
# -----------------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "PixelShrinkAI Python Engine",
    }


# -----------------------------------------------------------------
# RASTER -> SVG
# -----------------------------------------------------------------

@app.post("/api/convert/svg")
async def convert_to_svg(
    file: UploadFile = File(...),
):
    # -------------------------------------------------------------
    # Read uploaded file
    # -------------------------------------------------------------

    image_bytes = await file.read()

    # -------------------------------------------------------------
    # Detect image format from filename
    # -------------------------------------------------------------

    extension = Path(
        file.filename or ""
    ).suffix.lower().lstrip(".")

    # -------------------------------------------------------------
    # Validate supported formats
    # -------------------------------------------------------------

    supported_formats = {
        "png",
        "jpg",
        "jpeg",
        "webp",
    }

    if extension not in supported_formats:
        raise ValueError(
            "Unsupported image format. "
            "Supported formats: PNG, JPG, JPEG, WEBP."
        )

    # -------------------------------------------------------------
    # Convert using the appropriate engine
    # -------------------------------------------------------------

    svg = raster_to_svg(
        image_bytes,
        img_format=extension,
    )

    # -------------------------------------------------------------
    # Return SVG
    # -------------------------------------------------------------

    return Response(
        content=svg,
        media_type="image/svg+xml")