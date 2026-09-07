from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.services.vector_service import raster_to_svg
from app.services.pdf_service import (
    png_to_pdf,
    jpeg_to_pdf,
    webp_to_pdf,
)
from app.services.svg_service import convert_svg_to_pdf


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
# IMAGE -> SVG
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

# -----------------------------------------------------------------
# IMAGE -> PDF
# -----------------------------------------------------------------

@app.post("/api/convert/pdf")
async def convert_image_to_pdf(
    file:UploadFile = File(...),
):
    image_bytes = await file.read()

    extension = Path(
        file.filename or ""
    ).suffix.lower().lstrip(".")

    supported_formats = {
        "png",
        "jpg",
        "jpeg",
        "webp",
    }

    if extension not in supported_formats:
        raise ValueError(
            "Unsupported image format."
            "Supported formats: PNG, JPG, JPEG, WEBP."
        )

    if extension == "png":
        pdf = png_to_pdf(image_bytes)
    elif extension in {"jpg", "jpeg"}:
        pdf = jpeg_to_pdf(image_bytes)
    elif extension == "webp":
        pdf = webp_to_pdf(image_bytes)
    else:
        raise ValueError(
            "Unsupported image format. "
            "Supported formats: PNG, JPG, JPEG, WEBP."
        )

    return Response(
        content = pdf,
        media_type="application/pdf",
        headers = {
            "Content-Disposition": (
                "attachment; filename=converted.pdf"
            )
        },
    )

# -----------------------------------------------------------------
# SVG -> PDF
# -----------------------------------------------------------------
# Supports:
#   - Pure Vector SVG
#   - Embedded Raster SVG
#   - Mixed Raster + Vector SVG
# -----------------------------------------------------------------

@app.post("/api/convert/svg-to-pdf")
async def convert_svg_file_to_pdf(
    file:UploadFile = File(...),
):
    svg_bytes = await file.read()

    extension = Path(
        file.filename or ""
    ).suffix.lower()

    if extension != ".svg":
        raise ValueError(
            "SVG to PDF conversion requires an SVG file."
        )
    # -----------------------------------------------------------------
    #   svg_service.convert_svg_to_pdf() operates on an SVG Path.
    #   Create a temporary SVG file for the proven dispatcher.
    # -----------------------------------------------------------------

    with NamedTemporaryFile(
        suffix=".svg",
        delete = False,
    ) as temp_file:
        temp_path = Path(temp_file.name)
        temp_file.write(svg_bytes)

        try:
            result = convert_svg_to_pdf(temp_path)

            output_path = Path(result["output"])

            pdf_bytes = output_path.read_bytes()

            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers = {
                    "Content-Disposition": (
                        "attachment; filename=converted.pdf"
                    )
                },
            )

        finally:
            temp_path.unlink(missing_ok=True)