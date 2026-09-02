from pathlib import Path
import re
import math


BASE_DIR = Path(__file__).parent
BENCHMARK_DIR = BASE_DIR / "svg_pdf_benchmark"
OUTPUT_DIR = BASE_DIR / "svg_pure_vector_pdf"

def parse_number(value, default = 0.0):
    match = re.search(r"[-+]?(?:\d*\.\d+|\d+)", str(value))
    return float(match.group()) if match else default

def parse_svg(svg_path):
    data = svg_path.read_text(encoding="utf-8", errors = "ignore")

    svg_match = re.search(r"<svg\b([^>]*)>", data, re.I | re.S)
    attrs = svg_match.group(1) if svg_match else ""

    width_match = re.search(
        r'\bwidth\s*=\s*["\']([^"\']+)["\']', attrs, re.I
    )

    height_match = re.search(
        r'\bheight\s*=\s*["\']([^"\']+)["\']', attrs, re.I
    )

    viewbox_match = re.search(
        r'\bviewBox\s*=\s*["\']([^"\']+)["\']', attrs, re.I
    )

    width = parse_number(width_match.group(1) if width_match else None)
    height = parse_number(height_match.group(1)) if height_match else None

    viewbox = None
    if viewbox_match:
        values = re.findall(
            r"[-+]?(?:\d*\.\d+|\d+)",
            viewbox_match.group(1)
        )

        if len(values) == 4:
            viewbox = tuple(float(v) for v in values)

            if width is None:
                width = viewbox[2]
            if height is None:
                height = viewbox[3]

    elements = []
    for match in re.finditer(r"<(rect|circle|ellipse|line|polygon|polyline)\b([^>]*)/?>", data, re.I | re.S):
        elements.append(
            (match.group(1).lower(),
            match.group(2))
        )

    for match in re.finditer(r"<path\b([^>]*)/?>", data, re.I | re.S):
        elements.append(
            (
                "path",
                match.group(1)
            )
        )

    return {
        "width": width or 100,
        "height":height or 100,
        "viewbox":viewbox,
        "elements":elements,
        "raw":data
    }

def attr(attrs, name, default = None):
    match=re.search(
        rf'\b{name}\s*=\s*["\']([^"\']+)["\']',
        attrs, re.I
    )
    return match.group(1) if match else default

def pdf_color(value):
    if not value or value == "none":
        return None

    value = value.strip().lower()

    named = {
        "black": (0,0,0),
        "white":(1, 1, 1),
        "red":(1, 0, 0),
        "green":(0, 1, 0),
        "blue":(0, 0, 1),
        "yellow":(1, 1, 0),
        "gray":(0.5,0.5, 0.5),
        "grey":(0.5, 0.5, 0.5),
    }
    if value in named:
        return named[value]

    if value.startswith("#"):
        value = value[1:]

        if len(value) == 3:
            value = "".join(c * 2 for c in value)

        if len(value) == 6:
            return tuple(
                int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)
            )

    rgb = re.match(
        r"rgb\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)", value
    )

    if rgb:
        return tuple(
            float(rgb.group(i)) / 255 for i in range (1, 4)
        )
    return None

def format_number(value):
    value = float(value)

    if value == int(value):
        return str(int(value))

    return f"{value:.4f}".rstrip("0").rstrip(".")

def element_style(attrs):
    fill = pdf_color(attr(attrs, "fill", "black"))
    stroke = pdf_color(attr(attrs, "stroke"))

    stroke_width = parse_number(
        attr(attrs, "stroke_width", "1"),
        1
    )

    commands=[]

    if fill:
        commands.append(
            "{} {} {} rg".format(
                *[format_number(v) for v in fill]
            )
        )

    if stroke:
        commands.append(
            "{} {} {} RG".format(
                *[format_number(v) for v in stroke]
            )
        )
        commands.append(f"{format_number(stroke_width)} w")
    return fill, stroke, stroke_width, commands

def svg_y_to_pdf(y, page_height):
    return page_height - y

def arc_to_cubic(
    x1: float,
    y1: float,
    rx: float,
    ry: float,
    rotation: float,
    large_arc: int,
    sweep: int,
    x2: float,
    y2: float,
) -> list[tuple[float, float, float, float, float, float]]:
    """
    Convert an SVG elliptical arc into one or more
    cubic Bézier curve segments.

    Each returned tuple contains:
        (x1, y1, x2, y2, x, y)
    representing a PDF cubic Bézier command.
    """

    # Degenerate arc: zero radius behaves like a straight line.
    if rx == 0 or ry == 0:
        return [
            (
                x1,
                y1,
                x2,
                y2,
                x2,
                y2,
            )
        ]

    # Identical start/end points produce no visible arc.
    if math.isclose(x1, x2) and math.isclose(y1, y2):
        return []

    rx = abs(rx)
    ry = abs(ry)

    phi = math.radians(rotation % 360.0)

    cos_phi = math.cos(phi)
    sin_phi = math.sin(phi)

    # Transform the midpoint into the ellipse's local coordinate system.
    dx = (x1 - x2) / 2.0
    dy = (y1 - y2) / 2.0

    x_prime = (
        cos_phi * dx
        + sin_phi * dy
    )

    y_prime = (
        -sin_phi * dx
        + cos_phi * dy
    )

    # SVG requires the radii to be large enough to reach
    # the requested endpoints. Scale them when necessary.
    radii_check = (
        (x_prime * x_prime) / (rx * rx)
        + (y_prime * y_prime) / (ry * ry)
    )

    if radii_check > 1:
        scale = math.sqrt(radii_check)
        rx *= scale
        ry *= scale

    rx_sq = rx * rx
    ry_sq = ry * ry
    x_prime_sq = x_prime * x_prime
    y_prime_sq = y_prime * y_prime

    denominator = (
        rx_sq * y_prime_sq
        + ry_sq * x_prime_sq
    )

    numerator = (
        rx_sq * ry_sq
        - denominator
    )

    if denominator == 0:
        coefficient = 0.0
    else:
        coefficient = math.sqrt(
            max(0.0, numerator / denominator)
        )

    # Choose the correct arc center according to
    # large-arc and sweep flags.
    if large_arc == sweep:
        coefficient = -coefficient

    cx_prime = (
        coefficient
        * (rx * y_prime / ry)
    )

    cy_prime = (
        coefficient
        * (-ry * x_prime / rx)
    )

    center_x = (
        cos_phi * cx_prime
        - sin_phi * cy_prime
        + (x1 + x2) / 2.0
    )

    center_y = (
        sin_phi * cx_prime
        + cos_phi * cy_prime
        + (y1 + y2) / 2.0
    )

    def vector_angle(
        ux: float,
        uy: float,
        vx: float,
        vy: float,
    ) -> float:
        dot = ux * vx + uy * vy
        length = math.sqrt(
            (ux * ux + uy * uy)
            * (vx * vx + vy * vy)
        )

        if length == 0:
            return 0.0

        value = max(-1.0, min(1.0, dot / length))
        angle = math.acos(value)

        if ux * vy - uy * vx < 0:
            angle = -angle

        return angle

    # Calculate start angle.
    ux = (
        x_prime - cx_prime
    ) / rx

    uy = (
        y_prime - cy_prime
    ) / ry

    # Calculate end vector.
    vx = (
        -x_prime - cx_prime
    ) / rx

    vy = (
        -y_prime - cy_prime
    ) / ry

    theta1 = vector_angle(
        1.0,
        0.0,
        ux,
        uy,
    )

    delta_theta = vector_angle(
        ux,
        uy,
        vx,
        vy,
    )

    if not sweep and delta_theta > 0:
        delta_theta -= 2.0 * math.pi
    elif sweep and delta_theta < 0:
        delta_theta += 2.0 * math.pi

    # SVG arcs are split into segments no larger than 90 degrees.
    segment_count = max(
        1,
        int(math.ceil(abs(delta_theta) / (math.pi / 2.0))),
    )

    delta = delta_theta / segment_count

    segments = []

    def map_point(
        x: float,
        y: float,
    ) -> tuple[float, float]:
        return (
            center_x
            + rx * cos_phi * x
            - ry * sin_phi * y,
            center_y
            + rx * sin_phi * x
            + ry * cos_phi * y,
        )

    # Cubic Bézier approximation of a circular arc.
    for segment_index in range(segment_count):
        angle1 = (
            theta1
            + segment_index * delta
        )

        angle2 = angle1 + delta

        alpha = (
            4.0 / 3.0
            * math.tan(delta / 4.0)
        )

        cos1 = math.cos(angle1)
        sin1 = math.sin(angle1)

        cos2 = math.cos(angle2)
        sin2 = math.sin(angle2)

        # Start point.
        p0_x, p0_y = map_point(
            cos1,
            sin1,
        )

        # End point.
        p3_x, p3_y = map_point(
            cos2,
            sin2,
        )

        # Tangent control points.
        p1_local_x = (
            cos1 - alpha * sin1
        )
        p1_local_y = (
            sin1 + alpha * cos1
        )

        p2_local_x = (
            cos2 + alpha * sin2
        )
        p2_local_y = (
            sin2 - alpha * cos2
        )

        p1_x, p1_y = map_point(
            p1_local_x,
            p1_local_y,
        )

        p2_x, p2_y = map_point(
            p2_local_x,
            p2_local_y,
        )

        segments.append(
            (
                p1_x,
                p1_y,
                p2_x,
                p2_y,
                p3_x,
                p3_y,
            )
        )

    return segments

def convert_path_data(d: str, page_height: float) -> list[str]:
    tokens = re.findall(
        r"[AaCcHhLlMmQqSsTtVvZz]|"
        r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?",
        d,
    )

    commands = []
    i = 0

    current_x = 0.0
    current_y = 0.0

    start_x = 0.0
    start_y = 0.0

    last_command = None

    last_cubic_control_x = None
    last_cubic_control_y = None

    last_quadratic_control_x = None
    last_quadratic_control_y = None

    def is_command(token):
        return re.fullmatch(
            r"[AaCcHhLlMmQqSsTtVvZz]",
            token,
        ) is not None

    while i < len(tokens):

        if is_command(tokens[i]):
            command = tokens[i]
            i += 1

            if command in "Zz":
                commands.append("h")

                current_x = start_x
                current_y = start_y

                last_command = command

                last_cubic_control_x = None
                last_cubic_control_y = None

                last_quadratic_control_x = None
                last_quadratic_control_y = None

                continue

        elif last_command is not None:
            command = last_command

        else:
            i += 1
            continue

        absolute = command.isupper()
        cmd = command.upper()

        try:

            # =========================================================
            # M / m
            # =========================================================
            if cmd == "M":

                if i + 1 >= len(tokens):
                    break

                x = float(tokens[i])
                y = float(tokens[i + 1])
                i += 2

                if not absolute:
                    x += current_x
                    y += current_y

                current_x = x
                current_y = y

                start_x = x
                start_y = y

                commands.append(
                    f"{format_number(x)} "
                    f"{format_number(y)} m"
                )

                command = "L" if absolute else "l"
                last_command = command

                last_cubic_control_x = None
                last_cubic_control_y = None

                last_quadratic_control_x = None
                last_quadratic_control_y = None

            # =========================================================
            # L / l
            # =========================================================
            elif cmd == "L":

                if i + 1 >= len(tokens):
                    break

                x = float(tokens[i])
                y = float(tokens[i + 1])
                i += 2

                if not absolute:
                    x += current_x
                    y += current_y

                commands.append(
                    f"{format_number(x)} "
                    f"{format_number(y)} l"
                )

                current_x = x
                current_y = y

                last_command = command

                last_cubic_control_x = None
                last_cubic_control_y = None

                last_quadratic_control_x = None
                last_quadratic_control_y = None

            # =========================================================
            # H / h
            # =========================================================
            elif cmd == "H":

                x = float(tokens[i])
                i += 1

                if not absolute:
                    x += current_x

                commands.append(
                    f"{format_number(x)} "
                    f"{format_number(current_y)} l"
                )

                current_x = x

                last_command = command

                last_cubic_control_x = None
                last_cubic_control_y = None

                last_quadratic_control_x = None
                last_quadratic_control_y = None

            # =========================================================
            # V / v
            # =========================================================
            elif cmd == "V":

                y = float(tokens[i])
                i += 1

                if not absolute:
                    y += current_y

                commands.append(
                    f"{format_number(current_x)} "
                    f"{format_number(y)} l"
                )

                current_y = y

                last_command = command

                last_cubic_control_x = None
                last_cubic_control_y = None

                last_quadratic_control_x = None
                last_quadratic_control_y = None

            # =========================================================
            # C / c
            # =========================================================
            elif cmd == "C":

                if i + 5 >= len(tokens):
                    break

                x1 = float(tokens[i])
                y1 = float(tokens[i + 1])

                x2 = float(tokens[i + 2])
                y2 = float(tokens[i + 3])

                x = float(tokens[i + 4])
                y = float(tokens[i + 5])

                i += 6

                if not absolute:
                    x1 += current_x
                    y1 += current_y

                    x2 += current_x
                    y2 += current_y

                    x += current_x
                    y += current_y

                commands.append(
                    f"{format_number(x1)} "
                    f"{format_number(y1)} "
                    f"{format_number(x2)} "
                    f"{format_number(y2)} "
                    f"{format_number(x)} "
                    f"{format_number(y)} c"
                )

                current_x = x
                current_y = y

                last_cubic_control_x = x2
                last_cubic_control_y = y2

                last_quadratic_control_x = None
                last_quadratic_control_y = None

                last_command = command

            # =========================================================
            # S / s
            # =========================================================
            elif cmd == "S":

                if i + 3 >= len(tokens):
                    break

                x2 = float(tokens[i])
                y2 = float(tokens[i + 1])

                x = float(tokens[i + 2])
                y = float(tokens[i + 3])

                i += 4

                if (
                    last_command
                    and last_command.upper() in {"C", "S"}
                    and last_cubic_control_x is not None
                ):
                    x1 = (
                        2 * current_x
                        - last_cubic_control_x
                    )
                    y1 = (
                        2 * current_y
                        - last_cubic_control_y
                    )
                else:
                    x1 = current_x
                    y1 = current_y

                if not absolute:
                    x2 += current_x
                    y2 += current_y

                    x += current_x
                    y += current_y

                commands.append(
                    f"{format_number(x1)} "
                    f"{format_number(y1)} "
                    f"{format_number(x2)} "
                    f"{format_number(y2)} "
                    f"{format_number(x)} "
                    f"{format_number(y)} c"
                )

                current_x = x
                current_y = y

                last_cubic_control_x = x2
                last_cubic_control_y = y2

                last_quadratic_control_x = None
                last_quadratic_control_y = None

                last_command = command

            # =========================================================
            # Q / q
            # =========================================================
            elif cmd == "Q":

                if i + 3 >= len(tokens):
                    break

                x1 = float(tokens[i])
                y1 = float(tokens[i + 1])

                x = float(tokens[i + 2])
                y = float(tokens[i + 3])

                i += 4

                if not absolute:
                    x1 += current_x
                    y1 += current_y

                    x += current_x
                    y += current_y

                c1_x = (
                    current_x
                    + (2.0 / 3.0)
                    * (x1 - current_x)
                )

                c1_y = (
                    current_y
                    + (2.0 / 3.0)
                    * (y1 - current_y)
                )

                c2_x = (
                    x
                    + (2.0 / 3.0)
                    * (x1 - x)
                )

                c2_y = (
                    y
                    + (2.0 / 3.0)
                    * (y1 - y)
                )

                commands.append(
                    f"{format_number(c1_x)} "
                    f"{format_number(c1_y)} "
                    f"{format_number(c2_x)} "
                    f"{format_number(c2_y)} "
                    f"{format_number(x)} "
                    f"{format_number(y)} c"
                )

                current_x = x
                current_y = y

                last_quadratic_control_x = x1
                last_quadratic_control_y = y1

                last_cubic_control_x = None
                last_cubic_control_y = None

                last_command = command

            # =========================================================
            # T / t
            # =========================================================
            elif cmd == "T":

                if i + 1 >= len(tokens):
                    break

                x = float(tokens[i])
                y = float(tokens[i + 1])

                i += 2

                if (
                    last_command
                    and last_command.upper() in {"Q", "T"}
                    and last_quadratic_control_x is not None
                ):
                    x1 = (
                        2 * current_x
                        - last_quadratic_control_x
                    )

                    y1 = (
                        2 * current_y
                        - last_quadratic_control_y
                    )
                else:
                    x1 = current_x
                    y1 = current_y

                if not absolute:
                    x += current_x
                    y += current_y

                c1_x = (
                    current_x
                    + (2.0 / 3.0)
                    * (x1 - current_x)
                )

                c1_y = (
                    current_y
                    + (2.0 / 3.0)
                    * (y1 - current_y)
                )

                c2_x = (
                    x
                    + (2.0 / 3.0)
                    * (x1 - x)
                )

                c2_y = (
                    y
                    + (2.0 / 3.0)
                    * (y1 - y)
                )

                commands.append(
                    f"{format_number(c1_x)} "
                    f"{format_number(c1_y)} "
                    f"{format_number(c2_x)} "
                    f"{format_number(c2_y)} "
                    f"{format_number(x)} "
                    f"{format_number(y)} c"
                )

                current_x = x
                current_y = y

                last_quadratic_control_x = x1
                last_quadratic_control_y = y1

                last_cubic_control_x = None
                last_cubic_control_y = None

                last_command = command

            # =========================================================
            # A / a - Elliptical Arc
            # =========================================================
            elif cmd == "A":

                if i + 6 >= len(tokens):
                    break

                rx = float(tokens[i])
                ry = float(tokens[i + 1])

                rotation = float(tokens[i + 2])

                large_arc = int(float(tokens[i + 3]))
                sweep = int(float(tokens[i + 4]))

                x = float(tokens[i + 5])
                y = float(tokens[i + 6])

                i += 7

                if not absolute:
                    x += current_x
                    y += current_y

                arc_segments = arc_to_cubic(
                    current_x,
                    current_y,
                    rx,
                    ry,
                    rotation,
                    large_arc,
                    sweep,
                    x,
                    y,
                )

                # Zero-radius arcs are straight lines.
                if rx == 0 or ry == 0:
                    commands.append(
                        f"{format_number(x)} "
                        f"{format_number(y)} l"
                    )

                else:
                    for (
                        x1,
                        y1,
                        x2,
                        y2,
                        end_x,
                        end_y,
                    ) in arc_segments:

                        commands.append(
                            f"{format_number(x1)} "
                            f"{format_number(y1)} "
                            f"{format_number(x2)} "
                            f"{format_number(y2)} "
                            f"{format_number(end_x)} "
                            f"{format_number(end_y)} c"
                        )

                current_x = x
                current_y = y

                last_cubic_control_x = None
                last_cubic_control_y = None

                last_quadratic_control_x = None
                last_quadratic_control_y = None

                last_command = command

            # =========================================================
            # Unsupported command
            # =========================================================
            else:

                i += 1

                last_cubic_control_x = None
                last_cubic_control_y = None

                last_quadratic_control_x = None
                last_quadratic_control_y = None

                last_command = command

        except (ValueError, IndexError):
            break

    return commands

def build_content(svg):
    page_width = svg["width"]
    page_height = svg["height"]

    commands = [
        "q",
        f"1 0 0 -1 0 {format_number(page_height)} cm"
    ]

    for element_type, attrs in svg["elements"]:
        fill, stroke, stroke_width, style_commands = element_style(attrs)

        commands.extend(style_commands)

        if element_type == "rect":
            x = parse_number(attr(attrs, "x", "0"))
            y = parse_number(attr(attrs, "y", "0"))
            width = parse_number(attr(attrs, "width", "0"))
            height = parse_number(attr(attrs, "height", "0"))

            commands.append(
                f"{format_number(x)} {format_number(y)} "
                f"{format_number(width)} {format_number(height)} re"
            )

            if fill and stroke:
                commands.append("B")
            elif fill:
                commands.append("f")
            elif stroke:
                commands.append("S")

        elif element_type == "line":
            x1 = parse_number(attr(attrs, "x1", "0"))
            y1 = parse_number(attr(attrs, "y1", "0"))
            x2 = parse_number(attr(attrs, "x2", "0"))
            y2 = parse_number(attr(attrs, "y2", "0"))

            commands.append(
                f"{format_number(x1)} {format_number(y1)} m"
            )

            commands.append(
                f"{format_number(x2)} {format_number(y2)} l"
            )

            commands.append("S")

        elif element_type == "circle":
            cx = parse_number(attr(attrs, "cx", "0"))
            cy = parse_number(attr(attrs, "cy", "0"))
            radius = parse_number(attr(attrs, "r", "0"))

            k = 0.5522847498

            commands.extend([
                f"{format_number(cx + radius)} {format_number(cy)} m",

                f"{format_number(cx + radius)} "
                f"{format_number(cy + k * radius)} "
                f"{format_number(cx + k * radius)} "
                f"{format_number(cy + radius)} "
                f"{format_number(cx)} "
                f"{format_number(cy + radius)} c",

                f"{format_number(cx - k * radius)} "
                f"{format_number(cy + radius)} "
                f"{format_number(cx - radius)} "
                f"{format_number(cy + k * radius)} "
                f"{format_number(cx - radius)} "
                f"{format_number(cy)} c",

                f"{format_number(cx - radius)} "
                f"{format_number(cy - k * radius)} "
                f"{format_number(cx - k * radius)} "
                f"{format_number(cy - radius)} "
                f"{format_number(cx)} "
                f"{format_number(cy - radius)} c",

                f"{format_number(cx + k * radius)} "
                f"{format_number(cy - radius)} "
                f"{format_number(cx + radius)} "
                f"{format_number(cy - k * radius)} "
                f"{format_number(cx + radius)} "
                f"{format_number(cy)} c",
            ])

            if fill and stroke:
                commands.append("B")
            elif fill:
                commands.append("f")
            elif stroke:
                commands.append("S")

        elif element_type == "ellipse":
            cx = parse_number(attr(attrs, "cx", "0"))
            cy = parse_number(attr(attrs, "cy", "0"))
            rx = parse_number(attr(attrs, "rx", "0"))
            ry = parse_number(attr(attrs, "ry", "0"))

            k = 0.5522847498

            commands.extend([
                f"{format_number(cx + rx)} "
                f"{format_number(cy)} m",

                f"{format_number(cx + rx)} "
                f"{format_number(cy + k * ry)} "
                f"{format_number(cx + k * rx)} "
                f"{format_number(cy + ry)} "
                f"{format_number(cx)} "
                f"{format_number(cy + ry)} c",

                f"{format_number(cx - k * rx)} "
                f"{format_number(cy + ry)} "
                f"{format_number(cx - rx)} "
                f"{format_number(cy + k * ry)} "
                f"{format_number(cx - rx)} "
                f"{format_number(cy)} c",

                f"{format_number(cx - rx)} "
                f"{format_number(cy - k * ry)} "
                f"{format_number(cx - k * rx)} "
                f"{format_number(cy - ry)} "
                f"{format_number(cx)} "
                f"{format_number(cy - ry)} c",

                f"{format_number(cx + k * rx)} "
                f"{format_number(cy - ry)} "
                f"{format_number(cx + rx)} "
                f"{format_number(cy - k * ry)} "
                f"{format_number(cx + rx)} "
                f"{format_number(cy)} c",
            ])

            if fill and stroke:
                commands.append("B")
            elif fill:
                commands.append("f")
            elif stroke:
                commands.append("S")

        elif element_type in ("polygon", "polyline"):
            points = re.findall(
                r"[-+]?(?:\d*\.\d+|\d+)",
                attr(attrs, "points", "")
            )

            if len(points) >= 4:
                x = float(points[0])
                y = float(points[1])

                commands.append(
                    f"{format_number(x)} {format_number(y)} m"
                )

                for i in range(2, len(points), 2):
                    x = float(points[i])
                    y = float(points[i + 1])

                    commands.append(
                        f"{format_number(x)} {format_number(y)} l"
                    )

                if element_type == "polygon":
                    commands.append("h")

                if fill and stroke:
                    commands.append("B")
                elif fill:
                    commands.append("f")
                elif stroke:
                    commands.append("S")

        elif element_type == "path":
            path_data = attr(attrs, "d", "")

            commands.extend(
                convert_path_data(
                    path_data,
                    page_height
                )
            )

            if fill and stroke:
                commands.append("B")
            elif fill:
                commands.append("f")
            elif stroke:
                commands.append("S")

    commands.append("Q")

    return "\n".join(commands).encode("ascii")


def assemble_pdf(content, width, height):
    objects = {}

    objects[1] = b"<< /Type /Catalog /Pages 2 0 R >>"

    objects[2] = b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>"

    objects[3] = (
        f"<< /Type /Page /Parent 2 0 R "
        f"/MediaBox [0 0 {format_number(width)} {format_number(height)}] "
        f"/Resources << >> /Contents 4 0 R >>"
    ).encode()

    objects[4] = (
        f"<< /Length {len(content)} >>\n"
        f"stream\n".encode()
        + content
        + b"\nendstream"
    )

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]

    for number in sorted(objects):
        offsets.append(len(pdf))

        pdf.extend(
            f"{number} 0 obj\n".encode()
        )

        pdf.extend(objects[number])
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)

    pdf.extend(
        f"xref\n0 {len(offsets)}\n".encode()
    )

    pdf.extend(
        b"0000000000 65535 f \n"
    )

    for offset in offsets[1:]:
        pdf.extend(
            f"{offset:010d} 00000 n \n".encode()
        )

    pdf.extend(
        f"trailer\n"
        f"<< /Size {len(offsets)} /Root 1 0 R >>\n"
        f"startxref\n"
        f"{xref_offset}\n"
        f"%%EOF".encode()
    )

    return bytes(pdf)

def convert_svg(svg_path):
    svg = parse_svg(svg_path)

    content = build_content(svg)

    pdf_data = assemble_pdf(
        content,
        svg["width"],
        svg["height"]
    )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output_path = OUTPUT_DIR / f"{svg_path.stem}.pdf"
    output_path.write_bytes(pdf_data)

    svg_size = svg_path.stat().st_size
    pdf_size = len(pdf_data)

    reduction = (
        (svg_size - pdf_size) / svg_size * 100 if svg_size else 0
    )

    return {
        "svg_size": svg_size,
        "pdf_size": pdf_size,
        "difference": svg_size - pdf_size,
        "reduction": reduction,
        "elements": len(svg["elements"]),
        "output": output_path
    }

def main():
    print("=" * 78)
    print("PixelShrinkAI - Pure Vector SVG -> PDF Benchmark")
    print("=" * 78)
    print(f"Benchmark directory: {BENCHMARK_DIR}")
    print(f"Output directory:    {OUTPUT_DIR}")
    print("=" * 78)

    svg_files = sorted(BENCHMARK_DIR.glob("*.svg"))

    for svg_path in svg_files:
        info = parse_svg(svg_path)

        if re.search(r"<image\b", info["raw"], re.I):
            continue
        try:
            result = convert_svg(svg_path)

            print(f"\n{svg_path.name}")
            print("-" * 78)
            print(f"Vector elements: {result['elements']}")
            print(f"SVG size:        {result['svg_size']:,} bytes")
            print(f"PDF size:        {result['pdf_size']:,} bytes")
            print(f"Difference:      {result['difference']:+,} bytes")
            print(f"Reduction:       {result['reduction']:+.2f}%")
            print(
                "Status:          "
                + (
                    "PASS — PDF <= SVG"
                    if result["pdf_size"] <= result["svg_size"]
                    else "NEEDS OPTIMIZATION"
                )
            )
            print(f"Output:          {result['output']}")

        except Exception as error:
            print(f"\n{svg_path.name}")
            print("-" * 78)
            print(f"ERROR: {error}")

    print("\n" + "=" * 78)
    print("Pure vector benchmark complete.")
    print("=" * 78)

if __name__ == "__main__":
    main()

