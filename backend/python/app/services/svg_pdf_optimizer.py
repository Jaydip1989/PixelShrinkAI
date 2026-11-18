"""
Production SVG-to-PDF image optimizer.

Optimizes eligible embedded RGB and grayscale images in an existing PDF.
Vector content and unsupported image objects are preserved.
"""

import io

import pikepdf
from pikepdf import Name, Pdf
from PIL import Image


DEFAULT_MAX_BYTES = 1_500_000


def is_image_object(obj) -> bool:
    return (
        isinstance(obj, pikepdf.Stream)
        and obj.get("/Subtype") == Name("/Image")
        and not bool(obj.get("/ImageMask", False))
    )


def eligible_images(pdf):
    """
    Return image objects safe for independent JPEG optimization.

    Excludes soft-mask images, images carrying masks or decode arrays,
    unsupported colour spaces and non-8-bit images.
    """
    soft_mask_ids = set()

    for obj in pdf.objects:
        if not is_image_object(obj):
            continue

        soft_mask = obj.get("/SMask")

        if isinstance(soft_mask, pikepdf.Stream):
            soft_mask_ids.add(soft_mask.objgen)

    candidates = []

    for obj in pdf.objects:
        if not is_image_object(obj):
            continue

        if obj.objgen in soft_mask_ids:
            continue

        if "/SMask" in obj or "/Mask" in obj or "/Decode" in obj:
            continue

        color_space = obj.get("/ColorSpace")

        if color_space not in (
            Name("/DeviceRGB"),
            Name("/DeviceGray"),
        ):
            continue

        if int(obj.get("/BitsPerComponent", 0)) != 8:
            continue

        candidates.append(obj)

    return candidates


def extract_image(obj):
    """Decode an eligible PDF image into RGB or grayscale."""
    image = pikepdf.PdfImage(obj).as_pil_image()

    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    return image


def make_jpeg(image: Image.Image, quality: int) -> bytes:
    """Encode an image as optimized JPEG."""
    buffer = io.BytesIO()

    options = {
        "format": "JPEG",
        "quality": quality,
        "optimize": True,
    }

    if quality >= 90:
        options["subsampling"] = 0

    image.save(buffer, **options)

    return buffer.getvalue()


def build_candidate(
    base_pdf: bytes,
    image_data: list[Image.Image],
    quality: int,
) -> bytes:
    """Replace eligible image streams in a fresh PDF copy."""
    with Pdf.open(io.BytesIO(base_pdf)) as pdf:
        objects = eligible_images(pdf)

        if len(objects) != len(image_data):
            raise RuntimeError(
                "PDF image object count changed unexpectedly."
            )

        for obj, image in zip(objects, image_data):
            jpeg_data = make_jpeg(image, quality)

            obj.write(
                jpeg_data,
                filter=Name("/DCTDecode"),
            )

            if "/DecodeParms" in obj:
                del obj["/DecodeParms"]

            obj["/Width"] = image.width
            obj["/Height"] = image.height
            obj["/BitsPerComponent"] = 8
            obj["/ColorSpace"] = (
                Name("/DeviceGray")
                if image.mode == "L"
                else Name("/DeviceRGB")
            )

        output = io.BytesIO()

        pdf.save(
            output,
            object_stream_mode=pikepdf.ObjectStreamMode.generate,
        )

        return output.getvalue()


def validate_candidate(
    candidate: bytes,
    expected_pages: int,
    max_bytes: int,
) -> None:
    """Validate PDF signature, structure, page count and size."""
    if not candidate.startswith(b"%PDF-"):
        raise RuntimeError("PDF signature validation failed.")

    if len(candidate) > max_bytes:
        raise RuntimeError("Optimized PDF exceeds the size limit.")

    with Pdf.open(io.BytesIO(candidate)) as pdf:
        if len(pdf.pages) != expected_pages:
            raise RuntimeError(
                "Page count changed during optimization."
            )


def optimize_pdf_bytes(
    base_pdf: bytes,
    max_bytes: int = DEFAULT_MAX_BYTES,
) -> bytes:
    """
    Optimize an existing PDF without invoking Inkscape.

    Returns the original PDF if it already meets the size limit,
    no eligible images exist, or no candidate meets the limit.

    Raises RuntimeError for invalid input or PDF-processing failures.
    """
    if not isinstance(base_pdf, bytes) or not base_pdf.startswith(b"%PDF-"):
        raise ValueError("Input must contain valid PDF bytes.")

    if not isinstance(max_bytes, int) or max_bytes <= 0:
        raise ValueError("Maximum PDF size must be a positive integer.")

    with Pdf.open(io.BytesIO(base_pdf)) as pdf:
        expected_pages = len(pdf.pages)

        if expected_pages == 0:
            raise ValueError("PDF contains no pages.")

        if len(base_pdf) <= max_bytes:
            return base_pdf

        objects = eligible_images(pdf)
        images = [extract_image(obj) for obj in objects]

    if not images:
        return base_pdf

    # Find the highest JPEG quality that meets the size limit.
    low = 1
    high = 95

    best_candidate = None

    while low <= high:
        quality = (low + high) // 2

        candidate = build_candidate(
            base_pdf,
            images,
            quality,
        )

        if len(candidate) <= max_bytes:
            best_candidate = candidate
            low = quality + 1
        else:
            high = quality - 1

    if best_candidate is None:
        return base_pdf

    validate_candidate(
        best_candidate,
        expected_pages,
        max_bytes,
    )

    return best_candidate
