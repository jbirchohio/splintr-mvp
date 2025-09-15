import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const userId = (req.headers['x-user-id'] as string) || ''
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const supabase = createServerClient()

    const { data: stories, error } = await supabase
      .from('stories')
      .select('id, title, published_at, is_premium, tip_enabled')
      .eq('creator_id', userId)
      .order('published_at', { ascending: false })
    if (error) throw error
    const ids = (stories || []).map((s: any) => s.id)
    if (ids.length === 0) return res.status(200).json({ stories: [] })

    const [eng, likes, comments, tips] = await Promise.all([
      supabase.from('story_engagement_metrics').select('story_id, total_views, completions').in('story_id', ids),
      supabase.from('story_like_counts').select('story_id, like_count').in('story_id', ids),
      supabase.from('story_comment_counts').select('story_id, comment_count').in('story_id', ids),
      supabase.from('tips').select('story_id, amount').in('story_id', ids),
    ])

    const engMap = new Map((eng.data || []).map((r: any) => [r.story_id, r]))
    const likeMap = new Map((likes.data || []).map((r: any) => [r.story_id, r.like_count]))
    const commentMap = new Map((comments.data || []).map((r: any) => [r.story_id, r.comment_count]))
    const tipSums: Record<string, number> = {}
    for (const t of tips.data || []) {
      const sid = (t as any).story_id as string
      const amt = Number((t as any).amount) || 0
      tipSums[sid] = (tipSums[sid] || 0) + amt
    }

    const result = (stories || []).map((s: any) => {
      const e = engMap.get(s.id) || { total_views: 0, completions: 0 }
      const totalViews = Number(e.total_views) || 0
      const completions = Number(e.completions) || 0
      const completionRate = totalViews > 0 ? completions / totalViews : 0
      return {
        id: s.id,
        title: s.title,
        publishedAt: s.published_at,
        isPremium: !!s.is_premium,
        tipEnabled: !!s.tip_enabled,
        totalViews,
        completionRate,
        likes: Number(likeMap.get(s.id) || 0),
        comments: Number(commentMap.get(s.id) || 0),
        tips: Number(tipSums[s.id] || 0),
      }
    })

    return res.status(200).json({ stories: result })
  } catch (e) {
    console.error('Creator analytics error', e)
    return res.status(500).json({ error: 'Failed to load analytics' })
  }
}

