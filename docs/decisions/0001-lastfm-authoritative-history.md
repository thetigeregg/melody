# ADR 0001: Last.fm As Authoritative Listening History

- Status: `accepted`

## Context

Melody combines a local library with long-running scrobble history. The system needs a single authoritative source for play counts, recency, and taste modeling.

The local library is valuable, but file presence alone does not capture what has actually been listened to over time. Local playback is already scrobbled to Last.fm, and no Spotify or other streaming-service integration is required in v1.

## Decision

Use Last.fm scrobbles as the authoritative listening-history source.

This means:

- play history is derived primarily from `lastfm_scrobbles`
- taste profiles are built from Last.fm data
- recommendation scoring uses Last.fm as the main play ledger
- the local library is used for availability, metadata, and rediscovery rather than primary listening truth

## Consequences

Positive:

- a single source of truth keeps scoring simpler and more explainable
- long-term listening history remains available even if the local library changes
- local and non-local listening can still contribute if it was scrobbled

Tradeoffs:

- if scrobbling is incomplete, the listening model is incomplete
- Last.fm ingestion reliability becomes operationally important
- some local playback context may not exist if it was never scrobbled

## Guardrail

Do not introduce alternate play ledgers casually. If another listening source is added later, its relationship to Last.fm must be explicit rather than quietly merged.

