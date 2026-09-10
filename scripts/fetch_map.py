"""Fetch Esri World Imagery tiles for an Almaty bounding box, stitch
them into a single PNG, and post-process it into a moody 'night' look.

Run once:
    python scripts/fetch_map.py

Output:
    app/static/img/almaty-satellite.jpg  (~400 KB JPEG, 1280x1280)

Attribution (displayed in the site footer): "Карта: Esri, Maxar, Earthstar
Geographics". This is a public tile endpoint used by countless sites; no
API key required.
"""
from __future__ import annotations

import math
import time
from io import BytesIO
from pathlib import Path

import urllib.request

from PIL import Image, ImageEnhance, ImageFilter

# ---------- Area of interest: Almaty ----------
# center ≈ 43.2389, 76.8897 — extend a bit so we get the core city grid
LAT_MIN, LAT_MAX = 43.170, 43.300
LON_MIN, LON_MAX = 76.820, 77.000
ZOOM = 13  # ~20 m/px, perfect for "whole city grid"

TILE_URL = (
    "https://server.arcgisonline.com/ArcGIS/rest/services/"
    "World_Imagery/MapServer/tile/{z}/{y}/{x}"
)
USER_AGENT = "dots-landing/1.0 (+local build, one-off static export)"

OUT = Path("app/static/img/almaty-satellite.jpg")
TILE_SIZE = 256


def deg2tile(lat: float, lon: float, zoom: int) -> tuple[int, int]:
    lat_rad = math.radians(lat)
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def fetch_tile(z: int, x: int, y: int) -> Image.Image:
    url = TILE_URL.format(z=z, x=x, y=y)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return Image.open(BytesIO(data)).convert("RGB")


def stitch() -> Image.Image:
    x_min, y_max = deg2tile(LAT_MIN, LON_MIN, ZOOM)
    x_max, y_min = deg2tile(LAT_MAX, LON_MAX, ZOOM)

    tiles_w = x_max - x_min + 1
    tiles_h = y_max - y_min + 1
    print(f"[fetch_map] grid: {tiles_w} x {tiles_h} = {tiles_w * tiles_h} tiles @ z{ZOOM}")

    canvas = Image.new("RGB", (tiles_w * TILE_SIZE, tiles_h * TILE_SIZE), (0, 0, 0))

    for i, x in enumerate(range(x_min, x_max + 1)):
        for j, y in enumerate(range(y_min, y_max + 1)):
            for attempt in range(3):
                try:
                    tile = fetch_tile(ZOOM, x, y)
                    break
                except Exception as e:
                    print(f"  retry {attempt + 1} for {x},{y}: {e}")
                    time.sleep(1 + attempt)
            else:
                raise RuntimeError(f"failed to fetch tile {x},{y}")

            canvas.paste(tile, (i * TILE_SIZE, j * TILE_SIZE))
            print(f"  tile {i * tiles_h + j + 1}/{tiles_w * tiles_h} ok")
            time.sleep(0.05)  # be polite

    return canvas


def nightify(img: Image.Image) -> Image.Image:
    """Daytime satellite -> cinematic night with deep violet tint,
    matching the site's purple theme."""
    img = ImageEnhance.Brightness(img).enhance(0.60)
    img = ImageEnhance.Contrast(img).enhance(1.18)
    img = ImageEnhance.Color(img).enhance(0.45)

    # Push hues toward violet: boost red+blue, suppress green
    r, g, b = img.split()
    r = r.point(lambda v: min(255, int(v * 1.00 + 6)))
    g = g.point(lambda v: int(v * 0.68))
    b = b.point(lambda v: min(255, int(v * 1.22 + 8)))
    img = Image.merge("RGB", (r, g, b))

    img = img.filter(ImageFilter.GaussianBlur(radius=0.6))
    return img


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)

    canvas = stitch()
    print(f"[fetch_map] raw canvas: {canvas.size}")

    # Cap huge output
    if max(canvas.size) > 2400:
        scale = 2400 / max(canvas.size)
        new_size = (int(canvas.size[0] * scale), int(canvas.size[1] * scale))
        canvas = canvas.resize(new_size, Image.LANCZOS)
        print(f"[fetch_map] resized to: {canvas.size}")

    night = nightify(canvas)
    night.save(OUT, "JPEG", quality=85, optimize=True, progressive=True)
    print(f"[fetch_map] wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
