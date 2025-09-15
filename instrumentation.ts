// OpenTelemetry initialization for Next.js (Node runtime)
// Uses OTLP HTTP exporter. Configure via env:
// - OTEL_EXPORTER_OTLP_ENDPOINT
// - OTEL_EXPORTER_OTLP_HEADERS (e.g., 'api-key=xxxxx')
// - OTEL_SERVICE_NAME (defaults to 'splintr')

import { NodeSDK } from '@opentelemetry/sdk-node'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'

export async function register() {
  // Only run in Node.js runtime
  if (typeof process === 'undefined' || (process as any).env?.NEXT_RUNTIME === 'edge') {
    return
  }

  const serviceName = process.env.OTEL_SERVICE_NAME || 'splintr'

  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS || ''),
    concurrencyLimit: 10,
  })

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: exporter,
    instrumentations: [
      new HttpInstrumentation(),
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [/.*/],
      }),
    ],
  })

  sdk.start().catch(() => {})
}

function parseHeaders(h: string): Record<string, string> {
  // format: 'key1=val1,key2=val2'
  const out: Record<string, string> = {}
  h.split(',').map((pair) => pair.trim()).filter(Boolean).forEach((pair) => {
    const [k, v] = pair.split('=')
    if (k && v) out[k.trim()] = v.trim()
  })
  return out
}

