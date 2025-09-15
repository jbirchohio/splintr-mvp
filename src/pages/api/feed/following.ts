import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET /api/feed/following?page=&limit=
// Returns { stories: [...], pagination: { page, limit, total } }
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const limit = Math.max(1, Math.min(50, parseInt((req.query.limit as string) || '20', 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const supabase = createServerClient()

    // Derive current user from middleware headers if present
    const userId = (req.headers['x-user-id'] as string) || undefined

    // If no user, return empty following feed gracefully
    if (!userId) {
      return res.status(200).json({ stories: [], pagination: { page, limit, total: 0, totalPages: 1 } })
    }

    // Get list of followed creator ids (user_follows.following_id)
    const { data: follows, error: followsErr } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)

    if (followsErr) {
      console.error('Following list error:', followsErr)
      return res.status(500).json({ error: 'Failed to load following' })
    }

    const creatorIds = (follows || []).map((f: any) => f.following_id)

    if (creatorIds.length === 0) {
      return res.status(200).json({ stories: [], pagination: { page, limit, total: 0, totalPages: 1 } })
    }

    // Count total published stories from followed creators
    const { count, error: countErr } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .in('creator_id', creatorIds)

    if (countErr) {
      console.error('Following feed count error:', countErr)
    }

    // Fetch paged stories
    const { data, error } = await supabase
      .from('stories')
      .select('id, creator_id, title, description, thumbnail_url, view_count, published_at, is_premium, tip_enabled, category')
      .eq('is_published', true)
      .in('creator_id', creatorIds)
      .order('published_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Following feed error:', error)
      return res.status(500).json({ error: 'Failed to load following feed' })
    }

    const total = count ?? data?.length ?? 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return res.status(200).json({
      stories: data || [],
      pagination: { page, limit, total, totalPages }
    })
  } catch (error) {
    console.error('Following feed API error:', error)
    return res.status(500).json({ error: 'Failed to fetch following feed' })
  }
}
