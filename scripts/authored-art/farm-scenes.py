"""Export the selected original Farm plates and ring details from a private source index.

Use Pillow 11.3.0. Keep the source PNGs and prompts in Art Authoring.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

from PIL import Image, ImageDraw


def sha(data):
    return hashlib.sha256(data).hexdigest()


def selected(root, row):
    relative = Path(row["source"])
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Expected a relative authoring path")
    source = root / relative
    key = row["key"]
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", key):
        raise ValueError(f"Invalid asset key {key}")
    if sha(source.read_bytes()) != row["sourceSha256"]:
        raise ValueError(f"Source hash for {key} has changed.")
    return Image.open(source)


def export(image, width, budget, file):
    height = round(image.height * width / image.width)
    size = (width, height)
    scaled = image.convert("RGB").resize(size, Image.Resampling.LANCZOS)
    for quality in range(86, 45, -4):
        scaled.save(file, format="WEBP", quality=quality, method=6)
        if file.stat().st_size <= budget:
            break
    else:
        raise ValueError(f"{file.name} exceeded its {budget}-byte budget")
    return {"file": file.name, "width": width, "height": height, "sha256": sha(file.read_bytes())}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("authoring", type=Path)
    parser.add_argument("--out", type=Path, default=Path("packages/art/farm-scenes"))
    parser.add_argument("--review", type=Path)
    args = parser.parse_args()
    root = args.authoring.resolve()
    index = root / "content/authoring/scene-studies/farm-life/f112-release-sources.json"
    source = json.loads(index.read_text(encoding="utf-8-sig"))
    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    scenes = {}
    rings = {}
    total = len(source["scenes"]) + len(source["rings"])
    preview = Image.new("RGB", (1260, 106 * ((total + 6) // 7)), (29, 36, 36)) if args.review else None
    draw = ImageDraw.Draw(preview) if preview else None

    def mark(row, number, image):
        if preview is not None:
            thumb = image.copy()
            thumb.thumbnail((176, 83))
            x, y = number % 7 * 180, number // 7 * 106
            preview.paste(thumb, (x + (180 - thumb.width) // 2, y))
            draw.text((x + 6, y + 85), row["key"], fill=(229, 234, 223))

    for pos, row in enumerate(source["scenes"]):
        key = row["key"]
        if key in scenes:
            raise ValueError(f"Duplicate scene {key}")
        with selected(root, row) as image:
            if not 1.70 <= image.width / image.height <= 1.85:
                raise ValueError(f"Expected a wide master for {key}")
            files = [export(image, width, budget, out / f"{key}-{width}.webp")
                     for width, budget in ((896, 180_000), (1600, 320_000))]
            mark(row, pos, image)
        scenes[key] = {"kind": row["kind"], "phase": row["phase"], "seasons": row["seasons"],
                       "focal": row["focal"], "sourceSha256": row["sourceSha256"], "files": files}

    for pos, row in enumerate(source["rings"], len(scenes)):
        key = row["key"]
        if key in rings:
            raise ValueError(f"Duplicate ring {key}")
        with selected(root, row) as image:
            if image.width != image.height:
                raise ValueError(f"Expected a square detail for {key}")
            rings[key] = {"sourceSha256": row["sourceSha256"],
                          **export(image, 384, 58_000, out / f"{key}.webp")}
            mark(row, pos, image)
    if set(rings) != {f"ring-g{grade}" for grade in range(1, 11)}:
        raise ValueError("The ring detail export must cover every grade")
    if preview is not None:
        preview.save(args.review)
    (out / "manifest.json").write_text(json.dumps({"schemaVersion": 1, "scenes": scenes, "rings": rings},
                                                   indent=2) + "\n", encoding="utf-8")
    print(f"{len(scenes)} locations and {len(rings)} ring details exported.")


if __name__ == "__main__":
    main()
