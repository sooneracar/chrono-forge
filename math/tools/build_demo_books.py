"""Build local-demo book samples for the frontend from a Stake Engine math package.

Reads the published math files (index.json, books_*.jsonl.zst, lookUpTable_*.csv)
WITHOUT modifying them and writes:

    frontend/demo/manifest.json
    frontend/demo/books_<mode>.json

Each mode file holds N books drawn with replacement in proportion to the
lookup-table weight, so the browser demo can pick uniformly and still follow
the published distribution. The demo never generates outcomes itself.

Usage:
    pip install zstandard
    python math/tools/build_demo_books.py math/publish_files --samples 2000
"""
import argparse
import csv
import io
import json
import random
from pathlib import Path


def read_jsonl_zst(path: Path):
    import zstandard  # pip install zstandard

    with path.open("rb") as fh:
        reader = zstandard.ZstdDecompressor().stream_reader(fh)
        for line in io.TextIOWrapper(reader, encoding="utf-8"):
            line = line.strip()
            if line:
                yield json.loads(line)


def read_weights(path: Path):
    ids, weights, payouts = [], [], {}
    with path.open(newline="", encoding="utf-8") as fh:
        for row in csv.reader(fh):
            if not row:
                continue
            book_id, weight, payout = int(row[0]), int(row[1]), int(row[2])
            ids.append(book_id)
            weights.append(weight)
            payouts[book_id] = payout
    return ids, weights, payouts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("math_dir", type=Path, help="folder containing index.json")
    ap.add_argument("--out", type=Path, default=Path("frontend/demo"))
    ap.add_argument("--samples", type=int, default=2000)
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()

    index = json.loads((args.math_dir / "index.json").read_text(encoding="utf-8"))
    args.out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)
    manifest = {"source": "index.json", "modes": []}

    for mode in index["modes"]:
        ids, weights, payouts = read_weights(args.math_dir / mode["weights"])
        wanted = rng.choices(ids, weights=weights, k=args.samples)
        wanted_set = set(wanted)

        books = {}
        for book in read_jsonl_zst(args.math_dir / mode["events"]):
            if book["id"] in wanted_set:
                if int(book["payoutMultiplier"]) != payouts[book["id"]]:
                    raise SystemExit(f"payout mismatch for book {book['id']} in mode {mode['name']}")
                books[book["id"]] = book
        sample = [books[i] for i in wanted]

        out_name = f"books_{mode['name']}.json"
        (args.out / out_name).write_text(json.dumps(sample, separators=(",", ":")), encoding="utf-8")
        total_w = sum(weights)
        rtp = sum(w * payouts[i] for i, w in zip(ids, weights)) / total_w / 100 / float(mode["cost"])
        manifest["modes"].append({"name": mode["name"], "cost": mode["cost"], "file": out_name})
        print(f"{mode['name']}: {len(sample)} books sampled, lookup-table RTP {rtp:.4%}")

    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
