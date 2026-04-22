---
description: >-
  Use before implementing any non-trivial logic change, algorithm modification, or schema change. Enforces a structured reasoning pass to ensure correctness before coding. license: MIT compatibility: "Claude Code CLI" metadata: author: Aufstin version: "1.0.0" category: development tags: ["planning", "reasoning", "pre-implementation"]
mode: primary
model: minimax/minimax-m2.5
temperature: 0.7
permission:
  edit: ask
  bash: ask
---


# Agent Think â€” Reasoning Pass Before Logic or Data Changes

Run this BEFORE implementing any non-trivial logic change, algorithm modification, or schema change.

Forces a structured reasoning pass so mistakes happen on paper, not in code.

## Overview

When facing a non-trivial code change, this skill enforces a written reasoning phase before implementation. You answer key questions about current behavior, intended behavior, invariants, failure modes, and test plansâ€”ensuring the change is correct before writing code.

## Instructions

### Step 1: Read relevant docs

Based on what you're about to change, read:
- `docs/architecture/invariants.md` â€” always
- `docs/architecture/data-model.md` â€” if touching data layer
- Relevant `docs/architecture/algorithms/*.md` â€” if touching decision logic
- Existing tests for the area being changed

### Step 2: Output reasoning summary (required before any code)

Answer each of these in writing:

**Current behavior**
What does the code currently do? Not what it should do â€” what it actually does.

**Intended behavior**
What should it do after this change?

**Invariants affected**
List every invariant from `invariants.md` that this change touches or could violate.

**Files to inspect**
What files need to be read before implementation?

**Ownership check**
Who owns writes here? Is the change happening in the right layer?

**Possible failure modes**
List 3-5 things that could go wrong. Be specific.
Examples:
- "This could create N+1 queries if list is large"
- "This introduces nondeterminism if map iteration order varies"
- "This could create duplicate state if retried"

**Test plan**
What tests are needed to verify correctness?
- Nominal case
- Edge cases
- Regression for the bug or scenario motivating this change

### Step 3: Propose the approach

After the reasoning pass, propose the smallest correct change.
Do not start coding until the reasoning output is complete.

### Step 4: Proceed with implementation

Only after Steps 1-3 are done.

## Examples

### Example 1: Changing a Ranking Algorithm
**Context:** User wants to modify how items are ranked in a leaderboard.

**Reasoning output:**
- Current: Items ranked by score, then by creation time (deterministic)
- Intended: Rank by score, then by region, then by creation time
- Invariants: Ranking must remain deterministic; ties must break the same way always
- Failure modes: Map iteration order, floating-point precision, timezone issues
- Test plan: Test same-score items maintain order; test regional boundaries; test determinism (same data â†’ same ranking)

**Outcome:** Safe to implement after confirming region field exists and is deterministic.

### Example 2: Adding a Nullable Column
**Context:** User wants to add an optional field to a frequently-queried entity.

**Reasoning output:**
- Current: Entity has 5 required fields, all non-null
- Intended: Add optional field that may be null
- Invariants: Write rules for this entity; derived data that depends on it; migration compatibility
- Failure modes: Queries break if they assume not-null; existing code doesn't handle null; migration blocks concurrent writes
- Test plan: Query still works with null; default value correct; backward compatibility window covers deployment

**Outcome:** Safe to add after confirming migration window and updating queries.

## Guidelines
- Do not skip the reasoning phase â€” it catches mistakes that code review misses
- Use this skill before refactoring large functions or changing core logic
- The failure mode list is crucial â€” be specific, not generic
- Invariants are laws, not suggestions â€” if the change violates an invariant, stop and redesign
- Test plan should cover both happy path and the scenarios most likely to break
