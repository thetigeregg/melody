# Melody

Melody is a self-hosted music intelligence platform for a home lab. It combines a local music library, authoritative Last.fm listening history, deterministic recommendation logic, optional LLM-assisted exploration, and scheduled Discord delivery.

The project is intentionally shaped as an operational system rather than a one-off recommendation script. It is designed to run continuously in Docker, scan a large local library efficiently, persist recommendation history, and expose both an API and exploratory web UI.

## Vision

Melody exists to help surface music that is both relevant and genuinely useful:

- discover new artists adjacent to established taste
- rediscover underplayed artists already owned locally
- recommend both artists and specific tracks
- support free-text exploration without requiring bespoke code for every discovery mode
- deliver recommendations both on demand and on a schedule

The system should feel like a personal music intelligence layer, not just a chatbot wrapper around an LLM.

## Product Goals

The long-term product goals are:

- recommend new artists close to the user’s taste
- surface forgotten or underplayed artists from the local collection
- recommend tracks as well as artists
- support prompt-driven exploration through an LLM without making the LLM the source of truth
- provide both scheduled delivery and interactive exploration

The default recommendation balance is:

- `70%` external discovery
- `30%` local rediscovery

That ratio should stay configurable everywhere recommendations are generated.

## Core Principles

- Last.fm is the authoritative listening-history source.
- The local library is the authoritative availability and metadata source.
- Album artist is the dominant identity for browsing, scoring, and recommendations.
- MusicBrainz IDs are strong identity anchors when available.
- Deterministic retrieval comes before LLM interpretation or reranking.
- Incremental efficiency matters because the library may contain 20,000+ files.
- Services should be operationally simple: Dockerized, JSON-logged, and safe to rerun.

## High-Level Architecture

```text
/music (read-only mount) -> worker -> PostgreSQL <- api <- web UI
                               |
                               +-> Last.fm ingestion
                               +-> recommendation generation
                               +-> schedule execution
                               +-> Discord webhook delivery
```

The service boundaries are:

- `db`
  - PostgreSQL 16
  - stores library metadata, listening history, schedules, recommendation runs, and job checkpoints
- `worker`
  - scans the local library
  - ingests Last.fm scrobbles
  - refreshes artist similarity
  - generates recommendations
  - executes schedules
  - delivers Discord notifications
- `api`
  - exposes a REST API for the UI and manual actions
  - surfaces health, scan status, recommendations, artists, library stats, schedules, and config
- `web`
  - exploratory Angular UI
  - supports recommendations, prompt-driven exploration, scans, schedules, and browsing
- `shared`
  - config, logging, Kysely DB access, migrations, normalization, and common types

More detail is documented in [docs/architecture.md](/Users/sixtopia/projects/melody/docs/architecture.md).
Key architectural decisions are tracked in [docs/decisions/README.md](/Users/sixtopia/projects/melody/docs/decisions/README.md).

## Recommendation Model

Recommendations are expected to follow a staged model:

1. Build a taste profile from Last.fm scrobbles.
2. Generate deterministic candidate pools.
3. Optionally interpret prompts and rerank candidates with an LLM.
4. Persist recommendation runs and optionally deliver them through schedules.

Tiering should remain explicit:

- `new`: fewer than 3 lifetime plays
- `rediscovery`: in library and not played for at least 180 days
- `frequent`: recently or regularly played and usually deprioritized

Recency weighting should use exponential decay by default:

`weight = e^(-days_since_play / 14)`

## Current Repository Structure

```text
melody/
  docker-compose.yml
  .env.example
  README.md
  docs/
    architecture.md
    decisions/
      README.md
  packages/
    shared/
    api/
    worker/
    web/
```

## Current Scope

This initialization sets up the project foundation requested in the implementation spec:

- Docker Compose with `db`, `api`, `worker`, and `web`
- PostgreSQL schema through raw SQL migrations
- Kysely DB layer
- shared config and structured JSON logging
- initial worker jobs and orchestration
- initial Fastify API routes
- Angular standalone UI scaffold

What is present today is a strong foundation, not the finished product. Some features are implemented as early scaffolds and will need refinement as the project moves through later phases.

## Delivery Phases

The intended implementation order is:

1. foundation and infrastructure
2. incremental library scan
3. Last.fm ingestion
4. recommendation engine v1
5. LLM-assisted exploration
6. schedules and Discord notifications
7. richer web UI

This is useful context when making future changes: prefer improving the current phase without skipping core correctness or operational clarity.

## Operational Constraints

- The music library must be mounted read-only.
- Last.fm ingestion should be incremental and idempotent where possible.
- Manual scans should remain incremental and should not force a full reparse.
- Tag parsing concurrency should stay bounded.
- Structured logs should be JSON.
- Failures should be logged and retried on the next schedule rather than alerting aggressively.
- Tailscale exposure is external to this repository and not managed in Compose.

## Quick Start

1. Copy `.env.example` to `.env` and fill in secrets.
2. Install dependencies with `npm install`.
3. Start PostgreSQL or `docker compose up -d db`.
4. Run migrations with `npm run migrate`.
5. Start the stack with `docker compose up --build`.

## Useful Scripts

- `npm run build`
- `npm run typecheck`
- `npm run migrate`
- `npm run dev:api`
- `npm run dev:worker`
- `npm run dev:web`

## Notes

- The default schedule is Friday at `09:00` in `Europe/Zurich`.
- Last.fm is treated as the listening-history source of truth.
- Album artist is the primary local identity axis.
- MusicBrainz IDs are authoritative anchors when available, not a hard dependency for every record.
