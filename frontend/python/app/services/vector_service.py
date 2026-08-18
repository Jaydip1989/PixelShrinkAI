import vtracer

def raster_to_svg(image_bytes: bytes, img_format: str = "png") -> str:
    """
    Convert raster image bytes into SVG using VTracer
    """
    return vtracer.convert_raw_image_to_svg(
        image_bytes,
        img_format=img_format
    )