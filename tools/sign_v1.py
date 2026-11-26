#!/usr/bin/env python3
"""Apply a JAR (APK v1) signature to an unsigned APK using openssl.

This is a fallback for devices that accept v1-signed APKs.  If installation is
rejected, sign with apksigner / uber-apk-signer on a Windows PC instead.
"""

import base64
import hashlib
import os
import subprocess
import sys
import zipfile


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def entry(name: str, digest: str) -> bytes:
    return f"Name: {name}\r\nSHA1-Digest: {digest}\r\n\r\n".encode("ascii")


def make_manifest(z: zipfile.ZipFile):
    manifest = b"Manifest-Version: 1.0\r\n\r\n"
    sections = []
    for info in z.infolist():
        if info.is_dir() or info.filename.startswith("META-INF/"):
            continue
        digest = b64(hashlib.sha1(z.read(info)).digest())
        sec = entry(info.filename, digest)
        manifest += sec
        sections.append((info.filename, sec))
    return manifest, sections


def make_sf(manifest: bytes, sections):
    sf = ("Signature-Version: 1.0\r\n"
          "Created-By: ME-Infiltrator-Resurrection\r\n"
          "X-Android-APK-Signed: 2\r\n"
          f"SHA1-Digest-Manifest: {b64(hashlib.sha1(manifest).digest())}\r\n\r\n").encode("ascii")
    for name, sec in sections:
        sf += entry(name, b64(hashlib.sha1(sec).digest()))
    return sf


def sign(apk_path: str, key: str, cert: str, out_path: str):
    import shutil
    shutil.copyfile(apk_path, out_path)
    with zipfile.ZipFile(out_path) as z:
        manifest, sections = make_manifest(z)
    sf = make_sf(manifest, sections)

    tmpdir = "/tmp/opencode/v1sign"
    os.makedirs(tmpdir, exist_ok=True)
    sf_path = os.path.join(tmpdir, "CERT.SF")
    sig_path = os.path.join(tmpdir, "CERT.RSA")
    with open(sf_path, "wb") as f:
        f.write(sf)
    subprocess.run([
        "openssl", "cms", "-sign", "-binary",
        "-in", sf_path, "-signer", cert, "-inkey", key,
        "-outform", "DER", "-out", sig_path,
        "-md", "sha1", "-nosmimecap",
    ], check=True)
    with open(sig_path, "rb") as f:
        signature = f.read()

    with zipfile.ZipFile(out_path, "a") as z:
        z.writestr("META-INF/MANIFEST.MF", manifest)
        z.writestr("META-INF/CERT.SF", sf)
        z.writestr("META-INF/CERT.RSA", signature)
    print(f"signed {out_path}")


def main():
    if len(sys.argv) != 5:
        print(__doc__)
        print("usage: sign_v1.py <unsigned.apk> <key.pem> <cert.pem> <signed.apk>")
        return 1
    sign(*sys.argv[1:])
    return 0


if __name__ == "__main__":
    sys.exit(main())
