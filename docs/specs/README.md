# Specifications

`baseline/` describes intended current behavior. `changes/` describes one proposed or completed
delta. Do not create one giant specification for the whole product.

Change statuses are:

```text
Draft -> In Review -> Approved -> Implementing -> Verified -> Released
                                                -> Superseded
```

Only the owner changes a spec to `Approved` or `Released`.

Number requirements as `REQ-001`, acceptance scenarios as `AC-001`, and tests or checks as
`TEST-001`. Each task and verification row must reference the requirements it covers.
