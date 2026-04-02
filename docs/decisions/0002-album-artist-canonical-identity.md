# ADR 0002: Album Artist As Canonical Browsing Identity

- Status: `accepted`

## Context

The library contains albums, singles, compilations, soundtracks, mixtapes, and collaborative tracks. Artist identity can become noisy if track-level artist strings are used as the primary browsing axis.

The recommendation model and local-library browsing need a stable default identity.

## Decision

Use album artist as the canonical local browsing and scoring identity.

This means:

- canonical artist mapping is album-artist dominant
- local tracks retain raw `artist` and `album artist` metadata
- track artist remains available for display and secondary context
- album artist drives most local aggregation and recommendation joins

## Consequences

Positive:

- browsing stays closer to how albums are actually organized locally
- compilations and collaborative tracks are less likely to fragment artist views
- recommendation scoring remains more stable

Tradeoffs:

- some collaboration-heavy catalogs may feel simplified
- a few edge cases may need special handling later
- track artist detail still needs to be preserved for display quality

## Guardrail

Do not switch to track-artist-first aggregation by default. If a future feature needs track-artist exploration, add it as an additional view rather than replacing canonical identity.

