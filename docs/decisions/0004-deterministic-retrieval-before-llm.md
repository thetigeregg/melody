# ADR 0004: Deterministic Retrieval Before LLM Reranking

- Status: `accepted`

## Context

Melody supports prompt-driven exploration, but recommendations still need to be grounded in persisted data and remain explainable.

Using an LLM as the primary recommendation generator would make the system harder to trust, harder to debug, and more likely to hallucinate irrelevant artists.

## Decision

Use the LLM as an interpreter and reranker, not the source of truth.

This means:

- the worker first builds deterministic candidate pools
- prompts are interpreted into retrieval intent or weighting
- reranking happens within the candidate pool
- arbitrary artists outside the pool are not introduced by default

## Consequences

Positive:

- recommendations stay grounded in actual data
- results are easier to debug and reproduce
- prompt-driven exploration remains flexible without giving up control

Tradeoffs:

- the system may feel less magically open-ended than freeform LLM generation
- candidate generation quality matters more because the reranker only sees what it is given

## Guardrail

Avoid bypassing deterministic retrieval for convenience. If future work allows out-of-pool generation, it should be opt-in and clearly marked as a different mode.

