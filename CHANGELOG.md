# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

### Added
- Health endpoint (`/api/health`) and readiness endpoint (`/api/readiness`).
- Structured logging via `pino` with pretty output in development.
- Dockerfile, docker-compose, and .dockerignore for containerized deployment.
- GitHub Actions CI with split jobs for lint/type-check, unit tests, build, e2e, and SBOM/license artifacts.
- Sale-readiness audit (`docs/sale-readiness-audit.md`), environment matrix, and deployment guides (Vercel and Docker).
- Admin checks for feed refresh and moderation flag listing via `RECS_ADMIN_USER_IDS`.

### Changed
- Replaced `console` logs with structured logger in critical API routes (payments webhook, videos, feed, auth, stories, avatar, account deletion, security middleware).

### Security
- Enforced rate limiting via validation middleware configuration across several API routes.

