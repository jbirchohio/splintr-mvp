import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { RedisHealthCheck } from '@/utils/redis-health'
import { logger } from '@/lib/logger'

export async function GET() {
  const startedAt = Date.now()

  // Check Redis
  const redis = await RedisHealthCheck.isHealthy()

  // Check Supabase (database)
  let supabaseOk = false
  let supabaseMessage = 'ok'
  let supabaseLatency: number | undefined
  try {
    const t0 = Date.now()
    const sb = createServerClient()
    // Perform a lightweight query; rely on service role to bypass RLS
    const { error } = await sb.from('users').select('id').limit(1)
    supabaseLatency = Date.now() - t0
    if (error) {
      supabaseOk = false
      supabaseMessage = `query error: ${error.message}`
    } else {
      supabaseOk = true
    }
  } catch (e: any) {
    supabaseOk = false
    supabaseMessage = e?.message || 'supabase error'
  }

  const overall = redis.healthy && supabaseOk
  const status = overall ? 'ok' : (redis.healthy || supabaseOk ? 'degraded' : 'down')
  const httpStatus = overall ? 200 : 503

  const body = {
    status,
    uptimeMs: Date.now() - startedAt,
    checks: {
      redis: { healthy: redis.healthy, message: redis.message, latency: redis.latency },
      supabase: { healthy: supabaseOk, message: supabaseMessage, latency: supabaseLatency },
    },
    timestamp: new Date().toISOString(),
  }

  if (!overall) {
    logger.warn({ health: body }, 'Health check not OK')
  }

  return NextResponse.json(body, { status: httpStatus })
}

