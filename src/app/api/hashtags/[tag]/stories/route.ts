import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { RATE_LIMITS } from '@/lib/rate-limit'

export const GET = withSecurity(
  withValidation({ rateLimit: RATE_LIMITS.READ })(async (_req: Request, { params }: { params: { tag: string } }) => {
  const tag = decodeURIComponent(params.tag)
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('story_hashtags')
    .select('story_id, stories!inner (id, creator_id, title, description, thumbnail_url, view_count, published_at)')
    .eq('tag', tag)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const stories = (data || []).map((r: any) => r.stories)
  return NextResponse.json({ stories })
  })
)
