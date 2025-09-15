import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET /api/hashtags/[tag]/stories -> { stories: [...] }
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { tag } = req.query as { tag: string }
  if (!tag) return res.status(400).json({ error: 'Tag required' })

  try {
    const supabase = createServerClient()
    // Heuristic search across title/description (fallback if hashtags array not present)
    const { data, error } = await supabase
      .from('stories')
      .select('id, creator_id, title, description, thumbnail_url, view_count, published_at')
      .eq('is_published', true)
      .or(`title.ilike.%${tag}%,description.ilike.%${tag}%`)
      .order('published_at', { ascending: false })

    if (error) throw error
    return res.status(200).json({ stories: data || [] })
  } catch (error) {
    console.error('Hashtag stories API error:', error)
    return res.status(200).json({ stories: [] })
  }
}

