Agent Guide for This Repository

Canonical Source
- This file is the single source of truth for agent guidance. Do not duplicate its contents elsewhere. The `agent.md` file is only a pointer to this document to prevent drift.

Scope: Entire repository.

Purpose
- Provide a persistent pointer to the Kiro specs and task list so agents can quickly locate planning documents each session.

Quick Links
- Task list: `.kiro/specs/splintr-mvp/tasks.md`
- Requirements: `.kiro/specs/splintr-mvp/requirements.md`
- Design notes: `.kiro/specs/splintr-mvp/design.md`
- Steering documents:
  - Product: `.kiro/steering/product.md`
  - Structure: `.kiro/steering/structure.md`
  - Tech: `.kiro/steering/tech.md`

Working Conventions for Agents
- When asked for the project "task list" or roadmap, read from `.kiro/specs/splintr-mvp/tasks.md`.
- For context, constraints, or rationale behind features, consult the steering docs listed above before making significant architectural decisions.
- Keep changes focused and aligned with the open items in the task list; do not restructure documents in `.kiro` without explicit instruction.

Notes
- The `.kiro` folder is intentionally hidden (dot-prefixed). Paths above are relative to the repo root.
- If any of the referenced files move, update this AGENTS.md accordingly.
