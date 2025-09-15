import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET /api/search?q=foo -> { stories, creators, hashtags }
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const q = ((req.query.q as string) || '').trim()
    if (!q) return res.status(200).json({ stories: [], creators: [], hashtags: [] })
    const supabase = createServerClient()

    const [storiesRes, creatorsRes] = await Promise.all([
      supabase
        .from('stories')
        .select('id, creator_id, title, description, thumbnail_url, view_count, published_at')
        .eq('is_published', true)
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .order('published_at', { ascending: false })
        .limit(50),
      supabase
        .from('users')
        .select('id, name, avatar_url')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(20)
    ])

    const stories = storiesRes.data || []
    const creators = creatorsRes.data || []

    // Extract hashtag candidates
    const tagRegex = /(^|\s)#([\p{L}0-9_]{2,30})/gu
    const tags = new Set<string>()
    let m: RegExpExecArray | null
    while ((m = tagRegex.exec(q)) !== null) {
      tags.add(m[2].toLowerCase())
    }
    const hashtags = Array.from(tags)

    return res.status(200).json({ stories, creators, hashtags })
  } catch (error) {
    console.error('Search API error:', error)
    return res.status(200).json({ stories: [], creators: [], hashtags: [] })
  }
}

