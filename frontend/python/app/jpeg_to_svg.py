from pathlib import Path
from io import BytesIO
import base64

from PIL import Image
from scour import scour

# -----------------------------------------------------------------
# JPEG -> SVG ENGINE
# -----------------------------------------------------------------

DEFAULT_QUALITY = 48
MIN_QUALITY= 32
QUALITY_STEP = 2

JPEG_EXTENSIONS = {".jpg", ".jpeg"}

def optimize_jpeg(image_path: Path, quality:int) -> bytes:
    """
    Re-encode the source JPEG at requested quality
    """

    with Image.open(image_path) as image:
        if image.mode != "RGB":
            image = image.convert("RGB")

        buffer = BytesIO()

        image.save(
            buffer,
            format = "JPEG",
            quality = quality,
            optimize = True,
        )

        return buffer.getvalue()

def create_svg(
        jpeg_data: bytes,
        width: int,
        height: int
) -> str:

    """
    Create an SVG containing the optimized JPEG as a Base64 data URI
    """

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
        preserveAspectRatio = "none"
    />
</svg>

"""
    return svg

def scour_svg(svg_text: str) -> str:
    """
    Optimize the generated SVG using the Scour
    """
    options = scour.generateDefaultOptions()

    options.remove_metadata = True
    options.strip_xml_prolong = True
    options.enable_viewboxing = True
    options.shorten_ids = True
    options.simple_colors = True

    return scour.scourString(
        svg_text,
        options,
    )

def build_svg(
    image_path: Path,
    quality:int
) -> tuple[str, int]:
    
    """
    Build  and optimize an SVG for a specific JPEG quality

    Returns:
        SVG text
        SVG size in bytes
    """

    with Image.open(image_path) as image:
        width, height = image.size

    optimized_jpeg = optimize_jpeg(
        image_path,
        quality
    )

    svg_text = create_svg(
        optimized_jpeg,
        width,
        height,
    )

    svg_text = scour_svg(svg_text)

    svg_size = len(
        svg_text.encode("utf-8")
    )
    return svg_text, svg_size

def convert_jpeg_to_svg(
    input_path: str | Path,
    output_path: str | Path
) -> dict:
    """
    Convert JPEG/JPG -> SVG.
    The engine starts at Q48 and automatically lowers
    JPEG quality only when necessary.

    Quality range:
    Q48 -> Q46 -> Q44 -> Q42 .... -> Q32

    The first quality producing an SVG that is equal to or smaller 
    than the original JPEG is selcted.
    """

    input_path = Path(input_path)
    output_path = Path(output_path)

    # -----------------------------------------------------------------
    # Validate input
    # -----------------------------------------------------------------

    if input_path.suffix.lower() not in JPEG_EXTENSIONS:
        raise ValueError(
            "JPEG -> SVG engine accepts only .jpg and .jpeg files."
        )

    if not input_path.exists():
        raise FileNotFoundError(
            f"Input file not found: {input_path}"
        )

    # -----------------------------------------------------------------
    # Original JPEG size
    # -----------------------------------------------------------------

    original_size = input_path.stat().st_size

    # -----------------------------------------------------------------
    # Try qualities from Q48 down to Q32
    # -----------------------------------------------------------------

    selected_quality = None
    selected_svg = None
    selected_svg_size = None

    quality = DEFAULT_QUALITY

    while quality >= MIN_QUALITY:
        svg_text, svg_size = build_svg(
            input_path,
            quality
        )
        print(
            f"Q{quality}: "
            f"JPEG -> SVG = {svg_size:,} bytes"
        )

        if svg_size <= original_size:
            selected_quality = quality
            selected_svg = svg_text
            selected_svg_size = svg_size

            break

        quality -= QUALITY_STEP

    # -----------------------------------------------------------------
    # No acceptable result
    # -----------------------------------------------------------------

    if selected_svg is None:
        raise ValueError(
            "JPEG -> SVG conversion could not produce an SVG "
            "equal to or smaller than the original JPEG"
            "within the allowed quality range."
        )

    
    # -----------------------------------------------------------------
    # Write final SVG
    # -----------------------------------------------------------------

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path.write_text(
        selected_svg,
        encoding="utf-8"
    )

    # -----------------------------------------------------------------
    # Calculations reduction
    # -----------------------------------------------------------------

    reduction = (
        (original_size - selected_svg_size) / original_size * 100
    )

    # -----------------------------------------------------------------
    # Return conversion information
    # -----------------------------------------------------------------

    with Image.open(input_path) as image:
        width, height = image.size

    return {
        "input": str(input_path),
        "output": str(output_path),
        "width": width,
        "height": height,
        "quality": selected_quality,
        "original_size": original_size,
        "svg_size": selected_svg_size,
        "reduction_percent": reduction
    }

def main():
    input_path = Path("../test_images/GPTWallpaper_7.jpeg")
    output_path = Path("jpeg_svg_output/GPTWallpaper_7.svg")

    result = convert_jpeg_to_svg(
        input_path,
        output_path,
    )

    print()
    print("=" * 60)
    print("JPEG → SVG CONVERSION COMPLETE")
    print("=" * 60)
    print(f"Input:          {result['input']}")
    print(f"Output:         {result['output']}")
    print(f"Dimensions:     {result['width']} × {result['height']}")
    print(f"Quality:        Q{result['quality']}")
    print(f"Original size:  {result['original_size']:,} bytes")
    print(f"SVG size:       {result['svg_size']:,} bytes")
    print(
        f"Reduction:      "
        f"{result['reduction_percent']:.2f}%"
    )
    print("=" * 60)


if __name__ == "__main__":
    main()