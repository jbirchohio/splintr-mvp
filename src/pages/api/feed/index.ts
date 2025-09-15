import { NextApiRequest, NextApiResponse } from 'next'
import { FeedService } from '@/services/feed.service'
import { createServerClient } from '@/lib/supabase'

// GET /api/feed
// Supports:
// - Cursor feed: ?type=chronological|trending&limit=&cursor=
// - Category feed: ?category=Name&page=&limit=
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type, cursor, limit: limitStr, category, page: pageStr } = req.query as {
      type?: 'chronological' | 'trending'
      cursor?: string
      limit?: string
      category?: string
      page?: string
    }

    const limit = Math.max(1, Math.min(50, parseInt(limitStr || '20', 10)))

    // Branch: Category paged feed shape expected by useCategoryFeed
    if (category) {
      const page = Math.max(1, parseInt(pageStr || '1', 10))
      const from = (page - 1) * limit
      const to = from + limit - 1

      const supabase = createServerClient()

      // Count total
      const { count, error: countErr } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('category', category)

      if (countErr) {
        console.error('Category feed count error:', countErr)
      }

      // Page data
      const { data, error } = await supabase
        .from('stories')
        .select('id, creator_id, title, description, thumbnail_url, view_count, published_at, is_premium, tip_enabled, category')
        .eq('is_published', true)
        .eq('category', category)
        .order('published_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Category feed error:', error)
        return res.status(500).json({ error: 'Failed to load category feed' })
      }

      const total = count ?? data?.length ?? 0
      const totalPages = Math.max(1, Math.ceil(total / limit))

      return res.status(200).json({
        stories: data || [],
        pagination: { page, limit, total, totalPages }
      })
    }

    // Trending: compute simple engagement-velocity score from recent events
    if (type === 'trending') {
      const supabase = createServerClient()
      const offset = Math.max(0, parseInt((cursor as string) || '0', 10) || 0)

      // Use materialized velocity view if available
      const { data: vel } = await supabase
        .from('story_velocity')
        .select('story_id, views_48h, likes_48h, completes_48h')

      let storyScores: Array<{ id: string; score: number }> = []
      for (const r of vel || []) {
        const id = (r as any).story_id as string
        if (!id) continue
        const score = ((Number((r as any).views_48h) || 0) * 0.01)
          + ((Number((r as any).likes_48h) || 0) * 0.2)
          + ((Number((r as any).completes_48h) || 0) * 0.3)
        storyScores.push({ id, score })
      }
      if (storyScores.length === 0) {
        const { data } = await supabase
          .from('stories')
          .select('id')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(500)
        storyScores = (data || []).map((r: any, idx: number) => ({ id: r.id, score: 0 - idx }))
      } else {
        storyScores.sort((a, b) => b.score - a.score)
      }

      const slice = storyScores.slice(offset, offset + limit).map(s => s.id)
      if (slice.length === 0) {
        return res.status(200).json({ items: [], hasMore: false, nextCursor: null, totalCount: storyScores.length })
      }
      const { data: stories } = await supabase
        .from('stories')
        .select('id, creator_id, title, description, thumbnail_url, view_count, published_at')
        .in('id', slice)

      const storyMap = new Map((stories || []).map((s: any) => [s.id, s]))
      const items = slice
        .map(id => storyMap.get(id))
        .filter(Boolean)
        .map((s: any) => ({
          storyId: s.id,
          creatorId: s.creator_id,
          creatorName: '',
          title: s.title,
          description: s.description,
          thumbnailUrl: s.thumbnail_url,
          viewCount: s.view_count || 0,
          publishedAt: s.published_at,
        }))
      const nextCursor = offset + limit < storyScores.length ? String(offset + limit) : null
      const hasMore = nextCursor !== null
      return res.status(200).json({ items, hasMore, nextCursor, totalCount: storyScores.length })
    }

    // Default: cursor feed via FeedService (chronological)
    const response = await FeedService.getFeed('chronological', { limit, cursor: cursor || undefined })
    return res.status(200).json(response)
  } catch (error) {
    console.error('Feed index API error:', error)
    return res.status(500).json({ error: 'Failed to fetch feed' })
  }
}
