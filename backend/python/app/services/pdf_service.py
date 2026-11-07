
from io import BytesIO

from PIL import Image
import img2pdf


def _encode_jpeg(image: Image.Image, quality: int) -> bytes:
    """Encode an image as an optimized progressive JPEG."""
    output = BytesIO()
    image.save(
        output,
        format="JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
    )
    return output.getvalue()


def _jpeg_to_pdf(jpeg_bytes: bytes) -> bytes:
    """Wrap a JPEG stream in a PDF without re-encoding it."""
    return img2pdf.convert(jpeg_bytes)


def _pillow_png_to_pdf(image: Image.Image) -> bytes:
    """Convert an image using Pillow's native PDF writer."""
    output = BytesIO()
    image.save(output, format="PDF", resolution=96)
    return output.getvalue()


def _has_transparency(image: Image.Image) -> bool:
    """Detect alpha channels and palette-based transparency."""
    return (
        "A" in image.getbands()
        or "transparency" in image.info
    )


def _flatten_to_rgb(image: Image.Image) -> Image.Image:
    """Flatten transparency onto white before a JPEG-based conversion."""
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    return Image.alpha_composite(background, rgba).convert("RGB")


def _valid_pdf_within_limit(
    pdf_bytes: bytes,
    original_size: int,
) -> bool:
    """Accept only valid-looking PDF output that meets the size rule."""
    return (
        pdf_bytes.startswith(b"%PDF-")
        and len(pdf_bytes) <= original_size
    )


def _jpeg_pdf_candidates(
    image: Image.Image,
    original_size: int,
    quality_levels: list[int],
) -> list[bytes]:
    """Return the first eligible JPEG-based PDF, if one can be produced."""
    for quality in quality_levels:
        try:
            jpeg_bytes = _encode_jpeg(image, quality)
            pdf_bytes = _jpeg_to_pdf(jpeg_bytes)
        except Exception:
            continue

        if _valid_pdf_within_limit(pdf_bytes, original_size):
            return [pdf_bytes]

    return []


def png_to_pdf(image_bytes: bytes) -> bytes:
    """Convert PNG to PDF without exceeding the original PNG size."""
    try:
        if not image_bytes:
            raise ValueError("Input PNG is empty.")

        with Image.open(BytesIO(image_bytes)) as source:
            if source.format != "PNG":
                raise ValueError("Input is not a PNG image.")

            source.load()
            image = source.copy()
            transparent = _has_transparency(source)

        original_size = len(image_bytes)

        # Preserve transparency whenever a direct conversion fits.
        # Do not accept Pillow-native PDF output for transparent images
        # based on size alone, because alpha preservation is not assured.
        if transparent:
            try:
                direct_pdf = img2pdf.convert(image_bytes)
                if _valid_pdf_within_limit(direct_pdf, original_size):
                    return direct_pdf
            except Exception:
                pass

            # JPEG cannot preserve alpha. Flatten onto white intentionally.
            rgb_image = _flatten_to_rgb(image)

        else:
            rgb_image = image.convert("RGB")

            # Compare the original native-PDF and direct img2pdf approaches.
            candidates = []

            try:
                native_pdf = _pillow_png_to_pdf(image)
                if _valid_pdf_within_limit(native_pdf, original_size):
                    candidates.append(native_pdf)
            except Exception:
                pass

            try:
                direct_pdf = img2pdf.convert(image_bytes)
                if _valid_pdf_within_limit(direct_pdf, original_size):
                    candidates.append(direct_pdf)
            except Exception:
                pass

            if candidates:
                return min(candidates, key=len)

        # For transparent or otherwise difficult PNGs, try JPEG fallback.
        # Search from higher to lower quality and stop at the first result
        # that satisfies the original input-size limit.
        quality_levels = [
            95, 93, 91, 89, 87, 85, 83, 80, 77, 74,
            70, 65, 60, 55, 50, 45, 40, 35, 32,
            31, 30, 29, 28, 27, 26, 25, 24, 23,
            22, 21, 20, 19, 18, 17, 16, 15, 14,
            13, 12, 11, 10,
        ]

        candidates = _jpeg_pdf_candidates(
            rgb_image,
            original_size,
            quality_levels,
        )

        if candidates:
            return candidates[0]

        raise ValueError(
            "PNG-to-PDF conversion could not produce a valid PDF "
            "within the original PNG file size. This may happen with "
            "very small or highly compressible PNG files. Transparent "
            "images may require flattening onto white, which can reduce "
            "image quality. The input was not changed."
        )

    except Exception as exc:
        if isinstance(exc, ValueError):
            raise
        raise ValueError(f"PNG to PDF conversion failed: {exc}") from exc


def jpeg_to_pdf(image_bytes: bytes) -> bytes:
    """Convert JPEG to PDF, preserving the original JPEG stream if possible."""
    try:
        if not image_bytes:
            raise ValueError("Input JPEG is empty.")

        with Image.open(BytesIO(image_bytes)) as source:
            if source.format not in {"JPEG", "JPG"}:
                raise ValueError("Input is not a JPEG image.")

            source.load()
            image = source.copy()

        original_size = len(image_bytes)

        # Preserve the original JPEG stream whenever it meets the size rule.
        try:
            direct_pdf = _jpeg_to_pdf(image_bytes)
            if _valid_pdf_within_limit(direct_pdf, original_size):
                return direct_pdf
        except Exception:
            pass

        rgb_image = image.convert("RGB")

        quality_levels = [
            95, 93, 91, 89, 87, 85, 83, 80, 77, 74,
            70, 65, 60, 55, 50, 45, 40, 35, 32,
        ]

        candidates = _jpeg_pdf_candidates(
            rgb_image,
            original_size,
            quality_levels,
        )

        if candidates:
            return candidates[0]

        raise ValueError(
            "JPEG-to-PDF conversion could not produce a valid PDF "
            "within the original JPEG file size without further "
            "quality reduction."
        )

    except Exception as exc:
        if isinstance(exc, ValueError):
            raise
        raise ValueError(f"JPEG to PDF conversion failed: {exc}") from exc


def webp_to_pdf(image_bytes: bytes) -> bytes:
    """Convert WEBP to PDF while enforcing the original-size limit."""
    try:
        if not image_bytes:
            raise ValueError("Input WEBP is empty.")

        with Image.open(BytesIO(image_bytes)) as source:
            if source.format != "WEBP":
                raise ValueError("Input is not a WEBP image.")

            source.load()
            image = source.copy()

        original_size = len(image_bytes)

        # Flatten any WEBP transparency onto white for RGB/PDF fallback.
        rgb_image = _flatten_to_rgb(image)

        # Try Pillow-native PDF first.
        try:
            native_pdf = _pillow_png_to_pdf(rgb_image)
            if _valid_pdf_within_limit(native_pdf, original_size):
                return native_pdf
        except Exception:
            pass

        # Preserve the existing WEBP fallback quality range.
        candidates = _jpeg_pdf_candidates(
            rgb_image,
            original_size,
            list(range(95, 4, -1)),
        )

        if candidates:
            return candidates[0]

        raise ValueError(
            "WEBP-to-PDF conversion could not produce a valid PDF "
            "within the original WEBP file size."
        )

    except Exception as exc:
        if isinstance(exc, ValueError):
            raise
        raise ValueError(f"WEBP to PDF conversion failed: {exc}") from exc
