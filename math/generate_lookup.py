import csv
import json
import os
import random
from pathlib import Path

# ============================================================================
# AETHER DIAL — STAKE ENGINE MATH SDK & LOOKUP TABLE GENERATOR
# Generates deterministic round books & Stake RGS lookup tables for:
#   - BASE mode (1x wager)
#   - BONUS mode (100x Bonus Buy, guaranteed 3+ Scatter Keys on spin 1)
# ============================================================================

PAYTABLE = {
    "NUT": 0.35,
    "SPRING": 0.75,
    "GEAR": 1.60,
    "SAPPHIRE": 3.20,
    "EMERALD": 6.50,
    "RUBY": 16.00,
    "WILD": 28.00,
}

RING_OUTER = [
    "NUT", "SPRING", "GEAR", "NUT", "SAPPHIRE", "SPRING",
    "NUT", "GEAR", "EMERALD", "NUT", "SPRING", "WILD",
    "NUT", "GEAR", "SPRING", "SAPPHIRE", "NUT", "RUBY",
    "SPRING", "NUT", "GEAR", "NUT", "KEY", "WILD",
    "NUT", "GEAR", "SAPPHIRE", "SPRING", "NUT", "EMERALD",
    "GEAR", "NUT", "SPRING", "NUT", "RUBY", "KEY",
]

RING_MIDDLE = [
    "SPRING", "NUT", "GEAR", "NUT", "SAPPHIRE", "SPRING",
    "GEAR", "NUT", "EMERALD", "SPRING", "NUT", "WILD",
    "GEAR", "NUT", "SPRING", "NUT", "SAPPHIRE", "GEAR",
    "NUT", "SPRING", "RUBY", "NUT", "KEY", "WILD",
    "SPRING", "NUT", "GEAR", "NUT", "SAPPHIRE", "SPRING",
    "NUT", "EMERALD", "GEAR", "NUT", "RUBY", "KEY",
]

RING_INNER = [
    "NUT", "GEAR", "SPRING", "NUT", "SAPPHIRE", "GEAR",
    "NUT", "SPRING", "EMERALD", "NUT", "GEAR", "WILD",
    "SPRING", "NUT", "GEAR", "NUT", "SAPPHIRE", "SPRING",
    "NUT", "GEAR", "RUBY", "SPRING", "KEY", "WILD",
    "GEAR", "NUT", "SPRING", "SAPPHIRE", "NUT", "EMERALD",
    "SPRING", "NUT", "GEAR", "NUT", "RUBY", "KEY",
]

MULTIPLIERS = [1, 2, 3, 5, 8, 12, 20, 35, 50, 100]
POINTER_OFFSETS = [0, 3, 6, 9]
MAX_WIN_MULT = 5000.0
BONUS_BUY_COST_MULT = 100.0
RING_LEN = len(RING_OUTER)


def get_visible(ring, start_pos):
    return [ring[(start_pos + k) % RING_LEN] for k in range(12)]


def evaluate_pointers(s_out, s_mid, s_in):
    win_base = 0.0
    key_count = 0
    matched_pointers = []

    for p in POINTER_OFFSETS:
        syms = [s_out[p], s_mid[p], s_in[p]]
        key_count += syms.count("KEY")
        if "KEY" in syms:
            continue

        non_wild = [s for s in syms if s != "WILD"]
        if len(non_wild) == 0:
            win_base += PAYTABLE["WILD"]
            matched_pointers.append(p)
        elif len(set(non_wild)) == 1:
            win_base += PAYTABLE[non_wild[0]]
            matched_pointers.append(p)

    return round(win_base, 4), len(matched_pointers) > 0, key_count, matched_pointers


def build_bonus_guaranteed_pool():
    valid = []
    for o in range(RING_LEN):
        for m in range(RING_LEN):
            for i in range(RING_LEN):
                _, _, keys, _ = evaluate_pointers(
                    get_visible(RING_OUTER, o),
                    get_visible(RING_MIDDLE, m),
                    get_visible(RING_INNER, i),
                )
                if keys >= 3:
                    valid.append((o, m, i))
    return valid


BONUS_TRIGGER_POOL = build_bonus_guaranteed_pool()


def simulate_round(rng, is_bonus_buy=False):
    free_spins = 0
    mult_idx = 0
    total_payout_mult = 0.0
    events = []
    spin_number = 0

    while True:
        is_free_spin = free_spins > 0
        if is_free_spin:
            free_spins -= 1
        else:
            mult_idx = 0

        if spin_number == 0 and is_bonus_buy:
            pos_out, pos_mid, pos_in = rng.choice(BONUS_TRIGGER_POOL)
        else:
            pos_out = rng.randrange(RING_LEN)
            pos_mid = rng.randrange(RING_LEN)
            pos_in = rng.randrange(RING_LEN)

        step = 0
        while step < 25:
            s_out = get_visible(RING_OUTER, pos_out)
            s_mid = get_visible(RING_MIDDLE, pos_mid)
            s_in = get_visible(RING_INNER, pos_in)
            win_base, has_win, key_count, matched_pointers = evaluate_pointers(s_out, s_mid, s_in)

            awarded_fs = 0
            if step == 0 and key_count >= 3:
                awarded_fs = 5 if is_free_spin else 8
                free_spins += awarded_fs

            active_mult = MULTIPLIERS[min(mult_idx, len(MULTIPLIERS) - 1)]
            step_win = round(win_base * active_mult, 4) if has_win else 0.0
            total_payout_mult = min(round(total_payout_mult + step_win, 4), MAX_WIN_MULT)

            events.append({
                "spin": spin_number + 1,
                "cascade": step + 1,
                "positions": [pos_out, pos_mid, pos_in],
                "multiplier": active_mult,
                "winMult": step_win,
                "freeSpinsAwarded": awarded_fs,
                "freeSpinsRemaining": free_spins,
                "matchedPointers": matched_pointers,
            })

            if has_win and total_payout_mult < MAX_WIN_MULT:
                mult_idx += 1
                pos_out = (pos_out - 1) % RING_LEN
                pos_mid = (pos_mid - 2) % RING_LEN
                pos_in = (pos_in - 3) % RING_LEN
                step += 1
            else:
                break

        spin_number += 1
        if free_spins <= 0 or total_payout_mult >= MAX_WIN_MULT:
            break

    # Convert multiplier into Stake RGS integer payout units (1x bet = 1,000,000 units)
    payout_units = int(round(total_payout_mult * 1_000_000))
    return payout_units, total_payout_mult, events


def generate_mode_files(out_dir: Path, mode_name: str, rounds_count: int, cost_mult: float, seed: int):
    rng = random.Random(seed)
    lookup_path = out_dir / f"lookup_table_{mode_name}.csv"
    books_path = out_dir / f"books_{mode_name}.json"

    total_payout_mult = 0.0
    max_hit = 0.0
    win_rounds = 0
    books = []

    with lookup_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        # Stake Engine standard columns: book_id, weight, payout_multiplier_units
        for book_id in range(1, rounds_count + 1):
            payout_units, payout_mult, events = simulate_round(rng, is_bonus_buy=(mode_name == "bonus"))
            writer.writerow([book_id, 1, payout_units])

            total_payout_mult += payout_mult
            if payout_mult > 0:
                win_rounds += 1
            if payout_mult > max_hit:
                max_hit = payout_mult

            books.append({
                "id": book_id,
                "payoutMultiplier": payout_units,
                "events": events,
            })

    with books_path.open("w", encoding="utf-8") as jf:
        json.dump({"game": "AETHER_DIAL", "mode": mode_name.upper(), "books": books}, jf, separators=(",", ":"))

    rtp_pct = (total_payout_mult / (rounds_count * cost_mult)) * 100.0
    hit_rate_pct = (win_rounds / rounds_count) * 100.0
    return {
        "mode": mode_name.upper(),
        "simulatedRounds": rounds_count,
        "costMultiplier": cost_mult,
        "simulatedRTP": round(rtp_pct, 2),
        "hitFrequencyPct": round(hit_rate_pct, 2),
        "maxObservedMultiplier": round(max_hit, 2),
    }


def main():
    out_dir = Path("math/output")
    out_dir.mkdir(parents=True, exist_ok=True)

    base_stats = generate_mode_files(out_dir, "base", rounds_count=100_000, cost_mult=1.0, seed=20261117)
    bonus_stats = generate_mode_files(out_dir, "bonus", rounds_count=25_000, cost_mult=BONUS_BUY_COST_MULT, seed=20261118)

    report = {
        "gameTitle": "AETHER DIAL",
        "version": "1.0.0",
        "maxWinCap": MAX_WIN_MULT,
        "modes": [base_stats, bonus_stats],
    }

    report_path = out_dir / "rtp_certification_report.json"
    with report_path.open("w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2)

    print("=== AETHER DIAL MATH SDK REPORT ===")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
