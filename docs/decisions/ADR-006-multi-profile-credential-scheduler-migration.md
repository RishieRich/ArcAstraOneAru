# ADR-006: Multi-profile connector credential and scheduler migration

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-09-06 |
| Deciders | Rishi |
| Related change | 003-essential-tally-data-foundation |

## Context

The connector currently supports exactly one registration: one Windows Credential Manager
`device-token` entry and one named scheduled task. REQ-040 requires one installation to maintain
several independent, explicitly-credentialed company/workspace profiles without ever combining
or ambiguously guessing between them, and REQ-052 requires credentials to stay out of settings
files and logs through this change. Existing production installs already carry the legacy
single-profile registration and must not lose it during migration.

## Decision

- Introduce opaque local **profile IDs**. Each profile owns its own non-secret settings block,
  its own Credential Manager entry (name includes the profile ID), its own lock/state file, and
  its own explicitly named scheduled task invoking `run --profile <id>` (task arguments carry no
  credential material — the token stays in Credential Manager, read at run time).
- Migrate the legacy single profile by: create the new profile ID, **copy** (not move) the
  existing credential entry to the new profile-scoped name, verify it reads back correctly, only
  then repoint the scheduled task, and leave the legacy entry recoverable until one verified
  successful sync completes under the new profile. This mirrors `protocol.md` §6.
- Manual and scheduled execution always resolve one explicit profile; an ambiguous manual
  invocation with multiple profiles present refuses rather than guessing (no silent default).
- Reset acts on exactly the selected profile's local state only; it never touches another
  profile's credential, schedule, or last-sync state.

## Alternatives considered

### Keep one shared credential entry, differentiate profiles only by in-memory config

- Benefits: no Credential Manager schema change.
- Costs: cannot hold two companies' tokens simultaneously, defeating REQ-040 outright; scheduled
  tasks for two companies would race on the same credential slot.
- Why not chosen: fails the requirement directly, not a matter of preference.

### Move (not copy) the legacy credential during migration

- Benefits: simpler, one less credential entry to manage mid-migration.
- Costs: a failure between removing the old entry and confirming the new one leaves the
  installation with no working credential and no recoverable checkpoint — violates the plan's
  "preserve a recoverable checkpoint on failure" requirement.
- Why not chosen: copy-then-verify-then-retire is only marginally more code and materially safer.

### A single scheduled task that iterates all profiles internally

- Benefits: one Windows Task Scheduler entry regardless of profile count.
- Costs: one profile's failure/hang risks delaying or blocking another profile's sync; harder to
  reason about per-profile logs and lock ownership; REQ-040 calls for profiles to "never combine,"
  which a shared task's internal loop makes easier to violate by accident (e.g., a shared timeout
  or a bug iterating into the wrong profile's state).
- Why not chosen: independent named tasks keep the isolation REQ-040 requires structurally
  obvious rather than dependent on internal loop correctness.

## Consequences

- Positive: two companies can be paired, scheduled, and reset independently on one machine
  without cross-contamination, satisfying REQ-040/REQ-052 by construction.
- Positive: the migration path has an explicit recoverable checkpoint, avoiding a bricked
  installation if migration is interrupted (power loss, crash) mid-way.
- Negative: more Credential Manager entries and scheduled tasks to enumerate/audit; the GUI
  (SLICE-14) must clearly disambiguate which profile is selected at all times.
- Follow-up: SLICE-12/13 implement and test the credential/scheduler/lock mechanics; SLICE-14
  adds the localized GUI selection and confirmation flow.

## Revisit when

If real pilot usage shows most customers never run more than one profile per machine, the
migration/isolation machinery's ongoing complexity cost should be weighed against that evidence
before adding further profile-scoped features.
