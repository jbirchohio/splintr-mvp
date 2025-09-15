# Deploying to Vercel

This guide describes a standard Vercel deployment for Splintr (Next.js 15).

## Prerequisites
- Vercel account and project
- Supabase project (per environment)
- Cloudinary and Stripe accounts

## Project Settings
- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm ci`
- Output: default (`.next`) — Vercel handles it automatically

## Environment Variables
Set the following in Vercel Project → Settings → Environment Variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (encrypted)
- NEXTAUTH_URL (e.g., `https://<your-domain>`)
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CONNECT_WEBHOOK_SECRET
- REDIS_URL (if using a managed Redis)
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, FCM_SERVER_KEY (if using push)
- RECS_ADMIN_USER_IDS (comma-separated user IDs)

## Routing & Middleware
- Middleware enforces HTTPS and gated routes via `middleware.ts`.
- Health Endpoint: `/api/health`
- Readiness Endpoint: `/api/readiness`

## Webhooks
- Cloudinary: set notification URL to `https://<your-domain>/api/videos/webhook`
- Stripe: create endpoints for `https://<your-domain>/api/payments/webhooks/stripe`
  - Ensure secrets set: `STRIPE_WEBHOOK_SECRET` and optionally `STRIPE_CONNECT_WEBHOOK_SECRET`.

## Redis
- Use Vercel KV, Upstash, or Redis Cloud; set `REDIS_URL` accordingly.

## Monitoring
- Logs: structured via `pino` (visible in Vercel logs)
- Add external APM if needed; OpenTelemetry hookup can export to OTLP.

## Promotion Strategy
- Use Vercel Environments (Preview, Production)
- Protect Production with approvals; promote after CI green and smoke checks.

