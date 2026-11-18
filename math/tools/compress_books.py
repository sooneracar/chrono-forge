"""Compress Stake Engine book files to .jsonl.zst and update index.json.

The Stake Engine math upload expects the game logic as zStandard-compressed
JSON lines (math-sdk/docs/rgs_docs/data_format.md). This only changes the
container: every compressed file is decompressed again and compared byte for
byte with the original before index.json is updated. Book contents, payouts
and lookup tables are not touched.

Usage:
    pip install zstandard
    python math/tools/compress_books.py math/publish_files [--keep]
"""
import argparse
import hashlib
import json
from pathlib import Path

import zstandard


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("math_dir", type=Path, help="folder containing index.json")
    ap.add_argument("--keep", action="store_true", help="keep the uncompressed .jsonl files")
    args = ap.parse_args()

    index_path = args.math_dir / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))

    for mode in index["modes"]:
        name = mode["events"]
        if name.endswith(".jsonl.zst"):
            print(f"{mode['name']}: already {name}")
            continue
        src = args.math_dir / name
        if not src.exists():
            print(f"{mode['name']}: {name} not found - left unchanged")
            continue
        raw = src.read_bytes()
        dst = src.with_name(src.name + ".zst")
        dst.write_bytes(zstandard.ZstdCompressor(level=19).compress(raw))
        back = zstandard.ZstdDecompressor().decompress(dst.read_bytes())
        if back != raw:
            dst.unlink()
            raise SystemExit(f"{mode['name']}: round trip mismatch, nothing changed")
        mode["events"] = dst.name
        print(f"{mode['name']}: {name} -> {dst.name} "
              f"({len(raw):,} -> {dst.stat().st_size:,} bytes, sha256 {hashlib.sha256(raw).hexdigest()[:16]})")
        if not args.keep:
            src.unlink()

    index_path.write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
