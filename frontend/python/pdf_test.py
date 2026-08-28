from pathlib import Path
from io import BytesIO
from PIL import Image
from app.services.pdf_service import webp_to_pdf

SUPPORTED_EXTENSIONS = {
    ".webp",
}

def convert_and_measure(image_path: Path) -> tuple[bytes, dict]:
    source_bytes = image_path.read_bytes()

    pdf_bytes = webp_to_pdf(
        image_bytes=source_bytes,
    )

    with Image.open(BytesIO(source_bytes)) as image:
        metadata = {
            "name": image_path.name,
            "format":image.format,
            "mode":image.mode,
            "width":image.width,
            "height":image.height,
            "input_bytes": len(source_bytes),
            "pdf_bytes": len(pdf_bytes),
            "difference_bytes": len(pdf_bytes) - len(source_bytes),
            "difference_percent": (
                (len(pdf_bytes) - len(source_bytes)) 
                / len(source_bytes)
                * 100
            ),
        }

        return pdf_bytes, metadata

def main() -> None:
    test_dir = Path(__file__).parent / "test_images"
    output_dir = Path(__file__).parent / "pdf_test_output"
    output_dir.mkdir(exist_ok=True)

    image_paths = sorted(
        path for path in test_dir.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not image_paths:
        print(f"No WEBP files found in: {test_dir}")
        return

    print("\n PixelShrinkAI Image -> PDF benchmark")
    print("=" * 72)

    for image_path in image_paths:
        try:
            pdf_bytes, metadata = convert_and_measure(image_path)

            output_path = output_dir / f"{image_path.stem}.pdf"
            output_path.write_bytes(pdf_bytes)

            sign = "+" if metadata["difference_bytes"] >= 0 else ""

            print(f"\n{metadata['name']}")
            print(f"  Format:       {metadata['format']}")
            print(f"  Mode:         {metadata['mode']}")
            print(
                f"  Dimensions:   "
                f"{metadata['width']} × {metadata['height']}"
            )
            print(f"  Input:        {metadata['input_bytes']:,} bytes")
            print(f"  PDF:          {metadata['pdf_bytes']:,} bytes")
            print(
                f"  Difference:   "
                f"{sign}{metadata['difference_bytes']:,} bytes "
                f"({metadata['difference_percent']:+.2f}%)"
            )
            print(f"  Output:       {output_path}")

        except Exception as exc:
            print(f"\n{image_path.name}")
            print(f"  ERROR: {exc}")

    print("\n" + "=" * 72)
    print(f"PDF outputs: {output_dir}")


if __name__ == "__main__":
    main()



