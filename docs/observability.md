# Observability (Tracing & Logs)

This project uses:
- Structured logs: `pino` (JSON) → platform log aggregator
- Tracing: OpenTelemetry SDK with OTLP HTTP exporter (via `instrumentation.ts`)

## Configuration (Provider-agnostic via OTLP)

Set environment variables:
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP trace endpoint (e.g., Datadog, Grafana Tempo/Cloud, Honeycomb)
- `OTEL_EXPORTER_OTLP_HEADERS`: comma-separated key=value headers (e.g., `api-key=XXXX`)
- `OTEL_SERVICE_NAME`: defaults to `splintr`

Examples:
- Datadog: `OTEL_EXPORTER_OTLP_ENDPOINT=https://api.datadoghq.com/api/v2/otlp` and `OTEL_EXPORTER_OTLP_HEADERS=DD-API-KEY=xxxxx`
- Grafana Cloud: `OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-<id>.grafana.net/otlp` and `OTEL_EXPORTER_OTLP_HEADERS=authorization=Basic <token>`

## Logs

Development: pretty-printed logs (`pino-pretty`).  
Production: JSON logs. Use your platform (Vercel, Docker logging driver, ELK/Loki) to collect & query.

