# Melody Architecture

## Purpose

This document captures the architectural intent behind Melody so future work can preserve the original goals even as the implementation evolves.

The system is meant to be:

- self-hosted
- operationally simple
- efficient on a modest NAS
- grounded in deterministic retrieval
- enriched, but not replaced, by LLM behavior

## Problem Statement

A large personal music library is valuable, but browsing it manually does not reliably surface:

- new artists adjacent to established taste
- forgotten artists already owned locally
- tracks worth revisiting
- exploratory prompts such as “more melancholic ambient folk” in a way that is both explainable and repeatable

Melody addresses that by combining local library metadata, long-term scrobble history, and a recommendation pipeline that persists its work.

## Sources of Truth

Melody intentionally separates different kinds of truth:

- Last.fm
  - authoritative listening history
  - drives play counts, recency, and taste modeling
- local library
  - authoritative local availability and file-backed metadata
  - drives rediscovery and browsing
- MusicBrainz IDs
  - authoritative identity anchors when present
- LLM
  - not a source of truth
  - used for interpretation and reranking within a deterministic candidate set

This separation is important. It keeps the system observable and prevents the LLM from inventing recommendations disconnected from the stored data.

## Architectural Goals

- Support a large mounted library without reparsing unchanged files.
- Preserve a clean artist identity model centered on album artist.
- Make worker jobs rerunnable and stateful.
- Persist recommendation runs for later inspection and delivery.
- Support both scheduled recommendations and interactive exploration.
- Keep the system ready for future enrichment such as pgvector and richer embeddings.

## Service Model

### `db`

PostgreSQL stores:

- scan runs
- library files
- canonical artists and aliases
- albums and tracks
- Last.fm scrobbles
- artist similarity edges
- recommendation runs and items
- notification schedules
- job checkpoints

### `worker`

The worker owns background and operational logic:

- incremental library scanning
- tag parsing
- identity resolution
- Last.fm ingestion
- artist similarity refresh
- recommendation generation
- schedule execution
- Discord webhook delivery

The worker should be the place where expensive, stateful, or repeated operational tasks live.

### `api`

The API should stay thin and explicit. Its job is to:

- expose typed, validated REST endpoints
- provide read access to system state
- trigger safe manual actions such as incremental scans or recommendation runs
- support the web UI without embedding background orchestration logic

### `web`

The UI is exploratory rather than purely administrative. It should help users:

- see the latest recommendations
- browse artists and library state
- run scans
- manage schedules
- issue prompt-based exploration requests

## Data Flow

### Library ingestion flow

1. Walk the mounted music tree.
2. Record file metadata in `library_files`.
3. Skip tag parsing when `mtime` and `size` are unchanged.
4. Parse changed files only.
5. Resolve canonical album artist identity.
6. Upsert albums and tracks.
7. Mark unseen historical files as no longer present.

This is one of the most important flows in the system because scan efficiency is a core requirement.

### Listening-history flow

1. Fetch recent Last.fm scrobbles incrementally.
2. Deduplicate through persistence constraints.
3. Store raw payloads for traceability.
4. Resolve scrobbled artists to canonical artist identities.
5. Optionally match scrobbles to local tracks.

### Recommendation flow

1. Build taste signals from scrobble history.
2. Generate deterministic external and local candidate pools.
3. Assign recommendation tiers.
4. Optionally use an LLM to interpret prompts and rerank candidates.
5. Persist the run and its items.
6. Deliver via schedule when needed.

## Identity Model

Identity handling is deliberately conservative:

- prefer exact MusicBrainz matches first
- then prefer exact normalized alias matches
- otherwise create a new canonical artist and log the decision

Why this matters:

- aggressive fuzzy matching can corrupt a library quietly
- artist identity affects browsing, scoring, recommendations, and Last.fm joins
- it is safer to create a new artist than to merge two distinct artists incorrectly

Album artist remains the primary browsing identity even when track artist metadata is preserved for display.

## Recommendation Philosophy

Melody should recommend from a controlled candidate set, not generate music suggestions from scratch.

Default mix:

- `70%` external discovery
- `30%` local rediscovery

Default tiers:

- `new`
- `rediscovery`
- `frequent`

This lets the system balance novelty with value from the existing collection.

## Scheduling Philosophy

Schedules are DB-driven from the start so they can evolve without code changes. The default bootstrap schedule is:

- Friday
- `09:00`
- `Europe/Zurich`

Failures should be logged, not escalated to user-facing alerting. The next scheduled run is the default retry point.

## Operational Expectations

- all services log structured JSON
- background work should be bounded and observable
- scans should remain incremental
- state should be persisted in the database, not only in memory
- repeated runs should be safe whenever possible

## Future Expansion

The architecture should leave room for:

- `pgvector`
- richer embeddings
- MusicBrainz enrichment jobs
- additional notification channels
- graph-based exploration views

Those are deliberately future-facing and should not distort the core v1 design.

## Design Guardrails For Future Contributors

When making changes, prefer:

- correctness over cleverness
- explicit identity resolution over fuzzy magic
- deterministic retrieval before LLM involvement
- persisted state over transient behavior
- operational simplicity over premature complexity

If a future change weakens those principles, it is probably moving Melody away from its intended architecture.

