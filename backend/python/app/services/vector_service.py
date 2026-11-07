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
    if normalized_format != "png":
        raise ValueError(
            f"Unsupported raster format for SVG conversion: "
            f"{normalized_format}"
        )

    original_size = len(image_bytes)

    # ---------------------------------------------------------
    # PNG -> SVG: progressively simpler tracing profiles
    # ---------------------------------------------------------
    trace_profiles = [
        {
            "color_precision": 6,
            "filter_speckle": 4,
            "length_threshold": 4.0,
            "path_precision": 3,
        },
        {
            "color_precision": 5,
            "filter_speckle": 6,
            "length_threshold": 5.0,
            "path_precision": 2,
        },
        {
            "color_precision": 4,
            "filter_speckle": 8,
            "length_threshold": 6.0,
            "path_precision": 2,
        },
        {
            "color_precision": 3,
            "filter_speckle": 12,
            "length_threshold": 8.0,
            "path_precision": 1,
        },
    ]

    smallest_size = None

    for profile in trace_profiles:
        svg_text = vtracer.convert_raw_image_to_svg(
            image_bytes,
            img_format="png",
            **profile,
        )

        # Verify that the output is well-formed XML.
        try:
            ET.fromstring(svg_text)
        except ET.ParseError as exc:
            print("Invalid SVG XML:", exc)
            raise ValueError(
                "VTracer produced malformed SVG XML."
            ) from exc

        # Diagnostic check for the path reported by the browser.
        suspicious_paths = re.findall(
            r'<path\b[^>]*\bd="([^"]*)"',
            svg_text,
        )

        for path_data in suspicious_paths:
            if "M5 1314 4L19 7" in path_data:
                print(
                    "Suspicious SVG path:",
                    repr(path_data),
                )

        svg_size = len(svg_text.encode("utf-8"))

        print(
            f"PNG trace profile {profile}: "
            f"SVG = {svg_size:,} bytes"
        )

        if smallest_size is None or svg_size < smallest_size:
            smallest_size = svg_size

        # Never return an SVG larger than the original PNG.
        if svg_size <= original_size:
            return svg_text

    raise ValueError(
        "PNG -> SVG conversion could not produce an SVG "
        f"within the original file size ({original_size:,} bytes). "
        f"The smallest attempted output was {smallest_size:,} bytes. "
        "Try a simpler image or a smaller PNG."
    )
