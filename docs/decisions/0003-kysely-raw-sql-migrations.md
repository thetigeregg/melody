# ADR 0003: Kysely With Raw SQL Migrations

- Status: `accepted`

## Context

Melody needs a typed application DB layer, but it also needs full control over a PostgreSQL schema that is expected to evolve. The initial schema includes constraints, JSONB fields, indices, timestamps, and bootstrap data.

The project should be easy to evolve without hiding database behavior behind a heavy abstraction.

## Decision

Use Kysely for application queries and raw SQL files for migrations.

This means:

- application code uses Kysely for typed access
- schema evolution happens through explicit SQL migration files
- migration history remains transparent and easy to inspect
- PostgreSQL-specific features can be used without fighting an ORM migration DSL

## Consequences

Positive:

- query code stays typed and ergonomic
- schema changes remain explicit and reviewable
- advanced PostgreSQL features remain easy to express

Tradeoffs:

- schema types and SQL need to stay in sync manually
- some convenience features available in full ORMs are intentionally not used
- contributors need basic comfort with SQL migrations

## Guardrail

Do not move migration ownership into a code-generated ORM layer unless there is a strong reason and a clear migration path. Explicit SQL is part of the design here.

