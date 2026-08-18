from pathlib import Path

import vtracer

input_path = Path("logo.png")
output_path = Path("logo.svg")

image_bytes = input_path.read_bytes()

svg = vtracer.convert_raw_image_to_svg(
    image_bytes,
    img_format="png"
)

output_path.write_text(svg, encoding="utf-8")
print(f"SVG created: {output_path}")