import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { RATE_LIMITS } from '@/lib/rate-limit'

export const GET = withSecurity(
  withValidation({ rateLimit: RATE_LIMITS.READ })(async () => {
  const supabase = createServerClient()
  // Use PostgREST aggregate alias to emulate GROUP BY category
  const { data, error } = await supabase
    .from('stories')
    .select('category, count:category')
    .eq('is_published', true)
    .not('category', 'is', null)
    .neq('category', '')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const categories = (data || []).map((r: any) => ({ category: r.category as string, count: Number((r as any).count) || 0 }))
  return NextResponse.json({ categories })
  })
)
