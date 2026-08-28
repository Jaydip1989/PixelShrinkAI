from io import BytesIO
from PIL import Image
import img2pdf


def png_to_pdf(image_bytes: bytes) -> bytes:
    try:
        with Image.open(BytesIO(image_bytes)) as source:
            if source.format != "PNG":
                raise ValueError("Input is not a PNG image.")

            source.load()
            image = source.copy()

            output = BytesIO()

            image.save(output, format="PDF", resolution=96)

            return output.getvalue()
        
    except Exception as exc:
        raise ValueError(
            f"PNG to PDF conversion failed: {exc}"
        ) from exc

def _encode_jpeg(image: Image.Image, quality: int) -> bytes:
    output = BytesIO()
    image.save(
        output, 
        format="JPEG",
        quality = quality,
        optimize = True,
        progressive = True,
    )

    return  output.getvalue()

def _jpeg_to_pdf(jpeg_bytes: bytes) -> bytes:
    return img2pdf.convert(jpeg_bytes)

def jpeg_to_pdf(image_bytes: bytes) -> bytes:
    try:
        with Image.open(BytesIO(image_bytes)) as source:
            if source.format not in {"JPEG", "JPG"}:
                raise ValueError("Input is not a JPEG image.")

            source.load()

            image = source.copy()


        original_size = len(image_bytes)

        direct_pdf = _jpeg_to_pdf(image_bytes)

        if len(direct_pdf) <= original_size:
            return direct_pdf

        quality_levels = [95, 93, 91, 89, 87, 85, 83, 80, 77, 74, 70, 65, 60, 55, 50, 45, 40, 35, 32]

        for quality in quality_levels:
            candidate_jpeg = _encode_jpeg(
                image, quality
            )

            candidate_pdf = _jpeg_to_pdf(
                candidate_jpeg
            )

            if len(candidate_pdf) <= original_size:
                return candidate_pdf

        raise ValueError(
            "Unable to produce a JPEG-to-PDF result that is "
            "equal to or smaller than the original JPEG "
            "without excessive quality reduction."
        )
    except Exception as exc:
        if isinstance(exc, ValueError):
            raise

        raise ValueError(
            f"JPEG to PDF conversion failed: {exc}"
        ) from exc


def webp_to_pdf(image_bytes: bytes) -> bytes:
    original_size = len(image_bytes)

    if original_size == 0:
        raise ValueError("Input WEBP is empty. ")
    
    try:
        with Image.open(BytesIO(image_bytes)) as source:
            if source.format != "WEBP":
                raise ValueError("Input is not a WEBP image.")

            source.load()
            image = source.convert("RGB")

        direct_output = BytesIO()

        image.save(
            direct_output, format="PDF", resolution=96
        )
        direct_pdf = direct_output.getvalue()

        if len(direct_pdf) <= original_size:
            return direct_pdf

        for quality in range(95, 29, -1):
           jpeg_output = BytesIO()

           image.save(jpeg_output, format="JPEG", quality = quality, 
                      optimize = True, progressive=True)

           jpeg_bytes = jpeg_output.getvalue()
           pdf_bytes = img2pdf.convert(jpeg_bytes)

           if len(pdf_bytes) <= original_size:
               return pdf_bytes

        raise ValueError(
            "Unable to produce a WEBP-to-PDF result that is "
            "equal to or smaller than the original WEBP "
            "without excessive quality reduction."
        )

    except Exception as exc:
        if isinstance(exc, ValueError):
            raise

        raise ValueError(
            f"WEBP to PDF conversion failed: {exc}"
        ) from exc


