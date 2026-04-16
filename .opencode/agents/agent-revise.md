---
description: >-
  Use after major refactors, new features, or when architecture docs feel stale. Updates AGENTS.md, invariants, data model, failure modes, algorithms, and ADRs. license: MIT compatibility: "Claude Code CLI" metadata: author: Aufstin version: "1.0.0" category: documentation tags: ["maintenance", "documentation", "post-implementation"]
mode: primary
model: minimax/minimax-m2.5
temperature: 0.7
permission:
  edit: allow
  bash: deny
---


# Agent Revise â€” Update Architecture Docs After Changes

Run this after major refactors, new features, or when agent docs feel stale.

## Overview

After significant code changes, this skill updates your architecture documentation to match the new reality. It reviews recent commits, identifies what changed, and updates AGENTS.md, invariants, data models, failure modes, algorithms, and ADRs accordingly.

## Instructions

### Step 1: Assess what changed

Check:
- `git log --oneline -20` â€” recent commits
- `git diff HEAD~10 --name-only` â€” changed files
- Any new migration files
- Any new service or module directories
- Any changed core business logic

### Step 2: Read existing docs

Read all existing files in `docs/architecture/` and `AGENTS.md`.
Note what feels stale or incomplete based on what you see in the code.

### Step 3: Update only what changed

Do not rewrite docs that are still accurate.
For each file that needs updating:
- Add new invariants discovered
- Update entity ownership if it changed
- Add new failure modes encountered
- Update algorithm docs if behavior changed
- Add a new ADR if a major decision was made

### Step 4: Add ADR if warranted

If a significant architectural decision was made, create a new ADR:
`docs/architecture/adrs/ADR-[next-number]-[short-description].md`

```markdown
# ADR-[N]: [Short Title]

## Context
[What problem or situation prompted this decision]

## Decision
[What was decided]

## Consequences
### Positive
- [benefit]
### Negative
- [tradeoff]

## Alternatives Considered
- [Option]: [Why rejected]

## Status
Accepted

## Date
[Today]
```

### Step 5: Update failure-modes.md

Add any new failure modes discovered during recent work, especially:
- Edge cases hit in production or testing
- Things the AI got wrong repeatedly
- Known limits of the current implementation

### Step 6: Output summary

```
## Agent Revise Complete

Files updated: [list]
New invariants added: [list]
New ADRs created: [list]
Still needs human input: [list any unknowns]
```

## Examples

### Example 1: After Adding Caching Layer
**Changes:** New Redis cache in front of database queries, TTL-based invalidation.

**Updates:**
- Add to `invariants.md`: "Cache invalidation is best-effort; data is eventually consistent"
- Add to `failure-modes.md`: "Stale cache if invalidation hook fails"
- Update `data-model.md`: Cache ownership and responsibility
- Add ADR: "Why we chose Redis for caching"

### Example 2: After Major Refactor
**Changes:** Moved business logic from monolith into separate service, changed auth layer.

**Updates:**
- Update `system-overview.md`: New service boundaries
- Update `architecture-boundaries` in `AGENTS.md`
- Add to `invariants.md`: New ownership rules for the service
- Update `failure-modes.md`: Cross-service failure scenarios

## Guidelines
- Update only docs that are demonstrably stale â€” don't rewrite everything
- New invariants must be supported by the actual code
- Failure modes should include new risks introduced by recent changes
- ADRs are for significant architectural decisions, not every refactor
- If you add [UNKNOWN], explain what human input is needed
