---
description: >-
  Use when onboarding a new codebase. Runs a full audit and generates the complete agent documentation system (AGENTS.md, architecture docs, ADRs, and reusable skills). license: MIT compatibility: "Claude Code CLI" metadata: author: Aufstin version: "1.0.0" category: documentation tags: ["onboarding", "architecture", "documentation"]
mode: primary
model: minimax/minimax-m2.5
temperature: 0.7
permission:
  edit: allow
  bash: deny
---


# Agent Setup â€” Full Codebase Audit & Doc Generation

Run this once in any new repo to generate the complete agent documentation system.

## Overview

This skill reads the entire codebase strategically, builds a mental model of the system, then generates a comprehensive architecture documentation package including system invariants, data model, failure modes, ADRs, and reusable skills for future changes.

## Instructions

### Step 1: Explore the codebase

Read these first (if they exist):
- `package.json` / `Cargo.toml` / `pyproject.toml` â€” dependencies and scripts
- `README.md` â€” project description
- Top-level directory structure
- Any existing architecture or design docs
- Migration files or schema definitions
- Core service/module files (not tests, not generated)

Do NOT read every file. Sample strategically:
- Entry points
- Core business logic modules
- Data layer / DB access
- API surface
- Key utility modules

### Step 2: Build a mental model before writing anything

Identify and note internally:
- What does this system actually do?
- What are the core entities?
- What is the source of truth for each entity?
- Who owns writes to what?
- What are the non-obvious invariants (ordering, idempotency, append-only, determinism)?
- What algorithms exist (ranking, matching, routing, scoring, deduplication)?
- What are the layer boundaries?
- What would break if violated?
- What tech decisions have clearly already been made?

### Step 3: Generate AGENTS.md

Write a concise repo constitution at `AGENTS.md`. Include:

```markdown
# AGENTS.md

## Mission
[One sentence: what this system does and what kind of changes to prefer]

## Stack
[Language, framework, DB, key services â€” bullet list]

## Commands
[Exact commands for install, dev, lint, typecheck, test, build]
[Include per-file variants: e.g. `tsc --noEmit path/to/file.ts`]

## Global Rules
- Do not edit generated files
- Ask before adding production dependencies
- Prefer root-cause fixes over patches
- Do not bypass failing tests

## Architecture Boundaries
[What layer owns what. E.g. "services/core owns business logic. apps/web may not implement domain rules."]

## Required Reading by Task Type
- Changing business logic â†’ read `docs/architecture/invariants.md`
- Changing schema or data flow â†’ read `docs/architecture/data-model.md`
- Changing algorithms â†’ read relevant `docs/architecture/algorithms/*.md`
- Major decisions â†’ read `docs/architecture/adrs/`

## Definition of Done
- Lint passes
- Typecheck passes
- Relevant tests pass
- Any new invariant or algorithm decision is documented
```

### Step 4: Generate docs/architecture/invariants.md

This is the most important file. Capture all non-obvious rules that must always be true.

Structure:
```markdown
# System Invariants

## [Domain Area, e.g. "Financial Consistency"]
- [Invariant stated as a law, not a suggestion]
- [Another invariant]

## [Domain Area, e.g. "Identity"]
- ...
```

For each invariant: state it as a fact, not a preference.
- Good: "Ledger entries are append-only."
- Bad: "Try to keep ledger entries immutable."

### Step 5: Generate docs/architecture/data-model.md

Document each major entity with semantics, not just schema.

Structure per entity:
```markdown
## EntityName
[One sentence: what this entity represents]

### Source of Truth
[Which table/store is authoritative]

### Write Rules
[Who may write. What service. Under what conditions.]

### Relationships
[Key relationships and their directionality]

### Derived Data
[What is computed vs. stored, and where]

### Migration Constraints
[What must be true for schema changes to be safe]
```

### Step 6: Generate docs/architecture/system-overview.md

High-level map of the system.

```markdown
# System Overview

## What This System Does
[2-3 sentences]

## Stack
[Full list with versions if known]

## Layer Boundaries
[How layers are defined and what each owns]

## External Dependencies
[APIs, services, queues, etc. and what the system relies on them for]

## Key Data Flows
[Major flows: e.g. "user signup â†’ auth â†’ profile creation â†’ event emission"]
```

### Step 7: Generate docs/architecture/failure-modes.md

Document known risks, edge cases, and historically broken things.

```markdown
# Failure Modes

## [Area, e.g. "Database"]
- [Known failure case and why it happens]

## [Area, e.g. "External APIs"]
- ...

## [Area, e.g. "Algorithm Edge Cases"]
- ...

## Common Agent Mistakes
- [Things AI tends to get wrong in this codebase]
```

If you can't find explicit evidence, infer likely failure modes from the tech choices and flag them as inferred.

### Step 8: Generate algorithm docs (if applicable)

For each non-trivial algorithm (ranking, matching, routing, scoring, deduplication, pricing, state machine logic):

Create `docs/architecture/algorithms/[algo-name].md`:

```markdown
# [Algorithm Name]

## Objective
[What it optimizes or decides]

## Inputs
[List]

## Outputs
[List]

## Constraints
- Must be deterministic for identical inputs
- [Performance target if known, e.g. O(n log n)]
- [Latency target if known]

## Tie-Break Rules
[In priority order]

## Edge Cases
[Known edge cases or failure conditions]

## Current Implementation Location
[File path(s)]
```

Skip this step if no significant algorithms exist.

### Step 9: Generate ADR-000

Create `docs/architecture/adrs/ADR-000-initial.md`:

```markdown
# ADR-000: Initial Architecture Decisions

## Context
[Brief description of what this system is and what drove early decisions]

## Decisions Made

### [Decision 1, e.g. "Use Postgres as primary store"]
**Reason:** [Why]
**Alternatives rejected:** [What and why not]

### [Decision 2]
...

## Status
Accepted

## Date
[Today's date]
```

### Step 10: Generate skill files

Create each skill file with the exact structure below.

**skills/algo-change/SKILL.md:**
```markdown
# SKILL: Algorithm Change

Use when modifying ranking, matching, routing, scoring, deduplication, or any decision logic.

## Before Coding
1. Read `docs/architecture/invariants.md`
2. Read relevant `docs/architecture/algorithms/*.md`
3. Read tests covering current behavior
4. Output internally:
   - Current objective
   - Current inputs/outputs
   - Invariants that must remain true
   - Complexity target
   - Likely failure modes

## Implementation Rules
- Preserve deterministic behavior unless task explicitly changes it
- Document any change to tie-breaking
- Avoid hidden state and side effects
- Do not degrade asymptotic complexity without explicit approval

## Validation
- Add/update unit tests for nominal cases
- Add edge-case tests
- Add regression test for the scenario motivating the change
- Note expected complexity and hot paths if performance-relevant

## After Coding
- Update relevant `docs/architecture/algorithms/*.md` if behavior changed
- If a new invariant was discovered, add it to `docs/architecture/invariants.md`
```

**skills/schema-change/SKILL.md:**
```markdown
# SKILL: Schema Change

Use when modifying database schema, data models, or persistence layer.

## Before Coding
1. Read `docs/architecture/data-model.md`
2. Read `docs/architecture/invariants.md`
3. Check existing migrations for patterns
4. Output internally:
   - What entity is affected
   - Who owns writes to it
   - What derived data depends on it
   - Backward compatibility requirements
   - Migration safety concerns

## Implementation Rules
- Migrations must be backward compatible for at least one deployment window
- Write rules must be enforced through the correct service layer
- Do not add columns that bypass ownership rules
- Never remove columns without a deprecation migration first

## Validation
- Migration runs cleanly on a test DB
- Existing tests still pass
- New tests cover new schema behavior
- `docs/architecture/data-model.md` updated if entity semantics changed
```

**skills/perf-investigation/SKILL.md:**
```markdown
# SKILL: Performance Investigation

Use when investigating slowness, high memory, N+1 queries, or scaling issues.

## Investigation Steps
1. Identify the specific operation that is slow (not "the app is slow")
2. Measure before changing anything â€” get a baseline
3. Check for N+1 query patterns (queries inside loops)
4. Check for missing indexes on filtered/joined columns
5. Check for unbounded result sets
6. Check for synchronous operations that could be async
7. Check for repeated computation that could be cached or memoized

## Before Optimizing
- Confirm the bottleneck with measurement, not assumption
- Read `docs/architecture/failure-modes.md` for known issues
- Check if this is a known edge case

## Implementation Rules
- Prefer targeted per-file/per-query commands over full project rebuilds
- Do not introduce caching without documenting invalidation strategy
- Do not change algorithm behavior while optimizing unless explicitly approved
- Document complexity target before and after

## Validation
- Measure after the change to confirm improvement
- Regression test for correctness (optimization must not change output)
- Note new complexity in `docs/architecture/algorithms/*.md` if relevant
```

### Step 11: Output summary

After generating all files, output:

```
## Agent Setup Complete

Files created:
- AGENTS.md
- docs/architecture/invariants.md
- docs/architecture/data-model.md
- docs/architecture/system-overview.md
- docs/architecture/failure-modes.md
- docs/architecture/algorithms/[list]
- docs/architecture/adrs/ADR-000-initial.md
- skills/algo-change/SKILL.md
- skills/schema-change/SKILL.md
- skills/perf-investigation/SKILL.md

Key invariants discovered: [list top 3-5]
Algorithms documented: [list]
Highest risk areas: [list top 3]

Next steps:
- Review invariants.md and correct anything misread from the codebase
- Fill in any [UNKNOWN] placeholders
- Run /agent-revise after major architectural changes
```

Flag anything you could not determine from the codebase alone with `[UNKNOWN â€” needs human input]`.

## Examples

### Example 1: TypeScript Backend
**Input:** A new TypeScript+Express backend project

**Output:** AGENTS.md with Node/Express/PostgreSQL stack, invariants for request handling and transaction safety, data model covering entities and migrations, ADR-000 documenting Express + ORM choice.

### Example 2: Python ML Pipeline
**Input:** A data processing pipeline in Python

**Output:** AGENTS.md with Python stack, invariants for data flow and determinism, algorithm docs for any feature engineering, ADR-000 documenting compute choice and data format.

## Guidelines
- Do not try to document from memory â€” read code first
- Invariants should be stated as facts, not aspirations
- Flag unknown decisions with [UNKNOWN] and explain what info is needed
- Focus on non-obvious rules (don't document "lint passes" unless it's unique to this repo)
- This skill generates reusable skills for future work â€” make sure they're specific to this codebase
