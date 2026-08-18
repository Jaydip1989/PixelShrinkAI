from pathlib import Path
from time import perf_counter

from app.services.vector_service import raster_to_svg

INPUT_DIR = Path("test_images")
OUTPUT_DIR = Path("test_outputs")

def count_paths(svg:str) -> int:
    return svg.count("<path")

def test_image(input_path: Path) -> None:
    image_bytes = input_path.read_bytes()

    start_time = perf_counter()

    svg = raster_to_svg(
        image_bytes,
        img_format=input_path.suffix.lstrip(".").lower(),
    )

    elapsed = perf_counter() - start_time

    output_path = OUTPUT_DIR / f"{input_path.stem}.svg"
    output_path.write_text(svg, encoding="utf-8")

    input_size = input_path.stat().st_size
    output_size = output_path.stat().st_size
    path_count = count_paths(svg)

    size_ratio = output_size / input_size

    if output_size <= input_size:
        size_status = "PASS"
    else:
        size_status = "FAIL"

    print()
    print("="*60)
    print(f"Image:       {input_path.name}")
    print(f"Format:      {input_path.suffix.lstrip(".").upper()}")
    print(f"Input size:  {input_size:,} bytes")
    print(f"SVG size:    {output_size:,} bytes")
    print(f"Size ratio:  {size_ratio:.2f}x")
    print(f"SVG paths:   {path_count:,}")
    print(f"Conversion:  {elapsed:.3f} seconds")
    print(f"Size status:  {size_status}")
    print(f"Output:      {output_path}")  
    print("="*60)

def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    images = sorted(
        path for path in INPUT_DIR.iterdir() if path.is_file()
    )

    if not images:
        print("No test images found.")
        return

    for image_path in images:
        test_image(image_path)

if __name__ == "__main__":
    main()