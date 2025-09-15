import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const POST = withSecurity(
  withValidation({ rateLimit: RATE_LIMITS.GENERAL })(async (req: Request) => {
  const secret = process.env.CRON_SECRET
  const header = (req.headers.get('x-cron-key') || '').trim()
  if (!secret || header !== secret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createServerClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('stories')
    .update({ is_published: true, published_at: now })
    .lte('scheduled_publish_at', now)
    .eq('is_published', false)
  if (error) {
    logger.error({ err: error }, 'Cron publish-due update error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
  })
)
