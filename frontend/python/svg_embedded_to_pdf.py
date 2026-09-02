from pathlib import Path
import base64
import io, re
from PIL import Image
 
BASE_DIR = Path(__file__).parent
BENCHMARK_DIR = BASE_DIR / "svg_pdf_benchmark"
OUTPUT_DIR = BASE_DIR /"svg_embedded_pdf"
WEBP_JPEG_QUALITY = 31 

def parse_svg(svg_path):
    data = svg_path.read_text(encoding="utf-8", errors="ignore")
    svg_match = re.search(r"<svg\b([^>]*)>", data, re.I | re.S)
    attrs = svg_match.group(1) if svg_match else ""

    def number(name):
        match = re.search(rf'\b{name}\s*=\s*["\']([^"\']+)["\']', attrs, re.I)
        if not match:
            return None
        value = re.sub(r"[^0-9.+-]", "", match.group(1))
        return float(value) if value else None

    width = number("width")
    height = number("height")

    if width is None or height is None:
        viewbox = re.search(
            r'\bviewBox\s*=\s*["\']([^"\']+)["\']', attrs, re.I
        )
        if viewbox:
            values = re.findall(r"[-+]?(?:\d*\.\d+|\d+)", viewbox.group(1))
            if len(values) == 4:
                width = width or float(values[2])
                height = height or float(values[3])

    image_matches = list(re.finditer(
        r'(?:href|xlink:href)\s*=\s*["\']data:image/([^;,]+)(?:;[^,]*)?,([^"\']+)["\']', data, re.I
    ))

    image_elements = len(re.findall(r"<image\b", data, re.I))

    vector_elements = len(re.findall(
        r"<(?:path|rect|circle|ellipse|line|polyline|polygon|text|g|use|symbol)\b", data, re.I
    ))

    if image_matches:
        embedded_format = image_matches[0].group(1).lower()
        embedded_data = base64.b64decode(image_matches[0].group(2))
        classification = (
            "MIXED RASTER + VECTOR"
            if vector_elements else "EMBEDDED RASTER"
        )
    else:
        embedded_format = None
        embedded_data = None
        classification = "PURE VECTOR"

    return {
        "width":width,
        "height":height,
        "format":embedded_format,
        "data": embedded_data,
        "image_elements": image_elements,
        "vector_elements": vector_elements,
        "classification": classification
    }


def pdf_object(objects, number, value):
    objects[number] = value

def build_jpeg_pdf(jpeg_data, image_width, image_height, page_width, page_height):
    content = (
        f"q {page_width:g} 0 0 {page_height:g} 0 0 cm /Im0 Do Q"
    ).encode()
    objects = {
        1:b"<< /Type /Catalog /Pages 2 0 R >>",
        2:b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        3:(
            f"<< /Type /Page /Parent 2 0 R "
            f"/Mediabox [0 0 {page_width:g} {page_height:g}] "
            f"/Resources << /XObject << /Im0 5 0 R >> >>"
            f"/Contents 4 0 R >>"
        ).encode(),
        4:(
            f"<< /Length {len(content)} >>\nstream\n".encode() + content + b"\nendstream"
        ),
        5:(
            f"<<  /Type /XObject /Subtype /Image "
            f"/Width {image_width} /Height {image_height} "
            f"/ColorSpace /DeviceRGB /BitsPerComponent 8 "
            f"/Filter /DCTDecode /Length {len(jpeg_data)} >>\n"
            f"stream\n".encode()
            + jpeg_data + b"\nendstream"
        ),
    }
    return assemble_pdf(objects)

def build_png_pdf(image, page_width, page_height):
    image = image.convert("RGBA")
    width, height = image.size
    raw = image.tobytes("raw", "RGBA")

    rgb = bytearray()
    alpha = bytearray()

    for i in range(0, len(raw), 4):
        rgb.extend(raw[i:i+3])
        alpha.append(raw[i+3])

    rgb_compressed = __import__("zlib").compress(bytes(rgb), 9)
    alpha_compressed = __import__("zlib").compress(bytes(alpha), 9)

    objects = {
        1:b"<< /Type /Catalog /Pages 2 0 R >>",
        2:b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        3:(
            f"<< /Type /Page /Parent 2 0 R "
            f"/Mediabox [0 0 {page_width:g} {page_height:g}] "
            f"/Resources << /XObject << /Im0 5 0 R >> >>"
            f"/Contents 4 0 R >>"
        ).encode(),
    }

    content = (
        f"q {page_width:g} 0 0 {page_height:g} 0 0 cm /Im0 Do Q"
    ).encode()

    objects[4] = (
        f"<< /Length {len(content)} >> \nstream\n".encode() + content + b"\nendstream"
    )

    objects[6] = (
        f"<<  /Type /XObject /Subtype /Image "
        f"/Width {width} /Height {height}"
        f"/ColorSpace /DeviceRGB /BitsPerComponent 8 "
        f"/Filter /FlateDecode /Length {len(alpha_compressed)} >>\n"
        f"stream\n".encode()
        + alpha_compressed + b"\nendstream"
    )

    objects[5] = (
        f"<<  /Type /XObject /Subtype /Image "
        f"/Width {width} /Height {height} "
        f"/ColorSpace /DeviceRGB /BitsPerComponent 8 "
        f"/SMask 6 0 R /Filter /FlateDecode "
        f"/Length {len(rgb_compressed)} >>\n "
        f"stream\n".encode()
        + rgb_compressed + b"\nendstream"
    )

    return assemble_pdf(objects)

def assemble_pdf(objects):
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

def convert_embedded_svg(svg_path, output_path = None):
    info = parse_svg(svg_path)

    if info["classification"] == "PURE VECTOR":
        raise ValueError("PURE VECTOR SVG: use the pure-vector converter.")
    if info["classification"] == "MIXED RASTER + VECTOR":
        raise ValueError(
            "MIXED RASTER + VECTOR SVG: conversion is not implemented here yet."
        )

    fmt = info["format"]
    image_data = info["data"]

    if not image_data:
        raise ValueError("Embedded raster data not found")

    image = Image.open(io.BytesIO(image_data))
    image_width, image_height = image.size
    page_width = info["width"] or image_width
    page_height = info["height"] or image_height

    if fmt in ("jpeg", "jpg"):
        pdf_data = build_jpeg_pdf(
            image_data, image_width, image_height, page_width, page_height
        )

    elif fmt == "png":
        pdf_data = build_png_pdf(
            image, page_width, page_height
        )

    elif fmt == "webp":
        image = image.convert("RGB")
        buffer = io.BytesIO()
        image.save(
            buffer,
            format = "JPEG",
            quality = WEBP_JPEG_QUALITY,
            optimize = True,
            progressive = False
        )
        pdf_data = build_jpeg_pdf(
            buffer.getvalue(),
            image_width,
            image_height,
            page_width,
            page_height
        )

    else:
        raise ValueError(f"Unsupported embedded image format: {fmt}")

    output_path = output_path or OUTPUT_DIR / f"{svg_path.stem}.pdf"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(pdf_data)

    svg_size = svg_path.stat().st_size
    pdf_size = len(pdf_data)

    return {
        "svg_size": svg_size,
        "pdf_size":pdf_size,
        "difference":svg_size - pdf_size,
        "reduction":(svg_size - pdf_size) / svg_size * 100,
        "format":fmt,
        "classification":info["classification"],
        "output": output_path
    }

def main():
    print("=" * 78)
    print("PixelShrinkAI - Embedded SVG -> PDF Converter")
    print("=" * 78)
    print(f"Benchmark directory: {BENCHMARK_DIR}")
    print(f"Output directory:    {OUTPUT_DIR}")
    print("=" * 78)

    svg_files = sorted(BENCHMARK_DIR.glob("*.svg"))

    for svg_path in svg_files:
        try:
            result = convert_embedded_svg(svg_path)

            print(f"\n{svg_path.name}")
            print("-" * 78)
            print(f"Classification:  {result['classification']}")
            print(f"Embedded format: {result['format']}")
            print(f"SVG size:        {result['svg_size']:,} bytes")
            print(f"PDF size:        {result['pdf_size']:,} bytes")
            print(f"Difference:      {result['difference']:+,} bytes")
            print(f"Reduction:       {result['reduction']:+.2f}%")
            print(
                "Status:           "
                + ("PASS — PDF <= SVG" if result["pdf_size"] <= result["svg_size"]
                   else "NEEDS OPTIMIZATION")
            )
            print(f"Output:          {result['output']}")

        except ValueError as error:
            info = parse_svg(svg_path)

            if info["classification"] in (
                "PURE VECTOR",
                "MIXED RASTER + VECTOR",
            ):
                print(f"\n{svg_path.name}")
                print("-" * 78)
                print(f"Classification:  {info['classification']}")
                print(f"Result:          SKIPPED — {error}")


if __name__ == "__main__":
    main()
