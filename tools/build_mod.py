#!/usr/bin/env python3
"""Build a standalone Ghost Protocol APK from the original mod APK.

Changes:
  * package name -> com.ea.games.meinfiltrator_ghosted
  * all hardcoded Android/data paths -> new package
  * DEX descriptors and native library strings -> new package
  * English story strings -> Ghost Protocol + wave 2
  * DEX checksums / SHA-1 signatures recomputed
  * v1 + v2 signatures applied (caller runs sign scripts)

All substitutions are exactly the same byte length, so no offsets move.
"""

import hashlib
import json
import os
import shutil
import struct
import sys
import zipfile
import zlib

OLD = b"com.ea.games.meinfiltrator_gamepad"
NEW = b"com.ea.games.meinfiltrator_ghosted"
OLD_S = b"com/ea/games/meinfiltrator_gamepad"
NEW_S = b"com/ea/games/meinfiltrator_ghosted"
# JNI short names escape '_' as '_1': gamepad -> ghosted, both 7 bytes.
OLD_J = b"com_ea_games_meinfiltrator_1gamepad"
NEW_J = b"com_ea_games_meinfiltrator_1ghosted"
INNER = "assets/archiveUserData.zip"
STRINGS = "files/published/strings/ENG_US/masseffect.bin"
ASSET_INFO = "files/AssetInfo.indicate"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from me_strings import patch_bin  # noqa: E402
from deep_mod import (  # noqa: E402
    HEALTHS,
    LEVELS,
    patch_healths,
    patch_levels,
)


def swap(data: bytes) -> bytes:
    data = data.replace(OLD, NEW).replace(OLD_S, NEW_S).replace(OLD_J, NEW_J)
    return data


def fix_dex(data: bytes) -> bytes:
    data = bytearray(data)
    struct.pack_into("<I", data, 12, 0)  # clear signature before hashing
    sig = hashlib.sha1(data[32:]).digest()
    data[12:32] = sig
    checksum = zlib.adler32(data[12:]) & 0xFFFFFFFF
    struct.pack_into("<I", data, 8, checksum)
    return bytes(data)


def clone_info(info: zipfile.ZipInfo) -> zipfile.ZipInfo:
    zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
    zi.compress_type = info.compress_type
    zi.comment = info.comment
    zi.extra = info.extra
    zi.internal_attr = info.internal_attr
    zi.external_attr = info.external_attr
    zi.create_system = info.create_system
    return zi


def make_inner(apk: zipfile.ZipFile, bin_path: str, tmp_path: str):
    patched = open(bin_path, "rb").read()
    with zipfile.ZipFile(apk.open(INNER)) as src, zipfile.ZipFile(tmp_path, "w") as dst:
        for info in src.infolist():
            zi = clone_info(info)
            if info.filename == STRINGS:
                dst.writestr(zi, patched)
            elif info.filename == ASSET_INFO:
                payload = swap(src.read(info))
                zi.comment = swap(zi.comment)
                dst.writestr(zi, payload)
            elif info.filename == LEVELS:
                dst.writestr(zi, patch_levels(src.read(info)))
            elif info.filename == HEALTHS:
                dst.writestr(zi, patch_healths(src.read(info)))
            else:
                with src.open(info) as s, dst.open(zi, "w") as d:
                    shutil.copyfileobj(s, d, 1024 * 1024)


def build(apk_path: str, bin_path: str, out_path: str):
    tmp = "/tmp/opencode/build_mod_inner.zip"
    with zipfile.ZipFile(apk_path) as apk:
        make_inner(apk, bin_path, tmp)
        with zipfile.ZipFile(out_path, "w") as out:
            for info in apk.infolist():
                if info.filename.startswith("META-INF/"):
                    continue
                zi = clone_info(info)
                name = info.filename
                if name == INNER:
                    zi.compress_type = zipfile.ZIP_DEFLATED
                    with open(tmp, "rb") as s, out.open(zi, "w") as d:
                        shutil.copyfileobj(s, d, 1024 * 1024)
                elif name in ("AndroidManifest.xml", "resources.arsc"):
                    data = swap(apk.read(info).replace(
                        OLD.decode().encode("utf-16-le"),
                        NEW.decode().encode("utf-16-le")))
                    out.writestr(zi, data)
                elif name in ("classes.dex", "classes2.dex"):
                    out.writestr(zi, fix_dex(swap(apk.read(info))))
                elif name.startswith("lib/"):
                    out.writestr(zi, swap(apk.read(info)))
                else:
                    with apk.open(info) as s, out.open(zi, "w") as d:
                        shutil.copyfileobj(s, d, 1024 * 1024)
    print(f"built {out_path}")


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        print("usage: build_mod.py <original.apk> <patched.bin> <out.apk>")
        return 1
    build(*sys.argv[1:4])
    return 0


if __name__ == "__main__":
    sys.exit(main())
