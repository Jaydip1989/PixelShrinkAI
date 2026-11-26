from io import BytesIO
import base64

import vtracer
from PIL import Image
from scour import scour

import re
import xml.etree.ElementTree as ET

#---------------------------------------------------------
# JPEG -> SVG
#---------------------------------------------------------

JPEG_DEFAULT_QUALITY = 48
JPEG_MIN_QUALITY = 32
JPEG_QUALITY_STEP = 2

JPEG_EXTENSIONS = {".jpg", ".jpeg"}

def _optimize_jpeg(image_bytes: bytes, quality:int) -> bytes:
    with Image.open(BytesIO(image_bytes)) as image:
        if image.mode != "RGB":
            image = image.convert("RGB")

        buffer = BytesIO()

        image.save(
            buffer,
            format="JPEG",
            quality = quality,
            optimize = True
        )

        return buffer.getvalue()

def _create_jpeg_svg(
        jpeg_data: bytes,
        width:int,
        height:int,
) -> str:
    encoded = base64.b64encode(jpeg_data).decode("ascii")

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width = "{width}"
        height = "{height}"
        viewBox = "0 0 {width} {height}"
    >
    <image
        width="{width}"
        height="{height}"
        href="data:image/jpeg;base64,{encoded}"
        preserveAspectRatio="none"
        />
    </svg>
    """
    return svg

def _scour_svg(
        svg_text: str,
)-> str:
    options = scour.generateDefaultOptions()

    options.remove_metadata = True
    options.strip_xml_prolog = True
    options.enable_viewboxing = True
    options.shorten_ids = True
    options.simple_colors = True

    return scour.scourString(
        svg_text,
        options
    )

def _build_jpeg_svg(
        image_bytes: bytes,
        quality: int
) -> tuple[str, int]:
    with Image.open(
        BytesIO(image_bytes)
    ) as image:
        width, height = image.size

    optimized_image = _optimize_jpeg(
        image_bytes, quality,
    )

    svg_text = _create_jpeg_svg(
        optimized_image, width, height
    )

    svg_text = _scour_svg(
        svg_text,
    )

    svg_size = len(
        svg_text.encode("utf-8")
    )

    return svg_text, svg_size

def _jpeg_to_svg(
        image_bytes: bytes,
) -> str:
    original_size = len(image_bytes)

    selected_svg = None

    quality = JPEG_DEFAULT_QUALITY

    while quality >=JPEG_MIN_QUALITY:
        svg_text , svg_size = _build_jpeg_svg(
            image_bytes,
            quality
        )
        print(
            f"JPEG Q{quality}"
            f"SVG = {svg_size:,} bytes"
        )
        if svg_size <= original_size:
            selected_svg = svg_text
            break
        quality -= JPEG_QUALITY_STEP

    if selected_svg is None:
        raise ValueError(
            "JPEG -> SVG conversion could not produce "
            "an SVG equal to or smaller than the "
            "original JPEG within the allowed quality range."
        )
    return selected_svg
#---------------------------------------------------------
# WEBP -> SVG
#---------------------------------------------------------

WEBP_DEFAULT_QUALITY = 100
WEBP_MIN_QUALITY = 40
WEBP_QUALITY_STEP = 5

def _optimize_webp(
    image_bytes: bytes,
    quality: int
) -> bytes:

    with Image.open(
        BytesIO(image_bytes)
    ) as image:
        image = image.copy()

    buffer = BytesIO()

    image.save(
        buffer,
        format="WEBP",
        quality = quality,
        method = 6,
    )

    return buffer.getvalue()

def _create_webp_svg(
    webp_data: bytes,
    width: int,
    height: int,
) -> str:
    encoded = base64.b64encode(webp_data).decode("ascii")

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width = "{width}"
            height = "{height}"
            viewBox = "0 0 {width} {height}"
        >
        <image
            width="{width}"
            height="{height}"
            href="data:image/webp;base64,{encoded}"
            preserveAspectRatio="none"
            />
        </svg>
        """
    return svg

def _build_webp_svg(
    image_bytes: bytes,
    quality: int,
) -> tuple[str, int]:

    with Image.open(
        BytesIO(image_bytes)
    ) as image:
        width, height = image.size

    optimized_webp = _optimize_webp(
        image_bytes,
        quality,
    )

    svg_text = _create_webp_svg(
        optimized_webp,
        width,
        height
    )

    svg_text = _scour_svg(
        svg_text,
    )

    svg_size = len(
        svg_text.encode("utf-8")
    )

    return svg_text, svg_size

def _webp_to_svg(
    image_bytes: bytes,
) -> str:
    if not image_bytes:
        raise ValueError("The uploaded WEBP image is empty.")

    original_size = len(image_bytes)

    selected_svg = None
    selected_size = None

    quality = WEBP_DEFAULT_QUALITY

    for quality in range(WEBP_DEFAULT_QUALITY, 9, -5):
        svg_text, svg_size = _build_webp_svg(
            image_bytes,
            quality
        )
        print(
            f"WEBP Q{quality}:"
            f"SVG = {svg_size:,} bytes"
        )

        if svg_size <= original_size:
            if selected_size is None or svg_size < selected_size:
                selected_svg = svg_text
                selected_size = svg_size

    if selected_svg is None:
        raise ValueError(
            "WEBP -> SVG conversion could not produce an SVG "
            f"equal to or smaller than the original WEBP "
            f"({original_size:,} bytes)."
            "This image may be too small to convert within "
            "the required file-size limit."
        )
    return selected_svg

# ---------------------------------------------------------
# PNG -> SVG
# ---------------------------------------------------------
def _create_png_svg(
    png_data: bytes,
    width: int,
    height: int,
) -> str:
    encoded = base64.b64encode(png_data).decode("ascii")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="{width}"
        height="{height}"
        viewBox = "0 0 {width} {height}"
    >
        <image
            width="{width}"
            height="{height}"
            href="data:image/png;base64,{encoded}"
            preserveAspectRatio="none"
        />
    </svg>
    """

def _png_to_svg(image_bytes: bytes) -> str:
    if not image_bytes:
        raise ValueError("The uploaded PNG image is empty.")

    try:
        with Image.open(BytesIO(image_bytes)) as source:
            if source.format != "PNG":
                raise ValueError("The uploaded file is not a valid PNG image.")

            source.load()
            has_alpha = (
                source.mode in {"RGBA", "LA", "PA"}
                or "transparency" in source.info
            )
            image = source.convert("RGBA" if has_alpha else "RGB")

    except (OSError, ValueError) as exc:
        raise ValueError("The uploaded PNG image could not be read.") from exc

    original_size = len(image_bytes)

    def make_candidate(png_data: bytes) -> str | None:
        svg_text = _create_png_svg(
            png_data = png_data,
            width = image.width,
            height = image.height,
        )
        svg_text = _scour_svg(svg_text)

        if len(svg_text.encode("utf-8")) <= original_size:
            return svg_text
        return None

    # 1. Try loseless PNG re-encoding first.
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True, compress_level = 9)

    candidate = make_candidate(buffer.getvalue())
    if candidate is not None:
        return candidate

    # 2. if needed, try palette reduction from highest to lowest color count.
    # This can alter colors, so prefer the largest palette that fits.
    quantize_method = (
        Image.Quantize.FASTOCTREE
        if image.mode == "RGBA"
        else Image.Quantize.MEDIANCUT
    )
    for colors in (256, 192, 128, 96, 64, 48, 32, 24, 16, 8):
        for dither in (Image.Dither.NONE, Image.Dither.FLOYDSTEINBERG):
            quantize = image.quantize(
                colors=colors,
                method=quantize_method,
                dither=dither
            )
            buffer = BytesIO()
            quantize.save(
                buffer,
                format="PNG",
                optimize = True,
                compress_level = 9,
            )
            candidate = make_candidate(buffer.getvalue())
            if candidate is not None:
                return candidate
    raise ValueError(
        "PNG to SVG could not produce an SVG within the original file size. "
        "Try a simpler image or a smaller PNG."
    )

#---------------------------------------------------------
# PUBLIC RASTER -> SVG SERVICE
#---------------------------------------------------------

def raster_to_svg(
    image_bytes: bytes,
    img_format: str = "png",
) -> str:
    normalized_format = img_format.lower().lstrip(".")

    if not image_bytes:
        raise ValueError("The uploaded image is empty.")

    # ---------------------------------------------------------
    # JPEG / JPG
    # ---------------------------------------------------------
    if normalized_format in {"jpg", "jpeg"}:
        return _jpeg_to_svg(image_bytes)

    # ---------------------------------------------------------
    # WEBP
    # ---------------------------------------------------------
    if normalized_format == "webp":
        return _webp_to_svg(image_bytes)

    # ---------------------------------------------------------
    # Validate supported formats
    # ---------------------------------------------------------
    if normalized_format == "png":
        return _png_to_svg(image_bytes)

    raise ValueError(
        f"Unsupported raster format for SVG conversion: "
        f"{normalized_format}"
    )