import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET /api/stories/[id]/comments?limit=50&cursor=ISO
// POST /api/stories/[id]/comments { content, parentId }
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query as { id: string }
  if (!id) return res.status(400).json({ error: 'Story ID is required' })

  if (req.method === 'GET') return getComments(req, res, id)
  if (req.method === 'POST') return addComment(req, res, id)
  return res.status(405).json({ error: 'Method not allowed' })
}

async function getComments(req: NextApiRequest, res: NextApiResponse, storyId: string) {
  try {
    const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '50', 10)))
    const cursor = (req.query.cursor as string) || null
    const supabase = createServerClient()

    let query = supabase
      .from('story_comments')
      .select('id, story_id, user_id, content, parent_comment_id, created_at')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query
    if (error) throw error

    // Next cursor is the last item's created_at
    const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null

    // UI expects author optional; return userId only
    const comments = (data || []).map((c) => ({
      id: c.id,
      content: c.content,
      userId: c.user_id,
      parentId: (c as any).parent_comment_id,
      createdAt: c.created_at,
    }))

    return res.status(200).json({ comments, nextCursor })
  } catch (error) {
    console.error('Comments GET error:', error)
    return res.status(200).json({ comments: [], nextCursor: null })
  }
}

async function addComment(req: NextApiRequest, res: NextApiResponse, storyId: string) {
  try {
    const userId = (req.headers['x-user-id'] as string) || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const { content, parentId } = (req.body || {}) as { content?: string; parentId?: string | null }
    if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' })

    const supabase = createServerClient()
    const { error } = await supabase
      .from('story_comments')
      .insert({ story_id: storyId, user_id: userId, content: content.trim(), parent_comment_id: parentId || null })

    if (error) throw error
    // Log interaction best-effort
    try { await supabase.from('user_interactions').insert({ user_id: userId, story_id: storyId, type: 'comment' }) } catch {}
    return res.status(201).json({ ok: true })
  } catch (error) {
    console.error('Comments POST error:', error)
    return res.status(500).json({ error: 'Failed to add comment' })
  }
}
