import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { createServerClient } from '@/lib/supabase'

// Trending based on recent engagement velocity (last 48h) with decay
export const GET = withSecurity(
  withValidation({ querySchema: validationSchemas.feed.publicFeed })(async (_req, { query }) => {
    const page = Number((query as any)?.page || 1)
    const limit = Number((query as any)?.limit || 20)
    const supabase = createServerClient()

    // Pull recent interactions and aggregate by story on the DB side could be better; here we do multiple queries.
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    const [{ data: stories }, { data: interactions }] = await Promise.all([
      supabase.from('stories').select('id, creator_id, title, description, thumbnail_url, view_count, published_at, is_premium, tip_enabled, category').eq('is_published', true).gt('published_at', since),
      supabase.from('user_interactions').select('story_id, type, created_at').gte('created_at', since)
    ])
    if (!stories) return NextResponse.json({ stories: [], pagination: { page, limit, total: 0, totalPages: 0 } })

    const map = new Map<string, number>()
    const now = Date.now()
    for (const it of interactions || []) {
      if (!it.story_id) continue
      const ageH = (now - new Date(it.created_at as any).getTime()) / 3600000
      const decay = Math.pow(0.5, ageH / 12) // half-life 12h
      let w = 0
      switch (it.type) {
        case 'like': w = 2; break
        case 'comment': w = 3; break
        case 'share': w = 4; break
        case 'complete': w = 5; break
        case 'view': w = 1; break
        case 'time_spent': w = 1.5; break
        default: w = 0.5
      }
      map.set(it.story_id as any, (map.get(it.story_id as any) || 0) + w * decay)
    }

    const scored = stories.map(s => {
      const base = map.get(s.id as any) || 0
      // small recency factor
      const hours = s.published_at ? (now - new Date(s.published_at as any).getTime()) / 3600000 : 0
      const recency = Math.max(0, 1 - hours / 72)
      const score = base + 5 * recency
      return { story: s, score }
    })
    scored.sort((a, b) => b.score - a.score)
    const total = scored.length
    const start = (page - 1) * limit
    const items = scored.slice(start, start + limit).map(x => x.story)
    return NextResponse.json({ stories: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  })
)
