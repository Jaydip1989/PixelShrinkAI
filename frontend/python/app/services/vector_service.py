import vtracer

JPEG_SETTINGS = {
    "hierarchical": "cutout",
    "mode":"polygon",
    "filter_speckle": 16,
    "color_precision":5,
    "layer_difference":48,
    "corner_threshold": 90,
    "length_threshold": 8.0,
    "max_iterations": 10,
    "splice_threshold":60,
    "path_precision":0
}


def raster_to_svg(image_bytes: bytes, img_format: str = "png") -> str:
    """
    Convert raster image bytes into SVG using VTracer
    """
    normalized_format = img_format.lower().lstrip(".")

    if normalized_format in {"jpg", "jpeg"}:
        return vtracer.convert_raw_image_to_svg(
            image_bytes,
            img_format="jpg",
            **JPEG_SETTINGS,
        )

    return vtracer.convert_raw_image_to_svg(
        image_bytes,
        img_format=normalized_format,
    )