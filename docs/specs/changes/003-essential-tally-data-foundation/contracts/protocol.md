# Contract: Protocol, storage and profile decision records (SLICE-06)

| Field | Value |
|---|---|
| Change | 003 |
| Slice | SLICE-06 — Protocol, storage and profile decision records |
| Status | Ready for owner review — lasting decisions below require owner acceptance before SLICE-08 |
| Requirements | REQ-008, REQ-009, REQ-012, REQ-013, REQ-015, REQ-040, REQ-045, REQ-055 |
| Prerequisites | SLICE-02 (receivables mapped; payables/03/04/05 blocked — see `EVIDENCE.md`) |
| Related ADRs | ADR-004 (protocol/generation), ADR-005 (storage/provenance), ADR-006 (profile/credential) — all Proposed |

This slice does not depend on the still-blocked domain evidence (5.2/5.4–5.11): it designs the
*shape* of the sync protocol, storage boundary, and profile migration, which are domain-agnostic.
Where a domain-specific decision would leak in (e.g. an exact payload field list), this document
says so explicitly rather than filling it from `PLAN.md`'s unverified candidate table.

## 1. Route/payload/error schemas

Building on `PLAN.md` §3's proposed route table, this section fixes exact shapes.

### 1.1 Routes (draft, additive to `/v1/*`)

| Route | Method | Auth | Request | Success | Rejection cases (before any mutation) |
|---|---|---|---|---|---|
| `/v2/devices/pairing-preview` | POST | pairing code in body | `{code}` | `{workspace_name, tally_company_name, tally_company_guid, allowed_capabilities[]}` | expired/reused code (410), unknown code (404) |
| `/v2/devices/register` | POST | pairing code in body | `{code, confirmed_company_guid, initial_enabled_capabilities[], protocol_version}` | `{device_token, configuration_revision}` | code mismatch (409), GUID mismatch (409), already-registered workspace (409 unless explicit safe-recovery flow) |
| `/v2/devices/config` | GET | device token | — | `{allowed[], enabled[], supporting[], protocol_version, configuration_revision}` | revoked/unknown token (401) |
| `/v2/sync/runs` | POST | device token | `{company_guid, cleanup_generation, extractor_version, configuration_revision, capability_manifest{cap: {mode, period, ...}}}` | `{run_id}` (immutable once issued) | wrong company (403), stale `cleanup_generation`/`configuration_revision` (409), unauthorized capability in manifest (403) |
| `PUT /v2/sync/runs/{run_id}/capabilities/{cap}/chunks/{index}` | PUT | device token, owning run | `{digest, facts[]}`, body `<=1 MiB` | `{accepted: true}` (idempotent by `(run_id, cap, index, digest)`) | digest reused with different bytes (409 conflict, per REQ-008); index/digest replay with identical bytes returns saved 200, not an error |
| `POST /v2/sync/runs/{run_id}/capabilities/{cap}/complete` | POST | device token, owning run | `{expected_chunk_count, manifest_digest}` | `{result: accepted\|accepted_with_warnings\|requires_verification\|quarantined, counters{...}}` | incomplete chunk set (409), stale base generation (409) |
| `GET /v2/sync/runs/{run_id}` | GET | device token, owning run/workspace | — | saved per-capability result (lost-response recovery, REQ-008) | wrong device/workspace (403) |

Every write validates company/device/domain authorization and generation freshness **before**
touching staged or canonical state (REQ-051). A conflict response never partially applies.

### 1.2 Error envelope (uniform across `/v2/*`)

```json
{"error": {"code": "STALE_GENERATION", "message": "...", "capability": "receivables", "retriable": true}}
```

`code` is a fixed enum (`STALE_GENERATION`, `DIGEST_CONFLICT`, `UNAUTHORIZED_CAPABILITY`,
`WRONG_COMPANY`, `RUN_NOT_FOUND`, `CHUNK_OUT_OF_BOUNDS`, `INCOMPLETE_MANIFEST`, ...) so the
connector can branch without parsing prose. `retriable` distinguishes "retry the same request
verbatim" (lost response) from "re-extract and start a new run" (stale generation) — conflating
these two would violate REQ-008's idempotent-retry guarantee by encouraging blind retries that
can never succeed.

### 1.3 Value encoding (fixes PLAN.md §3's open items)

- Decimal amounts: JSON strings, e.g. `"1234567.89"` — never a JSON number (float precision).
- Dates: ISO-8601 date-only (`"2026-04-01"`) for accounting dates without a time component.
- Timestamps: ISO-8601 with explicit offset (`"2026-09-06T09:00:00+05:30"`), never a bare
  local time or a Unix epoch integer.
- Currency: an explicit `"currency": "INR"` field on every value carrier; no implicit default.
- No field is permitted to carry raw XML at any point in this protocol (REQ-011).

## 2. Generation rules and shared-master versioning

- Every workspace carries one **configuration revision** (allowed/enabled capability set) and
  one **cleanup generation** (bumped by data-cleanup). A sync run pins both at creation; a stale
  value on submission is rejected before any write (protects REQ-045: no last-writer-wins across
  devices).
- Every accepted capability publish bumps that capability's own **accepted generation** counter.
  A shared master (e.g., a ledger referenced by both Receivables and Ledgers capabilities) is
  stored as an explicit versioned snapshot keyed by the generation that last confirmed it, so
  accepting one capability never silently changes what another already-accepted capability meant
  by that master (PLAN.md §3's "shared masters retain versioned snapshots" requirement, made
  concrete: a foreign key to a specific master *version* row, not a mutable master row).
- Chunk immutability: `(run_id, capability, chunk_index)` is a natural key; the same key with a
  different `digest` is a conflict (REQ-008 "reusing an ID with different content"), the same key
  with the same `digest` returns the previously stored acceptance result.

## 3. Staging bounds — revised by the capacity probe (this slice's required demonstration)

`PLAN.md`'s proposed bounds were: <=1 MiB **and** <=1,000 facts per chunk, <=200 chunks per
capability, one active run per device/profile, 30-minute local deadline.

**The bounded synthetic probe found the two per-chunk bounds are not simultaneously safe as
independent limits.** `evidence/capacity_probe.py` (deterministic, seeded, no network/DB/Tally —
rerun with `python docs/specs/changes/003-essential-tally-data-foundation/evidence/capacity_probe.py`)
serializes 1,000 synthetic voucher-shaped facts (Decimal-as-string amounts, item lines,
provenance fields, matching §1.3's encoding) twice: with typical-length names and with
deliberately long names/narration.

Actual output (reproduced verbatim, 2026-09-06):

```text
--- typical-length synthetic voucher records ---
facts in chunk: 1000 (limit 1000)
chunk payload bytes: 635,710 (limit 1,048,576)
fits within 1 MiB byte bound: True
mean/min/max bytes per fact: 635 / 608 / 657

--- worst-case-length synthetic voucher records (long names/narration) ---
facts in chunk: 1000 (limit 1000)
chunk payload bytes: 1,089,088 (limit 1,048,576)
fits within 1 MiB byte bound: False
mean/min/max bytes per fact: 1088 / 1008 / 1177
NOTE: 1,000-fact chunk exceeds 1 MiB at this record size; byte bound would clamp chunks to ~962 facts, not 1,000.

--- capability-level scale ---
max chunks per capability: 200
=> max facts per capability per run: 200,000
```

**Revised bound (proposed):** treat the byte limit as authoritative and the fact-count limit as
an additional cap, not two independent bounds either of which "the" limit — i.e. a chunk closes
at **whichever comes first**: 1,000 facts *or* 1 MiB serialized. The connector must measure
actual serialized bytes while assembling a chunk rather than assuming any fixed record count
always fits. This is a real, evidenced revision to `PLAN.md`, not a rubber-stamp of its draft
numbers.

**Not resolved by this probe:** whether 200 chunks/capability (200,000 facts) is enough for a
real customer's annual transaction volume. No representative company's actual voucher count is
known (G07 is still open — `EVIDENCE.md` §6). The reference volumes printed above are
order-of-magnitude context, explicitly labeled "not measured," not evidence.

## 4. Acceptance algorithm — adopted from PLAN.md §3 unchanged

Reviewed and adopted as written in `PLAN.md` §3 (authorize/check generation → tenant advisory
lock (`cast(%s as text)`, preserving the existing convention) → validate before mutation →
quarantine suspicious empty/incomplete → atomic capability publish → close absent bills only
inside the authoritative open-bill capability). No change proposed here; SLICE-09/16/22 implement
it. The "close absent bills only inside receivables/payables" rule is the only place REQ-007
applies, consistent with `EVIDENCE.md`/`contracts/open-bills.md`'s finding that receivables is
the only domain with any evidence at all right now.

## 5. Lost response, retry, stale device, capability-failure and cleanup-race review

| Scenario | Behavior |
|---|---|
| Lost response after chunk accepted | Retry with identical `(run_id, cap, index, digest)` returns the saved 200 (REQ-008); connector must not re-derive a new digest for genuinely unchanged bytes |
| Changed-content retry | Same key, different digest → 409 `DIGEST_CONFLICT`; connector must start a new run, never overwrite |
| Stale device (old `configuration_revision`) | `/v2/sync/runs` rejects with 409 before staging; device must re-fetch `/v2/devices/config` |
| One capability fails, others succeed | Each capability's `complete` call is independent (REQ-012); a failed capability's staged chunks are discarded, others still atomically publish (REQ-013 — this is why generation snapshots are per-capability, not per-run) |
| Cleanup mid-run | Cleanup bumps `cleanup_generation`; an in-flight run's `complete` call rechecks it and rejects (409) rather than publishing into a cleaned-up workspace — closes the exact race PLAN.md §6 warns about |

These are protocol-design reviews, not executed adversarial tests — SLICE-15/16 build and test
the real implementation against this contract.

## 6. Profile migration (connector-side, ties to ADR-006)

Legacy single-profile installs migrate by: (1) create a new opaque profile ID, (2) copy the
existing Credential Manager `device-token` entry to the new profile-scoped entry name and verify
it reads back correctly, (3) only then repoint the scheduled task and settings at the new
profile, (4) leave the legacy entry in place until one verified successful sync under the new
profile, then remove it. Any failure before step 4's confirmation leaves the legacy entry and
task intact and recoverable — this is what "preserve a recoverable checkpoint on failure" in
`PLAN.md` §6 requires. Implemented and tested in SLICE-12/13, not here.

## 7. Review

G03 (protocol capacity) evidence is the capacity probe in §3 — real, reproducible, but limited to
serialization-size sanity, not a live capacity/latency test against an actual backend or device.
The route/payload/error contract in §1 and the generation/versioning design in §2 are the
"inspectable contracts" this slice's Review line calls for.

**Per the task list's own rule, this is a lasting decision that requires owner acceptance before
SLICE-08 depends on it** (`TASKS.md` SLICE-08 prerequisite: "06 accepted"). See ADR-004/005/006
for the specific decisions requiring sign-off.

## 8. Stop

Recorded above; not marked accepted by this agent. SLICE-07 (isolated test infrastructure) does
not depend on this slice's acceptance and proceeds separately. SLICE-08/09/10 wait for owner
review of this document and its ADRs, per `TASKS.md`'s explicit prerequisite.
