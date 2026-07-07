#!/usr/bin/env python3
"""Generate raster favicon and Open Graph image from the Wisp logo design."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_ASSETS = ROOT / "apps" / "dashboard" / "src"
PUBLIC = ROOT / "apps" / "demo" / "public"

PRIMARY = (59, 97, 246)  # #3B61F6
PRIMARY_DARK = (91, 69, 255)  # #5B45FF
WHITE = (255, 255, 255)


def draw_logo(size: int) -> Image.Image:
    """Render the Wisp logo (rounded square + bolt) at the given size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = size // 4
    # Gradient-ish background: blend primary to primary-dark vertically
    for y in range(size):
        ratio = y / size
        r = int(PRIMARY[0] * (1 - ratio) + PRIMARY_DARK[0] * ratio)
        g = int(PRIMARY[1] * (1 - ratio) + PRIMARY_DARK[1] * ratio)
        b = int(PRIMARY[2] * (1 - ratio) + PRIMARY_DARK[2] * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Rounded rectangle mask
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    img.putalpha(mask)

    # Lightning bolt polygon
    bolt = [
        (size * 0.54, size * 0.17),
        (size * 0.73, size * 0.44),
        (size * 0.59, size * 0.44),
        (size * 0.68, size * 0.76),
        (size * 0.41, size * 0.42),
        (size * 0.54, size * 0.42),
    ]
    draw.polygon(bolt, fill=WHITE)

    return img


def generate_favicon_ico() -> None:
    DASHBOARD_ASSETS.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    sizes = [16, 32, 48]
    images = [draw_logo(size) for size in sizes]

    dashboard_ico = DASHBOARD_ASSETS / "favicon.ico"
    images[0].save(
        dashboard_ico,
        format="ICO",
        sizes=[(size, size) for size in sizes],
        append_images=images[1:],
    )
    print(f"Generated {dashboard_ico}")

    demo_ico = PUBLIC / "favicon.ico"
    images[0].save(
        demo_ico,
        format="ICO",
        sizes=[(size, size) for size in sizes],
        append_images=images[1:],
    )
    print(f"Generated {demo_ico}")


def generate_apple_touch_icon() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    size = 180
    icon = draw_logo(size)
    # iOS rounds icons automatically; add a subtle padding so the logo breathes
    padded = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    padded.paste(icon.resize((size - 40, size - 40), Image.Resampling.LANCZOS), (20, 20), icon.resize((size - 40, size - 40), Image.Resampling.LANCZOS))
    path = PUBLIC / "apple-touch-icon.png"
    padded.save(path, "PNG")
    print(f"Generated {path}")


def generate_og_image() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    width, height = 1200, 630
    img = Image.new("RGB", (width, height), (250, 250, 252))
    draw = ImageDraw.Draw(img)

    logo = draw_logo(180)
    logo_x = (width - logo.width) // 2
    logo_y = 150
    img.paste(logo, (logo_x, logo_y), logo)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 56)
        subfont = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
    except Exception:
        font = ImageFont.load_default()
        subfont = font

    title = "Wisp — Self-hosted PaaS"
    subtitle = "Deploy your repos to your own VPS"

    title_bbox = draw.textbbox((0, 0), title, font=font)
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subfont)

    draw.text(
        ((width - (title_bbox[2] - title_bbox[0])) // 2, logo_y + 220),
        title,
        fill=(20, 20, 24),
        font=font,
    )
    draw.text(
        ((width - (subtitle_bbox[2] - subtitle_bbox[0])) // 2, logo_y + 300),
        subtitle,
        fill=(80, 80, 90),
        font=subfont,
    )

    og_path = PUBLIC / "og-image.png"
    img.save(og_path, "PNG")
    print(f"Generated {og_path}")


if __name__ == "__main__":
    generate_favicon_ico()
    generate_apple_touch_icon()
    generate_og_image()
