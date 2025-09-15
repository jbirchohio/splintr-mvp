import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { createServerClient } from '@/lib/supabase'

export const GET = withSecurity(
  withValidation({ querySchema: validationSchemas.feed.publicFeed, requireAuth: true })(async (_req, { query, user }) => {
    const supabase = createServerClient()
    const page = Number((query as any)?.page || 1)
    const limit = Number((query as any)?.limit || 20)
    const offset = (page - 1) * limit

    // Get followed creators
    const { data: follows, error: followErr } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user!.id)

    if (followErr) return NextResponse.json({ error: 'Failed to load following' }, { status: 500 })
    const ids = (follows || []).map(f => f.following_id as string)
    if (ids.length === 0) {
      return NextResponse.json({ stories: [], pagination: { page, limit, total: 0, totalPages: 0 } })
    }

    const { data: stories, error, count } = await supabase
      .from('stories')
      .select('id, creator_id, title, description, thumbnail_url, view_count, published_at, is_premium, tip_enabled, category', { count: 'exact' })
      .eq('is_published', true)
      .in('creator_id', ids)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 })

    return NextResponse.json({
      stories: stories || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  })
)
