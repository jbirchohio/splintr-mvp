# Splintr MVP — Deployment & Sale‑Readiness Audit

Last updated: 2025-09-12

## Executive Summary

- Verdict: No‑Go today for sale/production. Strong MVP feature coverage and planning, but gaps in deployment packaging, CI/CD, health/observability, rate‑limiting enforcement, and commercial/legal artifacts block readiness.
- Key Risks
  - No container/IaC or deploy manifests; no CI/CD pipelines.
  - Rate limiting implemented but not applied to API routes.
  - No health/readiness endpoints; limited logging, no metrics/tracing.
  - LICENSE file missing (README claims MIT).
  - SBOM, dependency risk posture, and release/version practice are absent.
- Top 5 Fixes
  1) Dockerfile + docker‑compose + minimal CI pipeline (build/lint/test/e2e).  
  2) Enforce rate limiting via middleware on priority routes.  
  3) Add health/readiness probes and structured logging (pino).  
  4) Add LICENSE (MIT), license audit, and SBOM generation.  
  5) Add release/versioning flow (SemVer, changelog) and deployment guide.

## Readiness Scores (0–5)

- Code Quality & Tests: 3.5
- Build & Deploy: 2
- Security: 3
- Compliance & Legal: 2.5
- Operations: 2
- Reliability & Data: 3
- Performance & Scalability: 3
- Documentation & Handover: 3
- Release Management: 2
- Commercial Readiness: 2
- Overall: 2.6

## Findings by Category

### Build, Packaging, Deployment
- Severity: High
- Evidence: No Docker/IaC/compose/Helm in repo.  
  Command: `rg -n "(Dockerfile|docker-compose|helm|Chart.yaml|terraform|pulumi)"`
- Impact: Blocks reproducible deploys and handover.
- Recommendation: Add multi‑stage Dockerfile and `docker-compose.yml` (app + Redis). Provide `vercel.json` if targeting Vercel.
- Effort: M

### CI/CD and Release
- Severity: High
- Evidence: No `.github/workflows`; no changelog/version flow.  
  Command: check `.github/workflows` → none
- Impact: No automated quality gates or provenance.
- Recommendation: GitHub Actions with install, type‑check, lint, Jest, Playwright, build. Adopt SemVer and CHANGELOG.
- Effort: M

### Security Controls (Headers/Validation/Rate‑limit)
- Severity: High
- Evidence: `src/lib/rate-limit.ts` exists but not used in `src/app/api/**`.  
  Command: `rg -n "withRateLimit\(" src/app/api` → no results
- Impact: Susceptible to brute force and overuse.
- Recommendation: Wrap auth, upload, moderation, and feed endpoints with `withRateLimit(...)` using `RATE_LIMITS` presets.
- Effort: S–M

### Health/Readiness and Observability
- Severity: High
- Evidence: No health/readiness endpoints; console logging; no metrics/tracing.  
  Commands: `rg -n "(health|ready|liveness|readiness|metrics|tracing)"`  
  Redis health util exists: `src/utils/redis-health.ts`
- Impact: Hard to operate in prod and integrate with probes.
- Recommendation: Add `/api/health` (Supabase + Redis check); adopt pino for structured logs; wire basic OpenTelemetry.
- Effort: M

### Secrets and Config
- Severity: Medium
- Evidence: No secrets committed; comprehensive `.env.example`.  
  Command: secrets scan with `rg` returned only placeholders.
- Impact: Good posture; strengthen ops guidance.
- Recommendation: Add secrets management/rotation guidance and least‑privilege notes.
- Effort: S

### Compliance & Legal
- Severity: High
- Evidence: README claims MIT; `LICENSE` missing.  
  Command: `Test-Path LICENSE` → missing
- Impact: Legal blocker for sale/adoption.
- Recommendation: Add MIT `LICENSE`; generate dependency license inventory/attributions.
- Effort: S

### Data Privacy and GDPR/CCPA
- Severity: Medium
- Evidence: Data export/delete endpoints implemented; Privacy and Terms pages present.  
  Files: `src/app/api/users/export|delete/route.ts`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`
- Impact: Solid start; policy and DPA coverage needed.
- Recommendation: Add data‑processing map, retention policy, and DPA references (Supabase, Cloudinary/Mux, Stripe). Review logs for PII.
- Effort: S–M

### Payments and Idempotency
- Severity: Medium
- Evidence: Stripe webhook validates signature and has basic idempotency; ledger updates.  
  File: `src/app/api/payments/webhooks/stripe/route.ts`
- Impact: Reasonable; improve replay protection and tests.
- Recommendation: Cache processed event IDs to prevent replays; expand refund/chargeback tests.
- Effort: S–M

### Performance & Scalability
- Severity: Medium
- Evidence: Redis caching and feed design; no load testing plan/targets.
- Impact: Unknown limits under load.
- Recommendation: Add k6/Artillery scenarios for feed, upload, viewer; set p95 latency and throughput goals aligned to requirements.
- Effort: M

### Documentation & Handover
- Severity: Medium
- Evidence: Strong .kiro specs and docs; missing prod deployment/runbook; no changelog.
- Impact: Slower buyer onboarding.
- Recommendation: Add deployment guides (Vercel + Docker), ops runbook, environment matrix, rollback notes; add CHANGELOG.
- Effort: S–M

### Release Management & SBOM
- Severity: High
- Evidence: No SBOM or CI scans; version only in `package.json`.
- Impact: Compliance and due‑diligence gaps.
- Recommendation: Generate CycloneDX SBOM; add license checker and SCA in CI; publish artifacts.
- Effort: S–M

## Prioritized Remediation Plan

Wave 1 (1–3 days)
- Add MIT LICENSE and NOTICE/attributions. Effort: S.
- `/api/health` + readiness checks; integrate pino. Effort: M.
- Enforce rate limiting on auth/upload/feed/moderation routes. Effort: S–M.
- SBOM and dependency license audit scripts. Effort: S.

Wave 2 (3–5 days)
- Dockerfile + docker‑compose; GitHub Actions (install, type‑check, lint, Jest, Playwright, build, SBOM). Effort: M.
- Basic OpenTelemetry tracing for API routes. Effort: M.

Wave 3 (3–5 days)
- Deployment guides (Vercel + Docker), ops runbook, env matrix. Effort: M.
- Commercial docs (EULA/SLA/support policy); load testing plan and targets. Effort: M.

## Deployment Guide Checklist

- Commands
  - Dev: `npm install`, `cp .env.example .env.local`, `npm run dev`
  - Build/Start: `npm run build`, `npm run start`
  - DB: `supabase start`, `supabase db reset`, `npm run db:types`
- Env Vars (see `.env.example`)
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - OAuth: Google/Apple client IDs/secrets
  - Video: Cloudinary/Mux keys
  - Redis: `REDIS_URL` (+ TTL and RL vars)
  - Payments: Stripe keys/webhooks
  - Push: VAPID/FCM keys
- Infra prerequisites
  - Managed Supabase, Redis, Cloudinary/Mux, Stripe; HTTPS; webhook reachability.
- Containerization (to add)
  - `Dockerfile`, `docker-compose.yml` with healthchecks.
- Health/Monitoring (to add)
  - `/api/health`; structured logs; OTel exporter.

## Due Diligence Appendix

- SBOM Plan: `npx @cyclonedx/cyclonedx-npm --output bom.json`
- License Summary: `npx license-checker --json > licenses.json`
- Data Processing Map: Supabase (auth/data), Cloudinary/Mux (video), Stripe (payments), FCM/APNs (push). Include DPAs and data categories.
- Open Questions: hosting target, SLOs, residency, incident/SLA requirements, buyer compliance asks.

## Go/No‑Go

- Recommendation: No‑Go until Wave 1 and 2 remediations are complete and validated.

## 10‑Day Action Plan

Day 1–2: LICENSE; health/readiness; pino logging.  
Day 2–3: Apply rate limiting; verify with tests.  
Day 3–5: Dockerfile/compose; GitHub Actions; SBOM/license audit artifacts.  
Day 5–7: OTel tracing; deployment guides; ops runbook.  
Day 7–10: Load testing; EULA/SLA/support docs; dependency/CVE scan and fixes.

