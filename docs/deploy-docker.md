# Deploying with Docker

This guide describes running Splintr with Docker and docker-compose.

## Build

```bash
docker build -t splintr:latest .
```

## Run (compose)

```bash
docker-compose up -d --build
```

Services:
- app: Next.js server on port 3000 (exposed)
- redis: Redis 7 (exposed 6379 for local use)

Healthchecks:
- App: `/api/health` (HTTP 200 when healthy)
- Redis: `redis-cli ping`

## Environment Variables

Provide required env in a `.env` file (docker-compose reads from host env by default):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
REDIS_URL=redis://redis:6379
NEXTAUTH_URL=https://your-domain
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

## Reverse Proxy & TLS

Run behind nginx/Caddy/Traefik with TLS termination. Example nginx site:

```
server {
  listen 443 ssl http2;
  server_name your-domain;

  location / {
    proxy_pass http://app:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

## Webhooks

Expose `POST /api/payments/webhooks/stripe` publicly (Stripe) and set `STRIPE_WEBHOOK_SECRET`.

## Operations

- Logs: structured JSON via pino; aggregate with Loki/ELK.
- Readiness: `/api/readiness` validates Cloudinary/Stripe configuration.
- Backups: manage at data providers (Supabase, Redis snapshot service).

