---
description: Standards for admin/operations documentation in docs/admin/
globs: docs/admin/**/*.md
---

# Admin Documentation Standards

These rules apply to all documentation under `docs/admin/`. The audience is system administrators, operators, and support engineers.

## Voice and structure

- Lead with prerequisites and blast radius
- One atomic action per step with expected output
- Rollback section BEFORE the procedure
- Troubleshoot as decision tree (symptom → diagnostic → cause → fix → escalate)
- Post-action verification mandatory
- Destructive operations require safety gates
- Include time estimates and impact scope
