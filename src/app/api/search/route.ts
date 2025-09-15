import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { searchSchemas } from '@/lib/validation-schemas'
import { createServerClient } from '@/lib/supabase'

export const GET = withSecurity(
  withValidation({ querySchema: searchSchemas.search })(async (req, { query }) => {
    const { q, type = 'all', page = 1, limit = 20 } = query as any
    const supabase = createServerClient()
    const offset = (Number(page) - 1) * Number(limit)
    const results: any = {}

    if (type === 'all' || type === 'stories') {
      if (String(q).startsWith('#')) {
        const tag = String(q).slice(1)
        const { data } = await supabase
          .from('story_hashtags')
          .select('story_id, stories!inner (id, title, description, thumbnail_url, creator_id, published_at)')
          .eq('tag', tag)
          .range(offset, offset + Number(limit) - 1)
        results.stories = (data || []).map((r: any) => ({
          id: r.stories.id,
          title: r.stories.title,
          description: r.stories.description,
          thumbnail_url: r.stories.thumbnail_url,
          creator_id: r.stories.creator_id,
          published_at: r.stories.published_at
        }))
      } else {
        const { data } = await supabase
          .from('stories')
          .select('id, title, description, thumbnail_url, creator_id, published_at')
          .eq('is_published', true)
          .ilike('title', `%${q}%`)
          .range(offset, offset + Number(limit) - 1)
        results.stories = data || []
      }
    }

    if (type === 'all' || type === 'creators') {
      const { data } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .ilike('name', `%${q}%`)
        .range(offset, offset + Number(limit) - 1)
      results.creators = data || []
    }

    return NextResponse.json(results)
  })
)
