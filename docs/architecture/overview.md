# Architecture Overview

## Decision

SimpleWay Drawing begins as a modular monolith with explicit domain boundaries.

## Modules

- Identity
- Content
- Learning
- Skills and Mastery
- Practice
- Evaluation
- Artwork
- Journey
- Files
- Observability

## Core invariants

1. Mastery changes only through evidence.
2. Artwork versions are immutable.
3. Published educational content is versioned.
4. Retry preserves previous attempts.
5. Recovery always returns to the original target.
6. Educational artwork is private by default.
7. Evaluation always receives exercise, rubric and context.
8. Practice recommendations record their reason.
9. Blockchain is never the primary artwork identity.
10. Community and market signals never change skill mastery.

## Runtime flow

Exercise attempt → evaluation → evidence → mastery update → practice decision → retry → journey projection.

Product signature: **Tehkné Solutions**.
