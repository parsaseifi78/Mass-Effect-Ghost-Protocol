#!/usr/bin/env python3
"""Add a valid APK Signature Scheme v2 block to an APK using openssl.

Based on the structure of the original APK's own v2 block:
  pair id 0x7109871a -> value = uint32 sequence_len + sequence of signers
  signer = lp(signed_data) + lp(signatures) + lp(public_key)
  signed_data = lp(digests) + lp(certificates) + lp(attributes)
  digests = for each algorithm (1=CHUNKED_SHA256): uint32 id + lp(digest)

The content digest covers three sections as one stream of 1 MiB chunks:
  1. ZIP entries, from byte 0 to APK Signing Block start
  2. Central Directory
  3. EOCD with the CD offset field replaced by the signing block offset
"""

import hashlib
import os
import struct
import subprocess
import sys

CHUNK = 1024 * 1024
V2_ID = 0x7109871A
MAGIC = b"APK Sig Block 42"
SIG_RSA_PKCS1_SHA256 = 0x0201  # openssl dgst -sha256 -sign
DIGEST_CHUNKED_SHA256 = 1


def lp(data: bytes) -> bytes:
    return struct.pack("<I", len(data)) + data


def chunk_digests(data: bytes) -> list:
    out = []
    for i in range(0, len(data), CHUNK):
        part = data[i:i + CHUNK]
        out.append(hashlib.sha256(b"\xa5" + struct.pack("<I", len(part)) + part).digest())
    return out


def content_digest(sections) -> bytes:
    # Each of the three sections is chunked independently; their chunk digests
    # are concatenated, then hashed once with the 0x5a final chunk.
    parts = []
    for section in sections:
        parts.extend(chunk_digests(section))
    return hashlib.sha256(b"\x5a" + struct.pack("<I", len(parts)) + b"".join(parts)).digest()


def find_eocd(data: bytes):
    pos = data.rfind(b"PK\x05\x06")
    if pos < 0:
        raise ValueError("EOCD not found")
    return pos, struct.unpack_from("<I", data, pos + 16)[0]


def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def sign_v2(path: str, key: str, cert: str, out: str):
    tmp = "/tmp/opencode/v2sign"
    os.makedirs(tmp, exist_ok=True)
    data = open(path, "rb").read()
    eocd_off, cd_off = find_eocd(data)

    # The block is inserted exactly at cd_off.
    eocd_for_digest = bytearray(data[eocd_off:])
    struct.pack_into("<I", eocd_for_digest, 16, cd_off)
    digest = content_digest((data[:cd_off], data[cd_off:eocd_off], bytes(eocd_for_digest)))

    digests = struct.pack("<I", DIGEST_CHUNKED_SHA256) + lp(digest)
    run(["openssl", "x509", "-in", cert, "-outform", "DER", "-out", f"{tmp}/cert.der"])
    cert_der = open(f"{tmp}/cert.der", "rb").read()
    run(["openssl", "rsa", "-in", key, "-pubout", "-outform", "DER", "-out", f"{tmp}/pub.der"])
    pub_der = open(f"{tmp}/pub.der", "rb").read()

    signed_data = lp(digests) + lp(lp(cert_der)) + lp(b"")
    open(f"{tmp}/signed.bin", "wb").write(signed_data)
    run(["openssl", "dgst", "-sha256", "-sign", key,
         "-out", f"{tmp}/sig.bin", f"{tmp}/signed.bin"])
    signature = open(f"{tmp}/sig.bin", "rb").read()

    signatures = struct.pack("<I", SIG_RSA_PKCS1_SHA256) + lp(signature)
    signer = lp(signed_data) + lp(signatures) + lp(pub_der)

    # value = sequence of signers, itself wrapped in a uint32 length.
    value = lp(signer)
    pair = struct.pack("<Q", 4 + len(value)) + struct.pack("<I", V2_ID) + value
    block_size = len(pair) + 8 + len(MAGIC)  # excludes leading uint64
    block = (struct.pack("<Q", block_size) + pair +
             struct.pack("<Q", block_size) + MAGIC)

    new_eocd = bytearray(data[eocd_off:])
    struct.pack_into("<I", new_eocd, 16, cd_off + len(block))
    with open(out, "wb") as f:
        f.write(data[:cd_off])
        f.write(block)
        f.write(data[cd_off:eocd_off])
        f.write(new_eocd)
    print(f"v2 signed {out}")


def verify(path: str, key: str, cert: str):
    import zipfile
    data = open(path, "rb").read()
    eocd_off, cd_off_new = find_eocd(data)
    m = data.rfind(MAGIC)
    block_size = struct.unpack_from("<Q", data, m - 8)[0]
    block_start = m + 8 - block_size
    assert cd_off_new == m + 16, (cd_off_new, m)
    assert struct.unpack_from("<Q", data, block_start)[0] == block_size
    p = block_start + 8
    end = m - 8
    found = False
    while p < end:
        plen = struct.unpack_from("<Q", data, p)[0]
        ident = struct.unpack_from("<I", data, p + 8)[0]
        if ident == V2_ID:
            found = True
        p += 8 + plen
    assert found, "v2 block missing"
    with zipfile.ZipFile(path) as z:
        print("zip:", z.testzip() or "OK", "entries:", len(z.infolist()))


def main():
    if len(sys.argv) < 5:
        print(__doc__)
        print("usage: sign_v2.py <apk> <key.pem> <cert.pem> <out.apk>")
        return 1
    sign_v2(*sys.argv[1:5])
    if "--verify" in sys.argv:
        verify(sys.argv[4], sys.argv[2], sys.argv[3])
    return 0


if __name__ == "__main__":
    sys.exit(main())
