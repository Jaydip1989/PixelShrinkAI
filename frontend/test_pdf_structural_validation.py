import sys
from io import BytesIO
from pathlib import Path
import struct
import zlib
from PIL import Image

# Import the actual PDF conversion functions.
sys.path.insert(
    0,
    str(
        Path(__file__).resolve().parent
        / "../backend/python"
    ),
)

from app.services.pdf_service import (
    jpeg_to_pdf,
    png_to_pdf,
    webp_to_pdf,
)

def make_image(
    image_format: str,
    size: tuple[int, int],
    target_bytes: int,
    transparent: bool = False,
) -> bytes:
    """Create a synthetic image with an approximate target file size."""

    mode = "RGBA" if transparent else "RGB"

    image = Image.new(
        mode,
        size,
        (120, 180, 100, 180) if transparent
        else (120, 180, 100),
    )

    # Add deterministic visual detail.
    pixels = image.load()

    for y in range(size[1]):
        for x in range(size[0]):
            value = (x * 7 + y * 13) % 80
            if transparent:
                pixels[x, y] = (
                    100 + value,
                    140 + value,
                    90 + value,
                    180,
                )
            else:
                pixels[x, y] = (
                    100 + value,
                    140 + value,
                    90 + value,
                )

    output = BytesIO()

    quality = 90

    while True:
        output.seek(0)
        output.truncate(0)

        if image_format == "PNG":
            image.save(
                output,
                format="PNG",
                compress_level=0,
            )
        else:
            image.save(
                output,
                format="WEBP",
                quality=quality,
                lossless=False,
            )

        data = output.getvalue()

        if len(data) >= target_bytes or quality <= 10:
            return data

        quality = max(10, quality - 5)


def pad_png_to_exact_size(
    image_bytes: bytes,
    target_bytes: int,
) -> bytes:
    """Add a valid PNG ancillary chunk to reach an exact file size."""

    if not image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Invalid PNG input.")

    # The IEND chunk type occupies bytes -8 to -4.
    if image_bytes[-8:-4] != b"IEND":
        raise ValueError("PNG IEND chunk not found.")

    padding_size = target_bytes - len(image_bytes)

    if padding_size < 12:
        raise ValueError("PNG padding target is too small.")

    payload_size = padding_size - 12

    # PNG text chunks require a keyword and null separator.
    if payload_size < 4:
        raise ValueError("Insufficient PNG text chunk space.")

    chunk_type = b"tEXt"
    payload = b"Pad\x00" + b"X" * (payload_size - 4)

    chunk_data = chunk_type + payload
    crc = zlib.crc32(chunk_data) & 0xFFFFFFFF

    chunk = (
        struct.pack(">I", payload_size)
        + chunk_data
        + struct.pack(">I", crc)
    )

    # Insert immediately before the IEND chunk.
    result = image_bytes[:-12] + chunk + image_bytes[-12:]

    assert len(result) == target_bytes

    return result



def pad_webp_to_exact_size(
    image_bytes: bytes,
    target_bytes: int,
) -> bytes:
    """Add a valid RIFF chunk to reach an exact WEBP file size."""

    if image_bytes[8:12] != b"WEBP":
        raise ValueError("Invalid WEBP input.")

    padding_size = target_bytes - len(image_bytes)

    if padding_size < 8 or padding_size % 2 != 0:
        raise ValueError(
            "WEBP target must allow an even-sized RIFF chunk."
        )

    payload_size = padding_size - 8

    chunk = (
        b"JUNK"
        + struct.pack("<I", payload_size)
        + b"X" * payload_size
    )

    result = image_bytes + chunk

    # RIFF size excludes the initial 8-byte header.
    result = (
        result[:4]
        + struct.pack("<I", len(result) - 8)
        + result[8:]
    )

    assert len(result) == target_bytes

    return result


def validate_pdf(
    pdf_bytes: bytes,
    original_size: int,
    label: str,
) -> None:
    import pikepdf

    with pikepdf.Pdf.open(BytesIO(pdf_bytes)) as pdf:
        page_count = len(pdf.pages)

    assert page_count == 1, (
        f"{label}: expected 1 page, got {page_count}"
    )

    assert len(pdf_bytes) < original_size, (
        f"{label}: PDF is not smaller than original image"
    )

    assert len(pdf_bytes) <= 1_500_000, (
        f"{label}: PDF exceeds 1,500,000 bytes"
    )

    print(
        f"PASS: {label} | "
        f"Input: {original_size:,} bytes | "
        f"PDF: {len(pdf_bytes):,} bytes | "
        f"Pages: {page_count}"
    )


def run_boundary_test(
    image_format: str,
    target_bytes: int,
) -> None:
    """Test conversion immediately around the 300 KB threshold."""

    base_image = make_image(
        image_format,
        (100, 100),
        1_000,
        False,
    )

    if image_format == "PNG":
        image_bytes = pad_png_to_exact_size(
            base_image,
            target_bytes,
        )
        pdf_bytes = png_to_pdf(image_bytes)

    elif image_format == "WEBP":
        image_bytes = pad_webp_to_exact_size(
            base_image,
            target_bytes,
        )
        pdf_bytes = webp_to_pdf(image_bytes)

    else:
        raise ValueError("Unsupported boundary-test format.")

    assert len(image_bytes) == target_bytes

    # Verify that Pillow can still decode the padded image.
    with Image.open(BytesIO(image_bytes)) as check:
        check.load()
        assert check.format == image_format

    expected_path = (
        "small"
        if target_bytes < 300 * 1024
        else "large"
    )

    label = (
        f"{image_format} boundary "
        f"{target_bytes:,} bytes ({expected_path} path)"
    )

    validate_pdf(
        pdf_bytes,
        len(image_bytes),
        label,
    )


def run_test(
    image_format: str,
    target_bytes: int,
    transparent: bool = False,
    size: tuple[int, int] = (1200, 900),
) -> None:
    image_bytes = make_image(
        image_format,
        size,
        target_bytes,
        transparent,
    )

    if image_format == "PNG":
        pdf_bytes = png_to_pdf(image_bytes)
    else:
        pdf_bytes = webp_to_pdf(image_bytes)

    label = (
        f"{image_format} "
        f"{'transparent' if transparent else 'opaque'} "
        f"{len(image_bytes):,} bytes"
    )

    if image_format == "PNG":
        if target_bytes < 300_000:
            assert len(image_bytes) < 300 * 1024, (
                "Expected PNG below the 300 KB threshold."
            )
        elif target_bytes > 300_000:
            assert len(image_bytes) >= 300 * 1024, (
                "Expected PNG above the 300 KB threshold."
            )

    validate_pdf(
        pdf_bytes,
        len(image_bytes),
        label,
    )

def run_jpeg_test(
    size: tuple[int, int],
    quality: int,
    label: str,
) -> None:
    """Test the dedicated JPEG-to-PDF conversion engine."""

    image = Image.effect_noise(size, 100).convert("RGB")

    output = BytesIO()
    image.save(
        output,
        format="JPEG",
        quality=quality,
        optimize=True,
    )

    image_bytes = output.getvalue()

    pdf_bytes = jpeg_to_pdf(image_bytes)

    validate_pdf(
        pdf_bytes,
        len(image_bytes),
        label,
    )



if __name__ == "__main__":
    print("\nTesting PNG and WEBP conversion...\n")

    tests = [
        ("PNG", 400_000, True, (1200, 900)),
        ("WEBP", 500_000, False, (1200, 900)),
        ("WEBP", 320_000, False, (1200, 900)),
    ]

    for test in tests:
        run_test(*test)

    print("\nTesting JPEG conversion engine...\n")

    run_jpeg_test(
        (640, 480),
        75,
        "JPEG test 1",
    )

    run_jpeg_test(
        (1600, 1200),
        95,
        "JPEG test 2",
    )

    run_jpeg_test(
        (3000, 2000),
        95,
        "JPEG test 3",
    )

    print("\nTesting exact PNG threshold...\n")

    for target in (
        307_199,
        307_200,
        307_201,
    ):
        run_boundary_test("PNG", target)

    print("\nTesting exact WEBP threshold...\n")

    for target in (
        307_198,
        307_200,
        307_202,
    ):
        run_boundary_test("WEBP", target)
    
    print("\nAll PDF structural tests completed.")
