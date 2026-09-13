"""SLICE-06 bounded synthetic capacity probe.

Purpose: sanity-check PLAN.md's proposed chunk bounds (<=1 MiB and 1,000 facts per chunk,
<=200 chunks per capability) against synthetic fact records shaped like the actual proposed
v2 wire format (Decimal-as-string, ISO dates, explicit currency/unit, provenance fields) --
NOT against any real Tally data (none of the blocked domains have any). This is a size/volume
sanity check, not a feasibility proof for any domain's field list.

Run: python docs/specs/changes/003-essential-tally-data-foundation/evidence/capacity_probe.py
No network, no database, no Tally connection. Deterministic (fixed seed).
"""
import json
import random
import string
import statistics

random.seed(20260906)

CHUNK_BYTE_LIMIT = 1024 * 1024  # 1 MiB, per PLAN.md section 3
CHUNK_FACT_LIMIT = 1000
MAX_CHUNKS_PER_CAPABILITY = 200


def _random_name(min_len=8, max_len=28):
    length = random.randint(min_len, max_len)
    return "".join(random.choices(string.ascii_letters + " ", k=length)).strip() or "A"


def synthetic_voucher_fact(worst_case: bool) -> dict:
    """One synthetic fact shaped like a proposed voucher-line record.

    `worst_case=True` uses generously long names/references to probe the pessimistic end
    (long party names, multi-line item descriptions) rather than a typical-length record.
    """
    name_len = (40, 80) if worst_case else (8, 28)
    ref_len = (20, 40) if worst_case else (4, 16)
    return {
        "voucher_guid": "".join(random.choices("0123456789abcdef-", k=52)),
        "voucher_type": random.choice(["Sales", "Purchase", "Receipt", "Payment", "Journal"]),
        "voucher_number": _random_name(*ref_len),
        "voucher_date": "2026-04-01",
        "party_name": _random_name(*name_len),
        "party_guid": "".join(random.choices("0123456789abcdef-", k=52)),
        "gross_value": "1234567.89",
        "taxable_value": "1046244.82",
        "currency": "INR",
        "narration": _random_name(*name_len) if worst_case else None,
        "item_lines": [
            {
                "item_name": _random_name(*name_len),
                "quantity": "12.500",
                "unit": "Nos",
                "rate": "987.65",
                "amount": "12345.63",
            }
            for _ in range(3 if worst_case else 1)
        ],
        "source_run_id": "".join(random.choices("0123456789abcdef-", k=36)),
        "accepted_generation": random.randint(1, 999),
        "first_seen_at": "2026-04-01T10:15:00+05:30",
        "latest_seen_at": "2026-09-06T09:00:00+05:30",
    }


def probe(worst_case: bool, label: str) -> None:
    facts = [synthetic_voucher_fact(worst_case) for _ in range(CHUNK_FACT_LIMIT)]
    payload = json.dumps({"facts": facts}, separators=(",", ":"))
    size = len(payload.encode("utf-8"))
    per_fact_sizes = [len(json.dumps(f, separators=(",", ":")).encode("utf-8")) for f in facts]

    print(f"--- {label} ---")
    print(f"facts in chunk: {len(facts)} (limit {CHUNK_FACT_LIMIT})")
    print(f"chunk payload bytes: {size:,} (limit {CHUNK_BYTE_LIMIT:,})")
    print(f"fits within 1 MiB byte bound: {size <= CHUNK_BYTE_LIMIT}")
    print(f"mean/min/max bytes per fact: "
          f"{statistics.mean(per_fact_sizes):.0f} / {min(per_fact_sizes)} / {max(per_fact_sizes)}")
    if size > CHUNK_BYTE_LIMIT:
        safe_fact_count = int(CHUNK_FACT_LIMIT * CHUNK_BYTE_LIMIT / size)
        print(f"NOTE: 1,000-fact chunk exceeds 1 MiB at this record size; "
              f"byte bound would clamp chunks to ~{safe_fact_count} facts, not 1,000.")
    print()


def capability_scale_check() -> None:
    max_facts_per_capability = CHUNK_FACT_LIMIT * MAX_CHUNKS_PER_CAPABILITY
    print("--- capability-level scale ---")
    print(f"max chunks per capability: {MAX_CHUNKS_PER_CAPABILITY}")
    print(f"=> max facts per capability per run: {max_facts_per_capability:,}")
    print("Reference volumes (not measured -- typical SMB estimates for context only):")
    print("  ~5,000 vouchers/year small trader  -> well within bound")
    print("  ~50,000 vouchers/year larger trading company -> within bound")
    print("  200,000-fact ceiling has no confirmed real company evidence behind it; "
          "flagged as an assumption to revisit once G07 representative companies exist.")
    print()


if __name__ == "__main__":
    probe(worst_case=False, label="typical-length synthetic voucher records")
    probe(worst_case=True, label="worst-case-length synthetic voucher records (long names/narration)")
    capability_scale_check()
