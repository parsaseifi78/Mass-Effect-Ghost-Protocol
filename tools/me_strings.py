#!/usr/bin/env python3
"""Read and patch the English string pool inside Mass Effect Infiltrator.

The game's text lives in assets/archiveUserData.zip at
files/published/strings/ENG_US/masseffect.bin.  That file is an SBIN container:
a table section plus a CDAT chunk holding a flat sequence of NUL-terminated
strings.  Strings appear as ID/value neighbours; some runs are stored in the
reverse order, so both neighbours are considered.

Patching is strictly in place: a replacement must have the same byte length as
the original value.  Every SBIN offset therefore stays valid and the patched
file keeps exactly the same size and layout.
"""

import json
import re
import struct
import sys
import zipfile

APK_INNER = "assets/archiveUserData.zip"
STRINGS_PATH = "files/published/strings/ENG_US/masseffect.bin"


def is_id(raw: bytes) -> bool:
    if not raw or not 32 <= raw[0] <= 125:
        return False
    return bool(re.fullmatch(r"[A-Z0-9_ .()\-]+", raw.decode("utf-8", "replace")))


def read_pool(data: bytes):
    cd = data.find(b"CDAT")
    if cd < 0:
        raise ValueError("CDAT chunk not found")
    size = struct.unpack_from("<I", data, cd + 4)[0]
    pool = data[cd + 12 : cd + 8 + size]
    marker = b"masseffect_iphone\x00"
    start = pool.find(marker)
    if start < 0:
        raise ValueError("string marker not found")
    start += len(marker)

    strings = []
    offsets = []
    p = start
    while p < len(pool):
        j = pool.find(b"\x00", p)
        if j < 0:
            break
        s = pool[p:j]
        if not s:
            break
        strings.append(s)
        offsets.append(p)
        p = j + 1
    return pool, strings, offsets, cd


def build_pairs(strings, offsets):
    pairs = {}
    for i, raw in enumerate(strings):
        if not is_id(raw):
            continue
        key = raw.decode("utf-8", "replace")
        candidate = None
        for j in (i + 1, i - 1):
            if 0 <= j < len(strings) and not is_id(strings[j]):
                candidate = j
                break
        if candidate is None:
            continue
        if key in pairs:
            key = f"{key}#{i}"
        pairs[key] = {
            "value": strings[candidate].decode("utf-8", "replace"),
            "offset": offsets[candidate],
            "length": len(strings[candidate]),
            "index": candidate,
        }
    return pairs


def load_from_apk(apk_path: str):
    with zipfile.ZipFile(apk_path) as apk:
        with zipfile.ZipFile(apk.open(APK_INNER)) as inner:
            data = inner.read(STRINGS_PATH)
    pool, strings, offsets, cd = read_pool(data)
    return data, cd, build_pairs(strings, offsets)


def dump(apk_path: str, out_path: str):
    data, cd, pairs = load_from_apk(apk_path)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(pairs, f, indent=2, ensure_ascii=False)
    print(f"dumped {len(pairs)} strings to {out_path}")


def patch_bin(data: bytes, replacements: dict):
    pool, strings, offsets, cd = read_pool(data)
    pairs = build_pairs(strings, offsets)
    changed = 0
    for key, new_value in replacements.items():
        entry = pairs.get(key)
        if entry is None:
            print(f"  WARN: no such string id: {key}", file=sys.stderr)
            continue
        old_len = entry["length"]
        new = new_value.encode("utf-8")
        if len(new) != old_len:
            print(f"  WARN: length mismatch for {key}: {old_len} -> {len(new)}", file=sys.stderr)
            continue
        pos = cd + 12 + entry["offset"]
        data = data[:pos] + new + data[pos + old_len:]
        changed += 1
    return data, changed


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        print("usage: me_strings.py dump <apk> <out.json>")
        print("       me_strings.py patch <bin> <replacements.json> <out.bin>")
        return 1
    cmd = sys.argv[1]
    if cmd == "dump":
        dump(sys.argv[2], sys.argv[3])
    elif cmd == "patch":
        with open(sys.argv[2], "rb") as f:
            data = f.read()
        with open(sys.argv[3], encoding="utf-8") as f:
            reps = json.load(f)
        out, n = patch_bin(data, reps)
        with open(sys.argv[4], "wb") as f:
            f.write(out)
        print(f"patched {n} strings -> {sys.argv[4]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
