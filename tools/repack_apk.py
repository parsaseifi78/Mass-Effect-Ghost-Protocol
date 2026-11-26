#!/usr/bin/env python3
"""Rebuild an Infiltrator APK with a patched English string table.

The modified strings file is swapped inside assets/archiveUserData.zip, then
the outer APK is rebuilt without its old (now invalid) META-INF signature.
The result is unsigned and must be signed before it can be installed.
"""

import copy
import os
import shutil
import sys
import tempfile
import zipfile

INNER = "assets/archiveUserData.zip"
STRINGS = "files/published/strings/ENG_US/masseffect.bin"


def clone_info(info: zipfile.ZipInfo) -> zipfile.ZipInfo:
    zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
    zi.compress_type = info.compress_type
    zi.comment = info.comment
    zi.extra = info.extra
    zi.internal_attr = info.internal_attr
    zi.external_attr = info.external_attr
    zi.create_system = info.create_system
    zi.flag_bits = info.flag_bits & ~0x1  # clear encryption bit
    return zi


def rebuild_inner(apk: zipfile.ZipFile, patched_bin: bytes, tmp_path: str):
    with zipfile.ZipFile(tmp_path, "w") as out:
        with zipfile.ZipFile(apk.open(INNER)) as inner:
            for info in inner.infolist():
                zi = clone_info(info)
                if info.filename == STRINGS:
                    out.writestr(zi, patched_bin)
                else:
                    with inner.open(info) as src, out.open(zi, "w") as dst:
                        shutil.copyfileobj(src, dst, 1024 * 1024)


def repack(apk_path: str, bin_path: str, out_path: str):
    with open(bin_path, "rb") as f:
        patched_bin = f.read()

    tmpdir = tempfile.mkdtemp(prefix="me_repack_", dir="/tmp/opencode")
    tmp_inner = os.path.join(tmpdir, "archiveUserData.zip")
    try:
        with zipfile.ZipFile(apk_path) as apk:
            rebuild_inner(apk, patched_bin, tmp_inner)
            with zipfile.ZipFile(out_path, "w") as out:
                for info in apk.infolist():
                    if info.filename.startswith("META-INF/"):
                        continue
                    zi = clone_info(info)
                    if info.filename == INNER:
                        zi.compress_type = zipfile.ZIP_DEFLATED
                        with open(tmp_inner, "rb") as src, out.open(zi, "w") as dst:
                            shutil.copyfileobj(src, dst, 1024 * 1024)
                    else:
                        with apk.open(info) as src, out.open(zi, "w") as dst:
                            shutil.copyfileobj(src, dst, 1024 * 1024)
        print(f"wrote {out_path}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def verify(original: str, patched: str):
    with zipfile.ZipFile(original) as a, zipfile.ZipFile(patched) as b:
        an = [i.filename for i in a.infolist() if not i.filename.startswith("META-INF/")]
        bn = [i.filename for i in b.infolist()]
        print("entry lists match:", an == bn)
        print("bad entry in patched:", b.testzip() or "none")
        with zipfile.ZipFile(a.open(INNER)) as ai, zipfile.ZipFile(b.open(INNER)) as bi:
            sizes_a = {i.filename: i.file_size for i in ai.infolist()}
            sizes_b = {i.filename: i.file_size for i in bi.infolist()}
            print("inner entries:", len(sizes_a), len(sizes_b), "match:", sizes_a == sizes_b)


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        print("usage: repack_apk.py <original.apk> <patched.bin> <out.apk> [--verify]")
        return 1
    repack(sys.argv[1], sys.argv[2], sys.argv[3])
    if "--verify" in sys.argv:
        verify(sys.argv[1], sys.argv[3])
    return 0


if __name__ == "__main__":
    sys.exit(main())
