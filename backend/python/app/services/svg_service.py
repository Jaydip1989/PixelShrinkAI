from pathlib import Path
import shutil
import subprocess
import uuid


OUTPUT_DIR = Path(__file__).parent / "svg-pdf-conversion"


def convert_svg_to_pdf(
    svg_path: Path,
    output_path: Path | None = None,
) -> dict:
    """Convert an SVG to PDF using Inkscape."""

    svg_path = Path(svg_path)

    if not svg_path.is_file():
        raise ValueError("The SVG input file does not exist.")

    if svg_path.suffix.lower() != ".svg":
        raise ValueError("SVG to PDF conversion requires an SVG file.")

    inkscape = shutil.which("inkscape")
    if not inkscape:
        raise RuntimeError(
            "Inkscape is not installed or is not available on PATH."
        )

    if output_path is None:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_path = OUTPUT_DIR / (
            f"{svg_path.stem}-{uuid.uuid4().hex}.pdf"
        )
    else:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        result = subprocess.run(
            [
                inkscape,
                str(svg_path),
                "--export-type=pdf",
                f"--export-filename={output_path}",
            ],
            capture_output=True,
            text=True,
            timeout=180,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        output_path.unlink(missing_ok=True)
        raise RuntimeError(
            "SVG to PDF conversion timed out."
        ) from exc

    if result.returncode != 0:
        output_path.unlink(missing_ok=True)
        details = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(
            "Inkscape could not convert this SVG."
            + (f" Details: {details[-1500:]}" if details else "")
        )

    if not output_path.is_file() or output_path.stat().st_size == 0:
        output_path.unlink(missing_ok=True)
        raise RuntimeError(
            "Inkscape did not produce a valid PDF file."
        )

    with output_path.open("rb") as pdf_file:
        if not pdf_file.read(5).startswith(b"%PDF-"):
            output_path.unlink(missing_ok=True)
            raise RuntimeError(
                "Inkscape produced an invalid PDF file."
            )

    return {
        "output": output_path,
        "engine": "Inkscape",
        "source_bytes": svg_path.stat().st_size,
        "output_bytes": output_path.stat().st_size,
    }
