#!/usr/bin/env python3
""" Verified deep-mod tooling for Mass Effect Infiltrator SBIN prefab files.

Every edit is written at an exact offset AND guarded by a check that the
original bytes at that offset are the expected ones.  Nothing is scanned or
guessed, so an unexpected source file aborts the build instead of corrupting
it.

Edits applied here:
  * level_index.prefabs.sb - shorten the campaign to a 3-level arc:
        01_snow_planet -> 07_comm_relay -> 09_desert_planet -> end
  * healths.prefabs.sb     - rebalance a few named prefabs for a faster,
                             deadlier "Ghost Protocol" play style
"""

import struct
import sys
import zipfile

INNER = "assets/archiveUserData.zip"
LEVELS = "files/published/data/level_index.prefabs.sb"
HEALTHS = "files/published/data/healths.prefabs.sb"


def data_base(blob: bytes) -> int:
    i = blob.find(b"DATA")
    if i < 0:
        raise ValueError("DATA chunk not found")
    # The DATA chunk header is 4 tag + 4 size + 4 hash bytes.
    return i + 12


def patch_u32(blob: bytes, base: int, rel: int, expected: int, new: int, label: str):
    off = base + rel
    cur = struct.unpack_from("<I", blob, off)[0]
    if cur != expected:
        raise ValueError(f"{label}: expected {expected} at D+{rel}, found {cur}")
    struct.pack_into("<I", blob, off, new)
    print(f"  {label}: D+{rel} {expected} -> {new}")


def patch_float(blob: bytes, base: int, rel: int, expected: float, new: float, label: str):
    off = base + rel
    cur = struct.unpack_from("<f", blob, off)[0]
    if abs(cur - expected) > 0.001:
        raise ValueError(f"{label}: expected {expected} at D+{rel}, found {cur}")
    struct.pack_into("<f", blob, off, new)
    print(f"  {label}: D+{rel} {expected:g} -> {new:g}")


def patch_levels(blob: bytes) -> bytes:
    out = bytearray(blob)
    b = data_base(out)
    print("level_index.prefabs.sb:")
    # Map-name record offsets and their verified NextLevel pointers.
    # (map_rel, map_id, next_rel, old_next, new_next, label)
    edits = [
        (112, 54, 140, 58, 91, "01_snow_planet -> 07_comm_relay"),
        (1312, 91, 1340, 97, 103, "07_comm_relay -> 09_desert_planet"),
    ]
    for mr, mid, nr, old, new, label in edits:
        patch_u32(out, b, mr, mid, mid, label + " (map check)")
        patch_u32(out, b, nr, old, new, label)
    # 09_desert_planet already terminates the chain (next == 0).
    patch_u32(out, b, 1740, 0, 0, "09_desert_planet -> end")
    return bytes(out)


def patch_healths(blob: bytes) -> bytes:
    out = bytearray(blob)
    b = data_base(out)
    print("healths.prefabs.sb:")
    # rel, expected, new, label - first float of each HealthComponent.
    edits = [
        (1504, 100.0, 160.0, "health_default (player) Health"),
        (3712, 2000.0, 1400.0, "trooper Health"),
        (3808, 2000.0, 1500.0, "trooper_elite Health"),
        (448, 3000.0, 2400.0, "boss_x1_krogan Health"),
    ]
    for rel, old, new, label in edits:
        patch_float(out, b, rel, old, new, label)
    return bytes(out)


def rebuild_inner(apk_path: str, out_path: str, level_data: bytes, health_data: bytes):
    with zipfile.ZipFile(apk_path) as apk, zipfile.ZipFile(out_path, "w") as dst:
        with zipfile.ZipFile(apk.open(INNER)) as src:
            for info in src.infolist():
                zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
                zi.compress_type = info.compress_type
                zi.comment = info.comment
                zi.extra = info.extra
                zi.internal_attr = info.internal_attr
                zi.external_attr = info.external_attr
                zi.create_system = info.create_system
                if info.filename == LEVELS:
                    dst.writestr(zi, level_data)
                elif info.filename == HEALTHS:
                    dst.writestr(zi, health_data)
                else:
                    with src.open(info) as s, dst.open(zi, "w") as d:
                        import shutil
                        shutil.copyfileobj(s, d, 1024 * 1024)
    print(f"wrote {out_path}")


def main():
    if len(sys.argv) != 3:
        print("usage: deep_mod.py <original.apk> <inner_out.zip>")
        return 1
    apk_path, out_path = sys.argv[1:3]
    with zipfile.ZipFile(apk_path) as apk:
        with zipfile.ZipFile(apk.open(INNER)) as inner:
            levels = patch_levels(inner.read(LEVELS))
            healths = patch_healths(inner.read(HEALTHS))
    rebuild_inner(apk_path, out_path, levels, healths)
    return 0


if __name__ == "__main__":
    sys.exit(main())
