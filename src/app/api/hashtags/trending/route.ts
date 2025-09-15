import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { RATE_LIMITS } from '@/lib/rate-limit'

export const GET = withSecurity(
  withValidation({ rateLimit: RATE_LIMITS.READ })(async () => {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('story_hashtags')
    .select('tag, created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // naive trending by recent usage count
  const now = Date.now()
  const counts = new Map<string, number>()
  ;(data || []).forEach(r => {
    const ageHours = (now - new Date((r as any).created_at).getTime()) / 3600000
    const weight = Math.max(0.1, 1 - ageHours / 48) // 2 day window
    counts.set((r as any).tag, (counts.get((r as any).tag) || 0) + weight)
  })
  const trending = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([tag, score]) => ({ tag, score }))
  return NextResponse.json({ trending })
  })
)
