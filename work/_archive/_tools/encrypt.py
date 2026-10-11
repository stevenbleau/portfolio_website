#!/usr/bin/env python3
"""Encrypt case study HTML for a password-gated page.

Usage:
    python3 encrypt.py <fragment.html> <password>

Prints a base64 blob to paste into the page's `data-enc` attribute. Only the
blob ever ships; the plaintext and the password stay on your machine.

Format (matches js/gate.js):
    base64( salt[16] || iv[12] || AES-GCM ciphertext+tag )
    key = PBKDF2-HMAC-SHA256(password, salt, 250000 iterations, 256 bit)

Requires: pip install cryptography
"""
import base64
import os
import sys

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ITERATIONS = 250_000


def encrypt(plaintext: bytes, password: str) -> str:
    salt = os.urandom(16)
    iv = os.urandom(12)
    key = PBKDF2HMAC(
        algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERATIONS
    ).derive(password.encode("utf-8"))
    ct = AESGCM(key).encrypt(iv, plaintext, None)
    return base64.b64encode(salt + iv + ct).decode("ascii")


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    path, password = sys.argv[1], sys.argv[2]
    with open(path, "rb") as fh:
        blob = encrypt(fh.read(), password)
    print(blob)
    print(f"\n{len(blob)} chars — paste into data-enc=\"...\"", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
