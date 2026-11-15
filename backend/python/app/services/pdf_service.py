from io import BytesIO
import math

import img2pdf
import pikepdf
from pikepdf import Array, Dictionary, Name, Pdf
from PIL import Image, ImageCms, ImageOps


# Strict maximum: 1.5 MB (decimal bytes).
PDF_TARGET_MAX_BYTES = 1_500_000

DEFAULT_MIN_JPEG_QUALITY = 50
DEFAULT_MAX_JPEG_QUALITY = 95

RASTER_JPEG_THRESHOLD_BYTES = 300 * 1024
PREFERRED_RASTER_PDF_BYTES = 200 * 1024

# --------------------------------------------------------------------------
# General PDF and image helpers
# --------------------------------------------------------------------------

def _encode_jpeg(
    image: Image.Image,
    quality: int,
    icc: bytes | None = None,
) -> bytes:
    """Encode an optimized progressive JPEG."""
    output = BytesIO()

    save_options = {
        "quality": quality,
        "optimize": True,
        "progressive": True,
    }

    if icc:
        save_options["icc_profile"] = icc

    image.save(output, format="JPEG", **save_options)
    return output.getvalue()


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
    """Flatten transparency onto white."""
    rgba = image.convert("RGBA")
    background = Image.new(
        "RGBA",
        rgba.size,
        (255, 255, 255, 255),
    )

    return Image.alpha_composite(
        background,
        rgba,
    ).convert("RGB")


def _valid_pdf_within_limit(
    pdf_bytes: bytes,
    original_size: int,
) -> bool:
    """Existing validation retained for PNG and WEBP."""
    return (
        pdf_bytes.startswith(b"%PDF-")
        and len(pdf_bytes) <= original_size
    )


def _valid_jpeg_pdf(
    pdf_bytes: bytes,
    max_bytes: int,
) -> bool:
    """Strict JPEG PDF validation."""
    return (
        pdf_bytes.startswith(b"%PDF-")
        and 0 < len(pdf_bytes) <= max_bytes
    )

def _validate_single_page_pdf(pdf_bytes: bytes) -> bytes:
    """Verify that a generated PDF opens and contains exactly one page"""
    try:
        with Pdf.open(BytesIO(pdf_bytes)) as pdf:
            if len(pdf.pages) != 1:
                raise ValueError(
                    "Generated PDF must contain exactly one page."
                )
    except Exception as exc:
        raise ValueError(
            "Generated PDF is structurally invalid or does not "
            "contain exactly one page."
        ) from exc
    return pdf_bytes

# --------------------------------------------------------------------------
# DPI and ICC colour management
# --------------------------------------------------------------------------

def _get_dpi(image: Image.Image) -> tuple[float, float]:
    """Read and validate horizontal and vertical DPI independently."""
    dpi = image.info.get("dpi", (72, 72))

    try:
        if isinstance(dpi, (int, float)):
            dpi_x = dpi_y = float(dpi)
        else:
            dpi_x = float(dpi[0])
            dpi_y = float(dpi[1])
    except (TypeError, ValueError, IndexError):
        return 72.0, 72.0

    if not math.isfinite(dpi_x) or dpi_x <= 0:
        dpi_x = 72.0

    if not math.isfinite(dpi_y) or dpi_y <= 0:
        dpi_y = 72.0

    return dpi_x, dpi_y


def _compatible_icc(
    icc: bytes | None,
    components: int,
) -> bytes | None:
    """Only attach ICC profiles matching the PDF image colour space."""
    if not icc or len(icc) < 20:
        return None

    expected_space = b"GRAY" if components == 1 else b"RGB "

    if icc[16:20] != expected_space:
        return None

    return icc


def _prepare_jpeg_image(
    image: Image.Image,
    icc: bytes | None,
) -> tuple[Image.Image, int, bytes | None]:
    """
    Prepare an image for JPEG encoding.

    Preserve compatible RGB and grayscale profiles.
    Convert CMYK to RGB using its ICC profile when possible.
    """
    if image.mode == "L":
        return image, 1, _compatible_icc(icc, 1)

    if image.mode == "RGB":
        return image, 3, _compatible_icc(icc, 3)

    if image.mode == "CMYK":
        if icc and icc[16:20] == b"CMYK":
            try:
                source_profile = ImageCms.ImageCmsProfile(
                    BytesIO(icc)
                )

                output_profile = ImageCms.createProfile("sRGB")

                converted = ImageCms.profileToProfile(
                    image,
                    source_profile,
                    output_profile,
                    outputMode="RGB",
                )

                output_icc = ImageCms.ImageCmsProfile(
                    output_profile
                ).tobytes()

                return converted, 3, output_icc

            except Exception:
                # Fall back safely if the supplied profile is unusable.
                pass

        return image.convert("RGB"), 3, None

    return image.convert("RGB"), 3, _compatible_icc(icc, 3)


# --------------------------------------------------------------------------
# Direct PDF construction using pikepdf
# --------------------------------------------------------------------------

def _build_jpeg_pdf(
    jpeg_bytes: bytes,
    width: int,
    height: int,
    components: int,
    icc: bytes | None,
    page_width: float,
    page_height: float,
) -> bytes:
    """
    Construct a single-page PDF with an embedded JPEG DCT stream.

    The JPEG is embedded directly without another image re-encoding.
    """
    pdf = Pdf.new()

    device_colour = (
        Name("/DeviceGray")
        if components == 1
        else Name("/DeviceRGB")
    )

    if icc:
        icc_stream = pdf.make_stream(icc)
        icc_stream["/N"] = components
        icc_stream["/Alternate"] = device_colour

        colour_space = Array([
            Name("/ICCBased"),
            icc_stream,
        ])
    else:
        colour_space = device_colour

    image_stream = pdf.make_stream(jpeg_bytes)

    image_stream["/Type"] = Name("/XObject")
    image_stream["/Subtype"] = Name("/Image")
    image_stream["/Width"] = width
    image_stream["/Height"] = height
    image_stream["/ColorSpace"] = colour_space
    image_stream["/BitsPerComponent"] = 8
    image_stream["/Filter"] = Name("/DCTDecode")

    page = pdf.add_blank_page(
        page_size=(page_width, page_height)
    )

    xobjects = Dictionary()
    xobjects["/Im0"] = image_stream

    resources = Dictionary()
    resources["/XObject"] = xobjects

    page.obj["/Resources"] = resources

    content = (
        f"q {page_width:.4f} 0 0 {page_height:.4f} "
        f"0 0 cm /Im0 Do Q"
    ).encode("ascii")

    page.contents_add(pdf.make_stream(content))

    output = BytesIO()

    pdf.save(
        output,
        object_stream_mode=pikepdf.ObjectStreamMode.generate,
    )

    return output.getvalue()


# --------------------------------------------------------------------------
# JPEG quality search
# --------------------------------------------------------------------------

def _find_best_jpeg_pdf(
    image: Image.Image,
    components: int,
    icc: bytes | None,
    page_width: float,
    page_height: float,
    max_bytes: int,
    min_quality: int,
    max_quality: int,
) -> tuple[int, bytes] | None:
    """
    Find the highest JPEG quality that satisfies the PDF size limit.

    Binary search is used first. Higher quality levels are then checked
    individually to protect against non-monotonic encoding sizes.
    """
    cache: dict[int, bytes] = {}

    def make_pdf(quality: int) -> bytes:
        if quality not in cache:
            jpeg = _encode_jpeg(image, quality, icc)

            cache[quality] = _build_jpeg_pdf(
                jpeg,
                image.width,
                image.height,
                components,
                icc,
                page_width,
                page_height,
            )

        return cache[quality]

    low = min_quality
    high = max_quality
    best: tuple[int, bytes] | None = None

    while low <= high:
        middle = (low + high) // 2
        candidate = make_pdf(middle)

        if _valid_jpeg_pdf(candidate, max_bytes):
            best = (middle, candidate)
            low = middle + 1
        else:
            high = middle - 1

    if best is None:
        # Binary search may miss a fitting value if encoded sizes
        # are not perfectly monotonic. Check all remaining qualities.
        for quality in range(max_quality, min_quality - 1, -1):
            candidate = make_pdf(quality)

            if _valid_jpeg_pdf(candidate, max_bytes):
                return quality, candidate

        return None

    # Check higher qualities individually before accepting the result.
    for quality in range(max_quality, best[0], -1):
        candidate = make_pdf(quality)

        if _valid_jpeg_pdf(candidate, max_bytes):
            return quality, candidate

    return best


# --------------------------------------------------------------------------
# JPEG to PDF conversion
# --------------------------------------------------------------------------

def jpeg_to_pdf(
    image_bytes: bytes,
    max_output_bytes: int | None = None,
) -> bytes:
    """
    Convert JPEG to PDF with a strict 1.5 MB maximum.

    Additional safeguard:
    PDF output must not exceed the original JPEG size.

    There is no minimum output size.
    Oversized PDFs are never returned.
    """
    try:
        if not image_bytes:
            raise ValueError("Input JPEG is empty.")

        original_size = len(image_bytes)

        if max_output_bytes is not None:
            if max_output_bytes <= 0:
                raise ValueError("PDF output limit must be positive.")

            max_bytes = min(
                PDF_TARGET_MAX_BYTES,
                max_output_bytes,
            )
        else:
            max_bytes = min(
                PDF_TARGET_MAX_BYTES,
                original_size,
            )

        with Image.open(BytesIO(image_bytes)) as source:
            if source.format != "JPEG":
                raise ValueError("Input is not a JPEG image.")

            source.load()

            original_icc = source.info.get("icc_profile")
            dpi_x, dpi_y = _get_dpi(source)

            orientation = source.getexif().get(274, 1)

            # Preserve the original JPEG stream if no pixel
            # orientation correction or colour conversion is needed.
            if (
                source.mode in ("RGB", "L")
                and orientation == 1
            ):
                components = 1 if source.mode == "L" else 3

                direct_icc = _compatible_icc(
                    original_icc,
                    components,
                )

                page_width = source.width * 72.0 / dpi_x
                page_height = source.height * 72.0 / dpi_y

                direct_pdf = _build_jpeg_pdf(
                    image_bytes,
                    source.width,
                    source.height,
                    components,
                    direct_icc,
                    page_width,
                    page_height,
                )

                if _valid_jpeg_pdf(direct_pdf, max_bytes):
                    return _validate_single_page_pdf(direct_pdf)

            # Bake EXIF orientation into actual pixels.
            image = ImageOps.exif_transpose(source).copy()

        # Rotating the image by 90 degrees also swaps its DPI axes.
        if orientation in (5, 6, 7, 8):
            dpi_x, dpi_y = dpi_y, dpi_x

        image, components, icc = _prepare_jpeg_image(
            image,
            original_icc,
        )

        full_width, full_height = image.size

        page_width = full_width * 72.0 / dpi_x
        page_height = full_height * 72.0 / dpi_y

        # First search at full resolution.
        scale = 1.0

        while True:
            if scale == 1.0:
                work = image
            else:
                work = image.resize(
                    (
                        max(1, round(full_width * scale)),
                        max(1, round(full_height * scale)),
                    ),
                    Image.Resampling.LANCZOS,
                )

            result = _find_best_jpeg_pdf(
                work,
                components,
                icc,
                page_width,
                page_height,
                max_bytes,
                DEFAULT_MIN_JPEG_QUALITY,
                DEFAULT_MAX_JPEG_QUALITY,
            )

            if result is not None:
                quality, pdf_bytes = result

                # Final independent validation before returning.
                # Final independent size and structural validation.
                if not _valid_jpeg_pdf(pdf_bytes, max_bytes):
                    raise ValueError(
                        "Final JPEG PDF failed size validation."
                    )

                return _validate_single_page_pdf(pdf_bytes)



            # No quality setting fits: estimate the resolution
            # reduction needed to reach the size target.
            minimum_jpeg = _encode_jpeg(
                work,
                DEFAULT_MIN_JPEG_QUALITY,
                icc,
            )

            minimum_pdf = _build_jpeg_pdf(
                minimum_jpeg,
                work.width,
                work.height,
                components,
                icc,
                page_width,
                page_height,
            )

            if work.width == 1 and work.height == 1:
                raise ValueError(
                    "JPEG-to-PDF conversion cannot meet the "
                    f"{max_bytes:,}-byte output limit, even at minimum resolution."
                )

            factor = math.sqrt(
                max_bytes / len(minimum_pdf)
            ) * 0.95

            # Always reduce dimensions, but avoid excessive jumps.
            factor = min(0.90, max(0.10, factor))

            next_scale = scale * factor

            if next_scale >= scale:
                next_scale = scale * 0.90

            scale = next_scale

    except Exception as exc:
        if isinstance(exc, ValueError):
            raise

        raise ValueError(
            f"JPEG to PDF conversion failed: {exc}"
        ) from exc

def _large_raster_to_pdf(
    image: Image.Image,
    original_size: int,
    icc: bytes | None = None,
) -> bytes:
    """Convert a large PNG/WEBP image using the adaptive JPEG engine."""

    # The output must be strictly smaller than the original upload.
    strict_limit = min(
        PDF_TARGET_MAX_BYTES,
        original_size - 1,
    )

    if strict_limit <= 0:
        raise ValueError("Original image is too small for PDF conversion.")

    preferred_limit = min(
        PREFERRED_RASTER_PDF_BYTES,
        strict_limit,
    )

    # Prepare an RGB image for the intermediate JPEG.
    prepared_image = image.convert("RGB")

    intermediate_jpeg = _encode_jpeg(
        prepared_image,
        DEFAULT_MAX_JPEG_QUALITY,
        _compatible_icc(icc, 3),
    )

    # First attempt: preferred output size.
    try:
        pdf_bytes = jpeg_to_pdf(
            intermediate_jpeg,
            max_output_bytes=preferred_limit,
        )

        if (
            _valid_jpeg_pdf(pdf_bytes, preferred_limit)
            and len(pdf_bytes) < original_size
        ):
            return _validate_single_page_pdf(pdf_bytes)

    except ValueError:
        pass

    # Second attempt: use the full permitted output size.
    try:
        pdf_bytes = jpeg_to_pdf(
            intermediate_jpeg,
            max_output_bytes=strict_limit,
        )

        if (
            _valid_jpeg_pdf(pdf_bytes, strict_limit)
            and len(pdf_bytes) < original_size
        ):
            return _validate_single_page_pdf(pdf_bytes)

    except ValueError:
        pass

    raise ValueError(
        "Conversion could not produce a valid PDF within "
        "the permitted file-size limit."
    )

def _jpeg_to_pdf(jpeg_bytes: bytes) -> bytes:
    return img2pdf.convert(jpeg_bytes)


def _jpeg_pdf_candidates(
    image: Image.Image,
    original_size: int,
    quality_levels: list[int],
) -> list[bytes]:
    """Retain the original first-eligible quality behaviour."""

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
    """Convert PNG using the size-based hybrid strategy."""

    try:
        if not image_bytes:
            raise ValueError("Input PNG is empty.")

        original_size = len(image_bytes)

        with Image.open(BytesIO(image_bytes)) as source:
            if source.format != "PNG":
                raise ValueError("Input is not a PNG image.")

            source.load()

            image = source.copy()
            transparent = _has_transparency(source)
            original_icc = source.info.get("icc_profile")

        # ----------------------------------------------------------
        # LARGE FILE: Use the adaptive JPEG conversion engine.
        # ----------------------------------------------------------
        if original_size >= RASTER_JPEG_THRESHOLD_BYTES:

            if transparent:
                # JPEG cannot preserve transparency.
                # Flatten transparent areas onto white.
                rgb_image = _flatten_to_rgb(image)
            else:
                rgb_image = image.convert("RGB")

            return _large_raster_to_pdf(
                rgb_image,
                original_size,
                original_icc,
            )

        # ----------------------------------------------------------
        # SMALL FILE: Preserve the existing PNG behaviour.
        # ----------------------------------------------------------
        if transparent:

            try:
                direct_pdf = img2pdf.convert(image_bytes)

                if _valid_pdf_within_limit(
                    direct_pdf,
                    original_size,
                ):
                    return _validate_single_page_pdf(direct_pdf)

            except Exception:
                pass

            # Flatten transparency only for JPEG fallback.
            rgb_image = _flatten_to_rgb(image)

        else:
            rgb_image = image.convert("RGB")

            # Compare Pillow-native and direct img2pdf approaches.
            candidates = []

            try:
                native_pdf = _pillow_png_to_pdf(image)

                if _valid_pdf_within_limit(
                    native_pdf,
                    original_size,
                ):
                    candidates.append(native_pdf)

            except Exception:
                pass

            try:
                direct_pdf = img2pdf.convert(image_bytes)

                if _valid_pdf_within_limit(
                    direct_pdf,
                    original_size,
                ):
                    candidates.append(direct_pdf)

            except Exception:
                pass

            if candidates:
                return _validate_single_page_pdf(
                    min(candidates, key=len)
                )

        # ----------------------------------------------------------
        # SMALL FILE FALLBACK: Existing quality sequence.
        # ----------------------------------------------------------
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
            return _validate_single_page_pdf(candidates[0])

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

        raise ValueError(
            f"PNG to PDF conversion failed: {exc}"
        ) from exc


def webp_to_pdf(image_bytes: bytes) -> bytes:
    """Convert WEBP using the size-based hybrid strategy."""

    try:
        if not image_bytes:
            raise ValueError("Input WEBP is empty.")

        original_size = len(image_bytes)

        with Image.open(BytesIO(image_bytes)) as source:
            if source.format != "WEBP":
                raise ValueError("Input is not a WEBP image.")

            source.load()

            image = source.copy()
            original_icc = source.info.get("icc_profile")

        # ----------------------------------------------------------
        # LARGE FILE: Use the adaptive JPEG conversion engine.
        # ----------------------------------------------------------
        if original_size >= RASTER_JPEG_THRESHOLD_BYTES:

            rgb_image = _flatten_to_rgb(image)

            return _large_raster_to_pdf(
                rgb_image,
                original_size,
                original_icc,
            )

        # ----------------------------------------------------------
        # SMALL FILE: Preserve the existing WEBP behaviour.
        # ----------------------------------------------------------
        rgb_image = _flatten_to_rgb(image)

        # Try Pillow-native PDF first.
        try:
            native_pdf = _pillow_png_to_pdf(rgb_image)

            if _valid_pdf_within_limit(
                native_pdf,
                original_size,
            ):
                return _validate_single_page_pdf(native_pdf)

        except Exception:
            pass

        # ----------------------------------------------------------
        # SMALL FILE FALLBACK: Existing quality range.
        # ----------------------------------------------------------
        candidates = _jpeg_pdf_candidates(
            rgb_image,
            original_size,
            list(range(95, 4, -1)),
        )

        if candidates:
            return _validate_single_page_pdf(candidates[0])

        raise ValueError(
            "WEBP-to-PDF conversion could not produce a valid PDF "
            "within the original WEBP file size."
        )

    except Exception as exc:
        if isinstance(exc, ValueError):
            raise

        raise ValueError(
            f"WEBP to PDF conversion failed: {exc}"
        ) from exc