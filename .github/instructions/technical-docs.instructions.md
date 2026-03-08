---
description: Standards for technical documentation in docs/technical/
globs: docs/technical/**/*.md
---

# Technical Documentation Standards

These rules apply to all documentation under `docs/technical/`. The audience is engineers maintaining, extending, or debugging the system.

## Voice and structure

- State invariants before implementation
- Design rationale: "why this and not X?" with failure cases of rejected alternatives
- Catalog known failure modes (symptom, root cause, detection, recovery)
- Performance characteristics with proof (latency, throughput, complexity)
- Link code examples to actual source files and lines
- Make trade-offs explicit
- Version and backwards compatibility
