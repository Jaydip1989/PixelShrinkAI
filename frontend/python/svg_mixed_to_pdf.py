from pathlib import Path
from io import BytesIO
import base64
import re
import zlib
import xml.etree.ElementTree as ET

from PIL import Image

# Reuse the already-proven pure-vector math/style/path implementation.
# This is intentionally benchmark-stage code; production consolidation comes later.
from svg_pure_vector_benchmark import (
    parse_number,
    attr,
    element_style,
    format_number,
    convert_path_data,
)

from svg_pure_vector_benchmark import convert_svg as convert_pure_vector_svg
from svg_embedded_to_pdf import convert_embedded_svg

BASE_DIR = Path(__file__).parent
BENCHMARK_DIR = BASE_DIR / "svg_pdf_benchmark"
OUTPUT_DIR = BASE_DIR / "svg_mixed_pdf"
WEBP_JPEG_QUALITY = 31

SUPPORTED_VECTOR_ELEMENTS = {
    "rect",
    "circle",
    "ellipse",
    "line",
    "polygon",
    "polyline",
    "path",
}


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def parse_svg(svg_path: Path) -> dict:
    """Parse an SVG while preserving document element order."""
    data = svg_path.read_text(encoding="utf-8", errors="ignore")
    root = ET.fromstring(data)

    width = parse_number(root.attrib.get("width"), 0)
    height = parse_number(root.attrib.get("height"), 0)

    viewbox = root.attrib.get("viewBox") or root.attrib.get("viewbox")
    if (not width or not height) and viewbox:
        values = re.findall(r"[-+]?(?:\d*\.\d+|\d+)", viewbox)
        if len(values) == 4:
            if not width:
                width = float(values[2])
            if not height:
                height = float(values[3])

    elements = []
    image_count = 0
    vector_count = 0
    unsupported = []

    for element in root.iter():
        if element is root:
            continue

        tag = local_name(element.tag)

        if tag == "image":
            image_count += 1
            elements.append(("image", dict(element.attrib)))
            continue

        if tag in SUPPORTED_VECTOR_ELEMENTS:
            vector_count += 1
            elements.append((tag, dict(element.attrib)))
            continue

        # Structural elements are traversed but do not become PDF operators.
        if tag in {"g", "defs", "svg", "title", "desc", "metadata"}:
            continue

        # Do not silently render unsupported visual elements.
        if tag in {"text", "use", "symbol", "clipPath", "mask", "pattern", "linearGradient", "radialGradient"}:
            unsupported.append(tag)

    if image_count and vector_count:
        classification = "MIXED RASTER + VECTOR"
    elif image_count:
        classification = "EMBEDDED RASTER"
    else:
        classification = "PURE VECTOR"

    return {
        "width": width or 100,
        "height": height or 100,
        "viewbox": viewbox,
        "elements": elements,
        "image_elements": image_count,
        "vector_elements": vector_count,
        "unsupported": sorted(set(unsupported)),
        "classification": classification,
    }

def _attrs_text(attrs: dict) -> str:
    """Convert ElementTree attributes to the format used by the proven vector helpers."""
    parts = []
    for key, value in attrs.items():
        key = local_name(key)
        parts.append(f'{key}="{value}"')
    return " ".join(parts)


def _data_uri(attrs: dict):
    href = None
    for key, value in attrs.items():
        key_name = local_name(key)
        if key_name == "href":
            href = value
            break

    if not href or not href.lower().startswith("data:image/"):
        raise ValueError("Mixed SVG contains an image without a supported embedded data URI.")

    match = re.match(r"data:image/([^;,]+)(?:;([^,]*))?,(.*)$", href, re.I | re.S)
    if not match:
        raise ValueError("Invalid embedded image data URI in SVG.")

    image_format = match.group(1).lower()
    metadata = (match.group(2) or "").lower()
    payload = match.group(3)

    if "base64" not in metadata:
        raise ValueError("Only base64 embedded raster images are supported in V1.")

    try:
        image_bytes = base64.b64decode(payload, validate=True)
    except Exception as exc:
        raise ValueError("Invalid base64 image data in SVG.") from exc

    return image_format, image_bytes


def _jpeg_bytes(image_bytes: bytes, quality: int = WEBP_JPEG_QUALITY) -> tuple[bytes, int, int]:
    with Image.open(BytesIO(image_bytes)) as image:
        width, height = image.size
        if image.mode != "RGB":
            image = image.convert("RGB")
        buffer = BytesIO()
        image.save(
            buffer,
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
        )
        return buffer.getvalue(), width, height


def _png_xobjects(image_bytes: bytes, image_obj: int, smask_obj: int | None):
    with Image.open(BytesIO(image_bytes)) as image:
        image = image.convert("RGBA")
        width, height = image.size
        raw = image.tobytes()

    rgb = bytearray()
    alpha = bytearray()
    for i in range(0, len(raw), 4):
        rgb.extend(raw[i:i + 3])
        alpha.append(raw[i + 3])

    rgb_compressed = zlib.compress(bytes(rgb), 9)
    alpha_compressed = zlib.compress(bytes(alpha), 9)

    objects = {}

    if smask_obj is not None:
        objects[smask_obj] = (
            f"<< /Type /XObject /Subtype /Image "
            f"/Width {width} /Height {height} "
            f"/ColorSpace /DeviceGray /BitsPerComponent 8 "
            f"/Filter /FlateDecode /Length {len(alpha_compressed)} >>\n"
            f"stream\n".encode()
            + alpha_compressed
            + b"\nendstream"
        )

    smask_ref = f" /SMask {smask_obj} 0 R" if smask_obj is not None else ""
    objects[image_obj] = (
        f"<< /Type /XObject /Subtype /Image "
        f"/Width {width} /Height {height} "
        f"/ColorSpace /DeviceRGB /BitsPerComponent 8 "
        f"/Filter /FlateDecode{smask_ref} "
        f"/Length {len(rgb_compressed)} >>\n"
        f"stream\n".encode()
        + rgb_compressed
        + b"\nendstream"
    )

    return objects, width, height


def _jpeg_xobject(jpeg_bytes: bytes, image_obj: int):
    with Image.open(BytesIO(jpeg_bytes)) as image:
        width, height = image.size

    objects = {
        image_obj: (
            f"<< /Type /XObject /Subtype /Image "
            f"/Width {width} /Height {height} "
            f"/ColorSpace /DeviceRGB /BitsPerComponent 8 "
            f"/Filter /DCTDecode /Length {len(jpeg_bytes)} >>\n"
            f"stream\n".encode()
            + jpeg_bytes
            + b"\nendstream"
        )
    }
    return objects, width, height


def _build_vector_commands(element_type: str, attrs: dict, page_height: float) -> list[str]:
    """Build commands for one vector element using the proven pure-vector engine."""
    attrs_string = _attrs_text(attrs)
    fill, stroke, stroke_width, style_commands = element_style(attrs_string)
    commands = list(style_commands)

    if element_type == "rect":
        x = parse_number(attr(attrs_string, "x", "0"))
        y = parse_number(attr(attrs_string, "y", "0"))
        width = parse_number(attr(attrs_string, "width", "0"))
        height = parse_number(attr(attrs_string, "height", "0"))
        commands.append(
            f"{format_number(x)} {format_number(y)} "
            f"{format_number(width)} {format_number(height)} re"
        )

    elif element_type == "line":
        x1 = parse_number(attr(attrs_string, "x1", "0"))
        y1 = parse_number(attr(attrs_string, "y1", "0"))
        x2 = parse_number(attr(attrs_string, "x2", "0"))
        y2 = parse_number(attr(attrs_string, "y2", "0"))
        commands.extend([
            f"{format_number(x1)} {format_number(y1)} m",
            f"{format_number(x2)} {format_number(y2)} l",
        ])

    elif element_type == "circle":
        cx = parse_number(attr(attrs_string, "cx", "0"))
        cy = parse_number(attr(attrs_string, "cy", "0"))
        radius = parse_number(attr(attrs_string, "r", "0"))
        k = 0.5522847498
        commands.extend([
            f"{format_number(cx + radius)} {format_number(cy)} m",
            f"{format_number(cx + radius)} {format_number(cy + k * radius)} "
            f"{format_number(cx + k * radius)} {format_number(cy + radius)} "
            f"{format_number(cx)} {format_number(cy + radius)} c",
            f"{format_number(cx - k * radius)} {format_number(cy + radius)} "
            f"{format_number(cx - radius)} {format_number(cy + k * radius)} "
            f"{format_number(cx - radius)} {format_number(cy)} c",
            f"{format_number(cx - radius)} {format_number(cy - k * radius)} "
            f"{format_number(cx - k * radius)} {format_number(cy - radius)} "
            f"{format_number(cx)} {format_number(cy - radius)} c",
            f"{format_number(cx + k * radius)} {format_number(cy - radius)} "
            f"{format_number(cx + radius)} {format_number(cy - k * radius)} "
            f"{format_number(cx + radius)} {format_number(cy)} c",
        ])

    elif element_type == "ellipse":
        cx = parse_number(attr(attrs_string, "cx", "0"))
        cy = parse_number(attr(attrs_string, "cy", "0"))
        rx = parse_number(attr(attrs_string, "rx", "0"))
        ry = parse_number(attr(attrs_string, "ry", "0"))
        k = 0.5522847498
        commands.extend([
            f"{format_number(cx + rx)} {format_number(cy)} m",
            f"{format_number(cx + rx)} {format_number(cy + k * ry)} "
            f"{format_number(cx + k * rx)} {format_number(cy + ry)} "
            f"{format_number(cx)} {format_number(cy + ry)} c",
            f"{format_number(cx - k * rx)} {format_number(cy + ry)} "
            f"{format_number(cx - rx)} {format_number(cy + k * ry)} "
            f"{format_number(cx - rx)} {format_number(cy)} c",
            f"{format_number(cx - rx)} {format_number(cy - k * ry)} "
            f"{format_number(cx - k * rx)} {format_number(cy - ry)} "
            f"{format_number(cx)} {format_number(cy - ry)} c",
            f"{format_number(cx + k * rx)} {format_number(cy - ry)} "
            f"{format_number(cx + rx)} {format_number(cy - k * ry)} "
            f"{format_number(cx + rx)} {format_number(cy)} c",
        ])

    elif element_type in {"polygon", "polyline"}:
        points = re.findall(r"[-+]?(?:\d*\.\d+|\d+)", attr(attrs_string, "points", ""))
        if len(points) < 4 or len(points) % 2:
            raise ValueError(f"Invalid {element_type} points data.")
        commands.append(f"{format_number(float(points[0]))} {format_number(float(points[1]))} m")
        for i in range(2, len(points), 2):
            commands.append(
                f"{format_number(float(points[i]))} {format_number(float(points[i + 1]))} l"
            )
        if element_type == "polygon":
            commands.append("h")

    elif element_type == "path":
        commands.extend(convert_path_data(attr(attrs_string, "d", ""), page_height))

    if fill and stroke:
        commands.append("B")
    elif fill:
        commands.append("f")
    elif stroke:
        commands.append("S")

    return commands


def _image_geometry(attrs: dict):
    x = parse_number(attrs.get("x", "0"), 0)
    y = parse_number(attrs.get("y", "0"), 0)
    width = parse_number(attrs.get("width", "0"), 0)
    height = parse_number(attrs.get("height", "0"), 0)

    if width <= 0 or height <= 0:
        raise ValueError("Embedded SVG image must have positive x/y/width/height geometry.")

    return x, y, width, height


def assemble_pdf(content: bytes, width: float, height: float, image_objects: dict, image_names: list[tuple[str, int]]):
    objects = {}

    content_obj = 4
    page_obj = 3

    xobject_entries = " ".join(
        f"/{name} {number} 0 R" for name, number in image_names
    )
    resources = f"<< /XObject << {xobject_entries} >> >>" if image_names else "<< >>"

    objects[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
    objects[2] = b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>"
    objects[3] = (
        f"<< /Type /Page /Parent 2 0 R "
        f"/MediaBox [0 0 {format_number(width)} {format_number(height)}] "
        f"/Resources {resources} /Contents {content_obj} 0 R >>"
    ).encode()
    objects[4] = (
        f"<< /Length {len(content)} >>\nstream\n".encode()
        + content
        + b"\nendstream"
    )
    objects.update(image_objects)

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]

    for number in sorted(objects):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n".encode())
        pdf.extend(objects[number])
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())

    pdf.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF".encode()
    )
    return bytes(pdf)


def convert_mixed_svg(svg_path: Path, output_path: Path | None = None) -> dict:
    svg = parse_svg(svg_path)

    if svg["classification"] != "MIXED RASTER + VECTOR":
        raise ValueError(
            f"Expected MIXED RASTER + VECTOR SVG, got {svg['classification']}."
        )

    if svg["unsupported"]:
        raise ValueError(
            "Unsupported SVG visual elements in V1: "
            + ", ".join(svg["unsupported"])
        )

    width = svg["width"]
    height = svg["height"]

    commands = [
        "q",
        f"1 0 0 -1 0 {format_number(height)} cm",
    ]

    image_objects = {}
    image_names = []
    next_object = 5
    image_index = 0

    for element_type, attrs in svg["elements"]:
        if element_type != "image":
            commands.extend(_build_vector_commands(element_type, attrs, height))
            continue

        image_format, image_bytes = _data_uri(attrs)
        x, y, image_width, image_height = _image_geometry(attrs)

        name = f"Im{image_index}"
        image_index += 1

        image_obj = next_object
        next_object += 1

        if image_format in {"jpg", "jpeg"}:
            objects, source_width, source_height = _jpeg_xobject(image_bytes, image_obj)
            image_objects.update(objects)

        elif image_format == "png":
            smask_obj = next_object
            next_object += 1
            objects, source_width, source_height = _png_xobjects(
                image_bytes,
                image_obj,
                smask_obj,
            )
            image_objects.update(objects)

        elif image_format == "webp":
            jpeg_bytes, source_width, source_height = _jpeg_bytes(image_bytes)
            objects, _, _ = _jpeg_xobject(jpeg_bytes, image_obj)
            image_objects.update(objects)

        else:
            raise ValueError(
                f"Unsupported embedded raster format in mixed SVG: {image_format}"
            )

        image_names.append((name, image_obj))

        # The global SVG->PDF Y flip means this matrix maps the SVG image box
        # directly into the PDF page while preserving document order.
        commands.extend([
            "q",
            f"{format_number(image_width)} 0 0 {format_number(image_height)} "
            f"{format_number(x)} {format_number(y)} cm",
            f"/{name} Do",
            "Q",
        ])

    commands.append("Q")
    content = "\n".join(commands).encode("ascii")

    pdf_data = assemble_pdf(
        content,
        width,
        height,
        image_objects,
        image_names,
    )

    output_path = output_path or OUTPUT_DIR / f"{svg_path.stem}.pdf"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(pdf_data)

    input_size = svg_path.stat().st_size
    output_size = len(pdf_data)
    difference = input_size - output_size
    reduction = (difference / input_size * 100) if input_size else 0

    return {
        "name": svg_path.name,
        "classification": svg["classification"],
        "image_elements": svg["image_elements"],
        "vector_elements": svg["vector_elements"],
        "input_bytes": input_size,
        "pdf_bytes": output_size,
        "difference_bytes": difference,
        "difference_percent": reduction,
        "output": output_path,
    }


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    svg_files = sorted(BENCHMARK_DIR.glob("*.svg"))

    if not svg_files:
        print(f"No SVG files found in {BENCHMARK_DIR}")
        return

    print()
    print("SVG -> PDF BENCHMARK")
    print("=" * 72)

    for svg_path in svg_files:
        print()
        print(svg_path.name)

        try:
            info = parse_svg(svg_path)

            print(
                f"  Classification : "
                f"{info['classification']}"
            )

            print(
                f"  Raster images  : "
                f"{info['image_elements']}"
            )

            print(
                f"  Vector elements: "
                f"{info['vector_elements']}"
            )

            if info["unsupported"]:
                print(
                    "  Unsupported    : "
                    + ", ".join(info["unsupported"])
                )

            # ---------------------------------------------------------
            # EMBEDDED RASTER SVG
            # ---------------------------------------------------------

            if info["classification"] == "EMBEDDED RASTER":

                output_path = (
                    OUTPUT_DIR / f"{svg_path.stem}.pdf"
                )

                convert_embedded_svg(
                    svg_path,
                    output_path
                )

                input_size = svg_path.stat().st_size
                output_size = output_path.stat().st_size
                difference = input_size - output_size
                reduction = (
                    difference / input_size
                ) * 100

                print(
                    f"  Input SVG      : "
                    f"{input_size:,} bytes"
                )

                print(
                    f"  Output PDF     : "
                    f"{output_size:,} bytes"
                )

                print(
                    f"  Difference     : "
                    f"{difference:,} bytes"
                )

                print(
                    f"  Reduction      : "
                    f"{reduction:.2f}%"
                )

                print(
                    f"  Output         : "
                    f"{output_path}"
                )

                if output_size <= input_size:
                    print(
                        "  SIZE RESULT    : "
                        "PASS — PDF <= input SVG"
                    )
                else:
                    print(
                        "  SIZE RESULT    : "
                        "REJECT — PDF > input SVG"
                    )

            # ---------------------------------------------------------
            # PURE VECTOR SVG
            # ---------------------------------------------------------

            elif info["classification"] == "PURE VECTOR":

                result = convert_pure_vector_svg(
                    svg_path
                )

                print(
                    f"  Input SVG      : "
                    f"{result['svg_size']:,} bytes"
                )

                print(
                    f"  Output PDF     : "
                    f"{result['pdf_size']:,} bytes"
                )

                print(
                    f"  Difference     : "
                    f"{result['difference']:,} bytes"
                )

                print(
                    f"  Reduction      : "
                    f"{result['reduction']:.2f}%"
                )

                print(
                    f"  Output         : "
                    f"{result['output']}"
                )

                if result["pdf_size"] <= result["svg_size"]:
                    print(
                        "  SIZE RESULT    : "
                        "PASS — PDF <= input SVG"
                    )
                else:
                    print(
                        "  SIZE RESULT    : "
                        "REJECT — PDF > input SVG"
                    )

            # ---------------------------------------------------------
            # MIXED RASTER + VECTOR SVG
            # ---------------------------------------------------------

            elif (
                info["classification"]
                == "MIXED RASTER + VECTOR"
            ):

                result = convert_mixed_svg(
                    svg_path
                )

                print(
                    f"  Input SVG      : "
                    f"{result['input_bytes']:,} bytes"
                )

                print(
                    f"  Output PDF     : "
                    f"{result['pdf_bytes']:,} bytes"
                )

                print(
                    f"  Difference     : "
                    f"{result['difference_bytes']:,} bytes"
                )

                print(
                    f"  Reduction      : "
                    f"{result['difference_percent']:.2f}%"
                )

                print(
                    f"  Output         : "
                    f"{result['output']}"
                )

                if (
                    result["pdf_bytes"]
                    <= result["input_bytes"]
                ):
                    print(
                        "  SIZE RESULT    : "
                        "PASS — PDF <= input SVG"
                    )
                else:
                    print(
                        "  SIZE RESULT    : "
                        "REJECT — PDF > input SVG"
                    )

        except Exception as exc:
            print(
                f"  ERROR          : "
                f"{exc}"
            )


if __name__ == "__main__":
    main()