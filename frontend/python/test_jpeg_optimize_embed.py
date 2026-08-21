from pathlib import Path
import base64

from PIL import Image


INPUT_DIR = Path("test_images")
OUTPUT_DIR = Path("jpeg_optimized_svg")

QUALITIES = [48]


def make_svg(jpeg_bytes: bytes, width: int, height: int) -> str:

    base64_data = base64.b64encode(
        jpeg_bytes
    ).decode("ascii")

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">\n'
        f'<image width="{width}" height="{height}" '
        f'href="data:image/jpeg;base64,{base64_data}" '
        'preserveAspectRatio="none"/>\n'
        '</svg>\n'
    )


def convert(image_path: Path) -> None:

    original_bytes = image_path.read_bytes()
    original_size = len(original_bytes)

    with Image.open(image_path) as image:

        width, height = image.size

        # Convert to RGB because JPEG does not support transparency.
        image = image.convert("RGB")

        print()
        print("=" * 70)
        print(f"IMAGE: {image_path.name}")
        print(f"Original JPEG: {original_size:,} bytes")
        print("=" * 70)

        for quality in QUALITIES:

            jpeg_path = (
                OUTPUT_DIR
                / f"{image_path.stem}_q{quality}.jpg"
            )

            svg_path = (
                OUTPUT_DIR
                / f"{image_path.stem}_q{quality}.svg"
            )

            OUTPUT_DIR.mkdir(exist_ok=True)

            # Create optimized JPEG.
            image.save(
                jpeg_path,
                format="JPEG",
                quality=quality,
                optimize=True,
            )

            optimized_bytes = jpeg_path.read_bytes()
            optimized_size = len(optimized_bytes)

            # Put optimized JPEG inside SVG.
            svg = make_svg(
                optimized_bytes,
                width,
                height,
            )

            svg_path.write_text(
                svg,
                encoding="utf-8",
            )

            svg_size = len(
                svg.encode("utf-8")
            )

            print(
                f"Q{quality:<3} "
                f"JPEG: {optimized_size:>8,} B "
                f"({optimized_size / original_size:.2f}x)   "
                f"SVG: {svg_size:>8,} B "
                f"({svg_size / original_size:.2f}x)"
            )


def main() -> None:

    jpg_files = sorted(
        path
        for path in INPUT_DIR.iterdir()
        if path.is_file()
        and path.suffix.lower()
        in {".jpg", ".jpeg"}
    )

    if not jpg_files:
        print("No JPEG/JPG files found.")
        return

    for image_path in jpg_files:
        convert(image_path)


if __name__ == "__main__":
    main()