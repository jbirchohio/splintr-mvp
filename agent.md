Agent Guide Pointer

Canonical file: `AGENTS.md`

For planning/specs, read:
- `AGENTS.md` (single source of truth)
- `.kiro/specs/splintr-mvp/tasks.md` (task list)

Sale‑Readiness Audit
- Full audit: `docs/sale-readiness-audit.md`
- Status: No‑Go pending remediation (see checklist below)

Remediation Checklist (complete before handoff/sale)
- [ ] Add MIT `LICENSE` at repo root and attributions
- [ ] Add `/api/health` (Supabase/Redis) and readiness probe
- [ ] Replace console logs with structured logging (`pino`)
- [ ] Enforce rate limiting (`withRateLimit`) on auth/upload/feed/moderation routes
- [ ] Generate SBOM (CycloneDX) and dependency license report in CI
- [ ] Add multi‑stage `Dockerfile` and `docker-compose.yml` (app + Redis) with healthchecks
- [ ] Add GitHub Actions pipeline (install, type‑check, lint, Jest, Playwright, build, SBOM upload)
- [ ] Add basic OpenTelemetry tracing for API routes
- [ ] Add deployment guides (Vercel + Docker) and ops runbook (env matrix, rollback)
- [ ] Add load testing scripts and targets (k6/Artillery) with p95 goals
- [ ] Add commercial docs (EULA/SLA/support policy)
  - Added in `docs/legal/` (EULA.md, SLA.md, Support.md)

Notes
- Keep `.kiro` docs authoritative; do not reorganize without instruction.
 - More deployment docs: `docs/deploy-vercel.md`, `docs/deploy-docker.md`, `docs/env-matrix.md`
 - Ops runbook: `docs/ops-runbook.md`
 - Admin roles: `docs/admin-roles.md` (Supabase app_metadata.role)
