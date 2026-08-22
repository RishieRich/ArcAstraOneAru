# ARQ Astra engineering documents

This directory is the tracked source of truth for future development.

Start here:

1. Read [the constitution](governance/CONSTITUTION.md) for rules that may not be weakened.
2. Read [the SDD workflow](governance/SDD_WORKFLOW.md) before requesting a change.
3. Find the affected current behavior under [baseline specs](specs/baseline/).
4. Create one folder under `specs/changes/` from the template.
5. Record lasting architecture choices under [decisions](decisions/).

Document roles:

| Document | Purpose |
|---|---|
| Constitution | Stable product and engineering laws |
| Baseline spec | Intended current behavior of one capability |
| Change spec | The behavior one change adds, modifies, or removes |
| Plan | How an approved specification will be implemented safely |
| Tasks | Small implementation units linked to requirements |
| Verification | Evidence that the approved requirements were met |
| ADR | Why a durable architecture decision was made |
| `AGENTS.md` | Operational briefing for coding agents; not a feature spec |

The code and tests show what exists. The baseline specs state what is intended. If they
disagree, stop and resolve the disagreement in a reviewed change spec.
