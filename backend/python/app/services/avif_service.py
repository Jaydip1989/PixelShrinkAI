import math
from io import BytesIO
from PIL import Image, ImageChops, ImageStat
import pillow_avif

# ---------------------------------------------------------
# Conversion configuration
# ---------------------------------------------------------

JPEG_QUALITY = 95
WEBP_QUALITY = 95

AVIF_QUALITIES = range(95, 25, -5)

PNG_MIN_PSNR = 30.0

# ---------------------------------------------------------
# Conversion exceptions
# ---------------------------------------------------------

class ConversionRejected(Exception):
    """ Raised when a conversion cannot satisfy the size requirement. """

# ---------------------------------------------------------
# AVIF -> JPG
# ---------------------------------------------------------

def _save_avif_to_jpg(image: Image.Image, input_size: int) -> bytes:
    if "A" in image.getbands():
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, (0, 0), rgba.getchannel("A"))
        image = background
    else:
        image = image.convert("RGB")

    for quality in range(JPEG_QUALITY, 25, -5):
        buffer = BytesIO()

        image.save(
            buffer,
            format="JPEG",
            quality = quality,
            optimize = True,
        )

        data = buffer.getvalue()

        if len(data) <= input_size:
            return data

    raise ConversionRejected(
        "JPG conversion would produce a file larger than the input."
    )

# ---------------------------------------------------------
# AVIF -> WEBP
# ---------------------------------------------------------

def _save_avif_to_webp(image: Image.Image, input_size:int) -> bytes:
    image = image.convert(
        "RGBA" if "A" in image.getbands() else "RGB"
    )

    for quality in range(WEBP_QUALITY, 25, -5):
        buffer = BytesIO()

        image.save(
            buffer,
            format='WEBP',
            quality = quality,
            method = 6,
        )
        data = buffer.getvalue()

        if len(data) <= input_size:
            return data

    raise ConversionRejected(
        "WEBP conversion would produce a file larger than the input."
    )

# ---------------------------------------------------------
# PNG quality measurement
# ---------------------------------------------------------

def _measure_png_psnr(source, candidate_data):
    """Measure candidate quality against the decoded AVIF source."""

    with Image.open(BytesIO(candidate_data)) as candidate:
        candidate.load()
        decoded = candidate.convert(source.mode)


    def rms_error(original, result):
        difference = ImageChops.difference(original, result)

        return(
            sum(ImageStat.Stat(difference).rms) / len(difference.getbands())
        )

    if source.mode == "RGBA":
        errors = []

        for color in ((255, 255, 255), (0, 0, 255),):
            background = Image.new("RGBA", source.size, color)

            original_visible = Image.alpha_composite(
                background, source
            ).convert("RGB")

            candidate_visible = Image.alpha_composite(
                background, decoded
            ).convert("RGB")

            errors.append(
                rms_error(original_visible, candidate_visible)
            )

        rms = sum(errors) / len(errors)

    else:
        rms = rms_error(source, decoded)

    if rms == 0:
        return float("inf")

    return 20 * math.log10(255.0 / rms)

# ---------------------------------------------------------
# AVIF -> PNG
# ---------------------------------------------------------

def _save_avif_to_png(image: Image.Image, input_size: int) -> bytes:
    """ Create the best-quality PNG candidate within the size limit. """

    has_alpha = "A" in image.getbands()

    source = image.convert(
        "RGBA" if has_alpha else "RGB"
    )

    best_lossless = None

    # First attempt lossless PNG compression.
    for level in range(10):
        buffer = BytesIO()

        source.save(
            buffer,
            format="PNG",
            compress_level = level,
            optimize=False,
        )

        data = buffer.getvalue()

        if len(data) <= input_size:
            if(
                best_lossless is None
                or len(data) < len(best_lossless)
            ):
                best_lossless = data

    if best_lossless is not None:
        return best_lossless

    # Test a range of palette sizes, including sizes below 32 colors.
    color_levels = (
        256, 224, 192, 160, 128, 112, 96, 80,
        64, 56, 48, 40, 36, 32, 28, 24,
        20, 18, 16, 14, 12, 10, 8, 6, 4, 2,
    )

    if has_alpha:
        methods = [
            ("FASTOCTREE", Image.Quantize.FASTOCTREE)
        ]
    else:
        methods = [
            ("FASTOCTREE", Image.Quantize.FASTOCTREE),
            ("MEDIANCUT", Image.Quantize.MEDIANCUT),
            ("MAXCOVERAGE", Image.Quantize.MAXCOVERAGE),
        ]

    candidates = []

    for method_name , method in methods:
        for colors in color_levels:
            for dither in (
                Image.Dither.NONE,
                Image.Dither.FLOYDSTEINBERG
            ):
                palette = source.quantize(
                    colors = colors,
                    method=method,
                    dither=dither,
                )

                buffer = BytesIO()

                palette.save(
                    buffer, format = "PNG", optimize = True,
                )

                data = buffer.getvalue()

                # Discard oversized outputs before measuring quality.
                if len(data) > input_size:
                    continue

                psnr = _measure_png_psnr(source, data)

                candidates.append(
                    (psnr, len(data), data, method_name, colors)
                )
    acceptable = [
        candidate for candidate in candidates if candidate[0] >= PNG_MIN_PSNR
    ]

    if not acceptable:
        raise ConversionRejected(
            "Could not create a PNG within the input size limit while meeting the minimum "
            "quality target of "
            f"{PNG_MIN_PSNR:.1f} dB."
        )
    best = max(
        acceptable,
        key = lambda candidate:(candidate[0], -candidate[1]),
    )

    return best[2]

# ---------------------------------------------------------
# JPG / PNG / WEBP -> AVIF
# ---------------------------------------------------------
def _save_image_to_avif(image: Image.Image, input_size:int) -> bytes:
    for quality in AVIF_QUALITIES:
        buffer = BytesIO()

        image.save(buffer, format="AVIF", quality=quality)

        data = buffer.getvalue()

        if len(data) <= input_size:
            return data


    raise ConversionRejected(
        "AVIF conversion would produce a file larger than the input."
    )

# ---------------------------------------------------------
# Public API : AVIF -> JPG / PNG / WEBP
# ---------------------------------------------------------

def convert_avif_to_image(input_data: bytes, output_format: str) -> bytes:
    """Convert AVIF to JPG, PNG, WEBP within the size requirement."""

    output_format = output_format.lower()

    if output_format not in {"jpg", "jpeg", "png", "webp"}:
        raise ValueError(
            f"Unsupported output format: {output_format}"
        )

    input_size = len(input_data)

    if input_size == 0:
        raise ValueError("Input AVIF file is empty.")

    with Image.open(BytesIO(input_data)) as image:
        if image.format != "AVIF":
            raise ValueError("Input is not AVIF image.")

        image.load()

        if output_format in {"jpg", "jpeg"}:
            output = _save_avif_to_jpg(image, input_size)

        elif output_format == "png":
            output = _save_avif_to_png(image, input_size)
        else:
            output = _save_avif_to_webp(image, input_size)

    if len(output) > input_size:
        raise ConversionRejected(
            f"{output_format.upper()} conversion would produce "
            "a file larger than the input."
        )
    return output

# ---------------------------------------------------------
# Public API : JPG / JPEG / PNG / WEBP -> AVIF
# ---------------------------------------------------------

def convert_image_to_avif(input_data: bytes) -> bytes:
    """Convert JPG, PNG or WEBP to AVIF within the size requirement."""

    input_size = len(input_data)

    if input_size == 0:
        raise ValueError("Input Image file is empty.")

    with Image.open(BytesIO(input_data)) as image:
        if image.format not in {"JPEG", "PNG" , "WEBP"}:
            raise ValueError(
                "Unsupported input image. "
                "Supported formats: JPG, PNG, WEBP."
            )
        image.load()
        return _save_image_to_avif(image, input_size)
