from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.services.vector_service import raster_to_svg

app = FastAPI(
    title="PixelShrinkAI Python Engine",
    version="0.1.0",
)

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


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "PixelShrinkAI Python Engine",
    }

@app.post("/api/convert/svg")
async def convert_to_svg(file: UploadFile = File(...)):
    image_bytes = await file.read()
    svg = raster_to_svg(
        image_bytes,
        img_format = "png"
    )
    return Response(
        content=svg,
        media_type="image/svg+xml"
    )
