# Melody Decisions

This directory contains lightweight ADR-style notes for architectural choices that should remain visible over time.

These files are meant to answer:

- what decision was made
- why it was made
- what tradeoffs it introduces
- what future contributors should avoid undoing accidentally

## Index

- [0001: Last.fm As Authoritative Listening History](/Users/sixtopia/projects/melody/docs/decisions/0001-lastfm-authoritative-history.md)
- [0002: Album Artist As Canonical Browsing Identity](/Users/sixtopia/projects/melody/docs/decisions/0002-album-artist-canonical-identity.md)
- [0003: Kysely With Raw SQL Migrations](/Users/sixtopia/projects/melody/docs/decisions/0003-kysely-raw-sql-migrations.md)
- [0004: Deterministic Retrieval Before LLM Reranking](/Users/sixtopia/projects/melody/docs/decisions/0004-deterministic-retrieval-before-llm.md)
- [0005: Incremental Library Scanning By Mtime And Size](/Users/sixtopia/projects/melody/docs/decisions/0005-incremental-library-scanning.md)

## Conventions

- Status values should stay simple: `accepted`, `superseded`, or `deprecated`.
- New ADRs should be numbered sequentially.
- If a decision changes, prefer adding a new ADR rather than rewriting history.

