"""One-shot: take raw logo PNG, remove white background, output:
  - logo.png       — transparent bg, original colors
  - logo-light.png — transparent bg, dark cube swapped to white (for dark themes)
"""
from pathlib import Path
from PIL import Image

SRC = Path("app/static/img/logo.png")
OUT_TRANSPARENT = Path("app/static/img/logo.png")
OUT_LIGHT = Path("app/static/img/logo-light.png")

WHITE_THRESHOLD = 240  # pixels brighter than this (R,G,B all) → alpha 0
DARK_THRESHOLD = 70    # pixels darker than this → swapped to white for light variant


def remove_white(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD:
                px[x, y] = (255, 255, 255, 0)
            else:
                # soft edge: how far from pure white
                dist = max(255 - r, 255 - g, 255 - b)
                alpha = min(255, int(dist * 255 / (255 - WHITE_THRESHOLD)))
                px[x, y] = (r, g, b, alpha)
    return img


def make_light_variant(img: Image.Image) -> Image.Image:
    """Dark cube (near black) → white. Keep greens as-is."""
    img = img.copy()
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r < DARK_THRESHOLD and g < DARK_THRESHOLD and b < DARK_THRESHOLD:
                # invert luminance -> white
                px[x, y] = (255, 255, 255, a)
    return img


def main():
    src = Image.open(SRC)
    transparent = remove_white(src)
    transparent.save(OUT_TRANSPARENT)
    print(f"wrote {OUT_TRANSPARENT} ({transparent.size[0]}x{transparent.size[1]}, RGBA)")

    light = make_light_variant(transparent)
    light.save(OUT_LIGHT)
    print(f"wrote {OUT_LIGHT} ({light.size[0]}x{light.size[1]}, RGBA)")


if __name__ == "__main__":
    main()
