from io import BytesIO
import base64

import vtracer
from PIL import Image
from scour import scour

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
    original_size = len(image_bytes)

    selected_svg = None

    quality = WEBP_DEFAULT_QUALITY

    while quality >= WEBP_MIN_QUALITY:
        svg_text , svg_size = _build_webp_svg(
            image_bytes,
            quality,
        )
        print(
            f"WEBP Q{quality}"
            f"SVG = {svg_size:,} bytes"
        )
        if svg_size <=original_size:
            selected_svg = svg_text
            break
        quality -= WEBP_QUALITY_STEP

    if selected_svg is None:
        raise ValueError(
            "WBEP -> SVG conversion could not produce "
            "an SVG equal to or smaller than the "
            "original JPEG within the allowed quality range."
        )
    return selected_svg
#---------------------------------------------------------
# PUBLIC RASTER -> SVG SERVICE
#---------------------------------------------------------

def raster_to_svg(
    image_bytes: bytes,
    img_format: str = "png",
) -> str:
    
     
    normalized_format = (
        img_format.lower().lstrip(".")
    )

    #---------------------------------------------------------
    # JPEG/JPG
    #---------------------------------------------------------
    if normalized_format in {
        "jpg", "jpeg"
    }:
        return _jpeg_to_svg(
            image_bytes
        )

    #---------------------------------------------------------
    # WEBP
    #---------------------------------------------------------
    if normalized_format == "webp":
        return _webp_to_svg(image_bytes)

    #---------------------------------------------------------
    # PNG -> SVG
    #---------------------------------------------------------
    return vtracer.convert_raw_image_to_svg(
        image_bytes,
        img_format = normalized_format,
    )