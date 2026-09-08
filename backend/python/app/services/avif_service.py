from io import BytesIO

from PIL import Image
import pillow_avif


JPEG_QUALITY = 95
WEBP_QUALITY = 95
AVIF_QUALITIES = range(95, 45, -5)
PNG_PALETTE_LEVELS = (256, 192, 128, 64, 32)


class ConversionRejected(Exception):
    """Raised when a conversion cannot satisfy the size requirement."""


def _save_avif_to_jpg(image: Image.Image) -> bytes:
    if "A" in image.getbands():
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        image = background
    else:
        image = image.convert("RGB")

    buffer = BytesIO()
    image.save(buffer, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return buffer.getvalue()


def _save_avif_to_webp(image: Image.Image) -> bytes:
    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

    buffer = BytesIO()
    image.save(buffer, "WEBP", quality=WEBP_QUALITY, method=6)
    return buffer.getvalue()


def _save_avif_to_png(image: Image.Image, input_size: int) -> bytes:
    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

    best_data = None
    best_size = float("inf")

    for level in range(10):
        buffer = BytesIO()
        image.save(
            buffer,
            "PNG",
            compress_level=level,
            optimize=False,
        )
        data = buffer.getvalue()

        if len(data) < best_size:
            best_data = data
            best_size = len(data)

    if best_size <= input_size:
        return best_data

    for colors in PNG_PALETTE_LEVELS:
        palette_image = image.quantize(
            colors=colors,
            method=Image.Quantize.FASTOCTREE,
            dither=Image.Dither.FLOYDSTEINBERG,
        )

        buffer = BytesIO()
        palette_image.save(buffer, "PNG", optimize=True)
        data = buffer.getvalue()

        if len(data) <= input_size:
            return data

    raise ConversionRejected(
        "PNG conversion would produce a file larger than the input."
    )


def _save_image_to_avif(
    image: Image.Image,
    input_size: int,
) -> bytes:
    for quality in AVIF_QUALITIES:
        buffer = BytesIO()

        image.save(
            buffer,
            "AVIF",
            quality=quality,
        )

        data = buffer.getvalue()

        if len(data) <= input_size:
            return data

    raise ConversionRejected(
        "AVIF conversion would produce a file larger than the input."
    )


def convert_avif_to_image(input_data: bytes, output_format: str) -> bytes:
    """Convert AVIF to JPG, PNG or WEBP under the size requirement."""
    output_format = output_format.lower()

    if output_format not in {"jpg", "jpeg", "png", "webp"}:
        raise ValueError(f"Unsupported output format: {output_format}")

    input_size = len(input_data)

    with Image.open(BytesIO(input_data)) as image:
        if output_format in {"jpg", "jpeg"}:
            output = _save_avif_to_jpg(image)
        elif output_format == "png":
            output = _save_avif_to_png(image, input_size)
        else:
            output = _save_avif_to_webp(image)

    if len(output) > input_size:
        raise ConversionRejected(
            f"{output_format.upper()} conversion would produce "
            "a file larger than the input."
        )

    return output


def convert_image_to_avif(input_data: bytes) -> bytes:
    """Convert JPG, PNG or WEBP to AVIF under the size requirement."""
    input_size = len(input_data)

    with Image.open(BytesIO(input_data)) as image:
        return _save_image_to_avif(image, input_size)