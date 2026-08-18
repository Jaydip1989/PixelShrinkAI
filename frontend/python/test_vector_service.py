from pathlib import Path

from app.services.vector_service import raster_to_svg

input_path = Path("logo.png")
output_path = Path("logo-service.svg")

image_bytes = input_path.read_bytes()

svg = raster_to_svg(
    image_bytes,
    img_format="png"
)

output_path.write_text(svg, encoding="utf-8")

print(f"SVG created: {output_path}")
print(f"SVG size: {len(svg)} characters")