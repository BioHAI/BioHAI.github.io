"""Optimize existing member photographs. Dry-run by default; requires Pillow.

python tools/compress-portraits.py --apply
Originals and changed public files are backed up under .local-admin/backups/.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
from datetime import datetime, timezone
import uuid

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PROFILE_VERSION = b"biohai-portrait-v1"


def encode_photo(image, bounds, budget):
    """Keep aspect ratio; search quality first, then reduce resolution if needed."""
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB")
    image.thumbnail(bounds, Image.Resampling.LANCZOS)
    for _ in range(12):
        def encoded(quality):
            stream = io.BytesIO()
            image.save(stream, "WEBP", quality=quality, method=6)
            return stream.getvalue()

        high = encoded(90)
        if len(high) <= budget:
            return high, image.size
        best = encoded(72)
        if len(best) <= budget:
            low, high_quality = 72, 90
            while high_quality - low > 1:
                quality = (low + high_quality) // 2
                candidate = encoded(quality)
                if len(candidate) <= budget:
                    best, low = candidate, quality
                else:
                    high_quality = quality
            return best, image.size
        image = image.resize(tuple(max(1, int(n * .82)) for n in image.size), Image.Resampling.LANCZOS)
    raise ValueError("Photo cannot be compressed within the size budget")


def image_path(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to((root / "images").resolve()) or not path.is_file():
        raise ValueError(f"Image is outside the project or missing: {relative}")
    return path


def optimize(root=ROOT, apply=False):
    root = Path(root).resolve()
    people_file = root / "assets/data/people.json"
    people = json.loads(people_file.read_text(encoding="utf-8"))
    # All public text references are migrated together, including older data pages.
    public_files = sorted(set(root.glob("*.html")) | {
        p for p in (root / "assets").rglob("*")
        if p.is_file() and p.suffix in {".json", ".html", ".css", ".js"}
    })
    snapshots = {p: p.read_bytes() for p in public_files}
    replacements, outputs, originals, rows = {}, {}, {}, []
    seen = set()
    for person in people:
        relative = person.get("image")
        if not relative or relative in seen:
            continue
        seen.add(relative)
        path = image_path(root, relative)
        raw = path.read_bytes()
        with Image.open(io.BytesIO(raw)) as image:
            if len(raw) <= 180 * 1024 and image.width <= 960 and image.height <= 1200:
                continue
            if image.width * image.height > 80000000:
                raise ValueError(f"Photo exceeds 80 megapixels: {relative}")
            data, dimensions = encode_photo(image, (960, 1200), 180 * 1024)
            thumbnail, _ = encode_photo(image, (360, 450), 40 * 1024)
        # Never replace an already smaller, equally sized photograph.
        if len(data) >= len(raw) and dimensions == (image.width, image.height):
            continue
        identity = str(uuid.UUID(bytes=hashlib.sha256(raw + PROFILE_VERSION).digest()[:16]))
        image_name = f"images/uploads/members/{identity}.webp"
        thumbnail_name = f"images/uploads/members/{identity}-preview.webp"
        replacements[relative] = image_name
        old_thumbnail = person.get("thumbnail")
        if old_thumbnail:
            replacements[old_thumbnail] = thumbnail_name
        outputs[image_name], outputs[thumbnail_name] = data, thumbnail
        originals[path] = raw
        if old_thumbnail:
            old_path = image_path(root, old_thumbnail)
            originals[old_path] = old_path.read_bytes()
        rows.append({"name": person["name"], "before": len(raw), "after": len(data), "preview": len(thumbnail)})
    updated = {}
    # Longest names first avoids a prefix match changing a different path.
    for path, raw in snapshots.items():
        content = raw.decode("utf-8")
        for old, new in sorted(replacements.items(), key=lambda pair: -len(pair[0])):
            content = content.replace(old, new)
        if content.encode("utf-8") != raw:
            updated[path] = content.encode("utf-8")
    # Members without a preview still need one; keep existing metadata unchanged.
    updated_people = json.loads(updated.get(people_file, snapshots[people_file]).decode("utf-8"))
    missing = False
    for person in updated_people:
        if not person.get("thumbnail") and person.get("image") in outputs:
            person["thumbnail"] = person["image"].replace(".webp", "-preview.webp")
            missing = True
    if missing:
        updated[people_file] = (json.dumps(updated_people, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    # Delete only replaced image files whose paths are no longer referenced.
    final_text = "\n".join(updated.get(p, raw).decode("utf-8") for p, raw in snapshots.items())
    retired = {p: raw for p, raw in originals.items() if p.relative_to(root).as_posix() not in final_text}
    before = sum(len(raw) for raw in retired.values())
    after = sum(len(data) for data in outputs.values())
    report = {"apply": apply, "photos": len(rows), "beforeBytes": before, "afterBytes": after,
              "savedBytes": before - after, "items": rows, "backup": None}
    if not apply or not rows:
        return report
    # Refuse stale writes if someone saved a form while compression was running.
    for path, raw in {**snapshots, **originals}.items():
        if path.read_bytes() != raw:
            raise RuntimeError("Files changed during compression. Please retry after saving the editor.")
    backup = root / ".local-admin/backups" / ("photos-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:8])
    for path in set(updated) | set(retired):
        destination = backup / path.relative_to(root)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)
    created = []
    try:
        for relative, data in outputs.items():
            destination = root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.exists():
                if destination.read_bytes() != data:
                    raise RuntimeError("Compressed output conflicts with an existing file")
            else:
                destination.write_bytes(data)
                created.append(destination)
        for path, data in updated.items():
            temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
            try:
                temporary.write_bytes(data)
                os.replace(temporary, path)
            finally:
                temporary.unlink(missing_ok=True)
        for path in retired:
            path.unlink()
    except Exception:
        for path in set(updated) | set(retired):
            shutil.copy2(backup / path.relative_to(root), path)
        for path in created:
            path.unlink(missing_ok=True)
        raise
    report["backup"] = str(backup)
    (backup / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write optimized files after backing up originals")
    arguments = parser.parse_args()
    print(json.dumps(optimize(apply=arguments.apply), ensure_ascii=False, indent=2))
