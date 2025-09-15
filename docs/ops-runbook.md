# Ops Runbook

This runbook outlines day-2 operations for Splintr across environments.

## Health & Readiness
- Health: `GET /api/health` — checks Supabase and Redis. 200 when OK, 503 otherwise.
- Readiness: `GET /api/readiness` — validates Cloudinary and Stripe (if configured).
- If degraded/down:
  - Verify env vars are set (see `docs/env-matrix.md`).
  - Redis: `redis-cli -u $REDIS_URL PING` should return PONG.
  - Supabase: check service role key and DB availability via Supabase status.
  - Cloudinary/Stripe: verify credentials and provider status.

## Logs & Metrics
- Logs: structured JSON via `pino` on stdout. Aggregate via your platform (Vercel logs, ELK, Loki).
- Tracing/Metrics: optional OpenTelemetry integration recommended for API routes.

## Common Operations
- Restart service: platform-specific (Vercel redeploy, Docker `docker-compose restart app`).
- Clear cache selectively (dangerous): use Redis keys from `src/lib/redis.ts`.
- Prewarm feed cache: POST `/api/feed` (admin only), requires `RECS_ADMIN_USER_IDS` allowlist.

## Backups & DR
- Database (Supabase/Postgres): use managed backups and retention. Define RPO/RTO per env.
- Redis: use managed snapshots or durable tier; not a source of record.
- Storage (Cloudinary/Mux): rely on provider resilience; maintain content IDs for reprocessing.

## Secrets Management
- Store secrets in platform secret stores (Vercel envs, GitHub Actions secrets, etc.).
- Rotate keys periodically (Stripe, Supabase, Cloudinary). Update envs and redeploy.

## Incidents
- Severity triage: Sev1 (full outage), Sev2 (critical path degraded), Sev3 (minor feature impact).
- First response:
  - Capture timeline and current config (commit SHA, env versions).
  - Check `/api/health` and `/api/readiness`.
  - Inspect logs around incident time.
- Communications: route updates to stakeholders; file a postmortem for Sev1/Sev2.

## On-call Checklists
- New deployment smoke test:
  - `/api/health` returns 200
  - Auth sign-in flow works
  - Feed loads and stories play
  - Upload small avatar and video (dev/stage)
  - Stripe webhook delivers in stage (test keys)
- Rollback:
  - Vercel: redeploy previous build
  - Docker: `docker-compose rollback` or re-run previous tag

## Compliance & Privacy
- Data export: `GET /api/users/export` (user auth required)
- Account deletion: `DELETE /api/users/delete` (auth required)
- Ensure policies at `/privacy` and `/terms` are published and current.

