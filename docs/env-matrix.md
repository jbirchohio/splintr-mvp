# Environment Matrix (Dev/Stage/Prod)

This document enumerates required environment variables per environment and recommended management.

## Core Variables

- NEXT_PUBLIC_SUPABASE_URL — public; per-environment
- NEXT_PUBLIC_SUPABASE_ANON_KEY — public; per-environment
- SUPABASE_SERVICE_ROLE_KEY — secret; server-only
- NEXTAUTH_URL — base URL of the app

## OAuth (Prod/Stage only; optional in Dev)
- SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID / SECRET — secret
- SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID / SECRET — secret

## Video/Storage
- CLOUDINARY_CLOUD_NAME — public
- CLOUDINARY_API_KEY — secret
- CLOUDINARY_API_SECRET — secret
- CLOUDINARY_WEBHOOK_URL — server URL (per env)

## Redis
- REDIS_URL — connection string
- CACHE_TTL_* — optional tuning
- REDIS_* feature toggles (see `.env.example`)

## Security / Rate Limiting
- SKIP_RATE_LIMIT — only true in tests
- ALLOWED_ORIGINS — CORS list, comma-separated

## Payments
- STRIPE_SECRET_KEY — secret
- STRIPE_WEBHOOK_SECRET — secret
- STRIPE_CONNECT_WEBHOOK_SECRET — secret

## Push / Web Push
- VAPID_PUBLIC_KEY — public
- VAPID_PRIVATE_KEY — secret
- FCM_SERVER_KEY — secret

## Admin Access
- Admins are identified via Supabase user `app_metadata.role === 'admin'`.
- Use scripts to manage roles:
  - Grant: `npm run admin:grant <userId>`
  - Revoke: `npm run admin:revoke <userId>`

## Recommended Management

- Dev: `.env.local` (never commit). Use test keys.
- Stage: platform-managed secrets (Vercel/Actions/Docker secrets). Use staging projects/keys.
- Prod: platform-managed secrets + rotation policy. Store in a centralized secrets manager (Vercel envs, AWS Secrets Manager, Doppler, SOPS).

## Parity Notes

- Keep all keys present across environments even if empty (prevents missing var bugs).
- Use distinct Supabase projects and Cloudinary/Stripe accounts per environment.
- Webhooks: set environment-appropriate URLs and verify signatures in each env.
