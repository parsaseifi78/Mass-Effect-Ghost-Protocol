#!/usr/bin/env python3
"""Extract OCR text with screen coordinates from saved screenshots.

Usage: python3 tools/photo_ocr.py /sdcard/Download/shot1.jpg ...
Requires tesseract-ocr and Pillow (both available in this environment).
"""
import csv
import io
import subprocess
import sys
from collections import Counter
from pathlib import Path

from PIL import Image


def ocr_rows(path):
    out = subprocess.check_output(
        ["tesseract", str(path), "stdout", "--psm", "11", "tsv"],
        text=True,
        stderr=subprocess.DEVNULL,
    )
    rows = list(csv.DictReader(io.StringIO(out), delimiter="\t"))
    return [
        r for r in rows
        if r.get("text", "").strip() and float(r.get("conf", 0) or 0) > 30
    ]


def color_summary(im):
    q = im.convert("RGB").resize((64, 64)).quantize(colors=8).convert("RGB")
    counts = Counter(q.getdata())
    total = sum(counts.values()) or 1
    return [
        (f"#{r:02x}{g:02x}{b:02x}", round(n / total * 100, 1))
        for (r, g, b), n in counts.most_common(6)
    ]


def main(paths):
    if not paths:
        print("usage: photo_ocr.py IMAGE [IMAGE ...]", file=sys.stderr)
        return 2
    for raw in paths:
        path = Path(raw)
        if not path.is_file():
            print(f"IMAGE {path}: MISSING")
            continue
        with Image.open(path) as img:
            print(f"IMAGE {path.name} size={img.size[0]}x{img.size[1]}")
            print("COLORS " + " ".join(f"{c}:{p}%" for c, p in color_summary(img)))
        rows = ocr_rows(path)
        if not rows:
            print("TEXT   (none recognized)")
        for r in rows:
            print(
                f"TEXT   x={int(r['left']):4} y={int(r['top']):4} "
                f"w={int(r['width']):3} h={int(r['height']):3} "
                f"conf={float(r['conf']):4.0f}  {r['text'].strip()}"
            )
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
