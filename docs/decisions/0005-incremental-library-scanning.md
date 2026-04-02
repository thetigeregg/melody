# ADR 0005: Incremental Library Scanning By Mtime And Size

- Status: `accepted`

## Context

Melody is expected to scan a large local library, potentially with 20,000 or more files. Fully reparsing tags on every scan would be wasteful and would not fit the intended steady-state operating model on modest NAS hardware.

The library changes infrequently, usually in batches rather than continuously.

## Decision

Perform incremental scanning by comparing file `mtime` and `size` before reparsing tags.

This means:

- every scan walks the mounted tree and stats candidate files
- known files are reparsed only when `file_mtime_ms` or `file_size_bytes` changes
- unchanged files are skipped
- deleted files are marked historically rather than immediately removed
- manual scans from the UI still use this incremental path

## Consequences

Positive:

- steady-state scans stay fast
- unnecessary tag reads are avoided
- the design fits the expected library update pattern

Tradeoffs:

- the scan still needs a full directory walk
- rare metadata changes that do not affect `mtime` or `size` would be missed
- a future force-rescan mode may still be useful, but it is intentionally out of scope for v1

## Guardrail

Do not change manual scans into full reparses by default. Incremental scan behavior is a core design requirement, not just an optimization detail.

