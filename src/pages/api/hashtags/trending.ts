import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET /api/hashtags/trending -> { hashtags: [{ tag, count }] }
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const supabase = createServerClient()
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const { data, error } = await supabase
      .from('stories')
      .select('title, description')
      .eq('is_published', true)
      .gte('published_at', since)
      .limit(1000)
    if (error) throw error
    const counts: Record<string, number> = {}
    const tagRegex = /(^|\s)#([\p{L}0-9_]{2,30})/gu
    for (const row of data || []) {
      const text = `${(row as any).title || ''} ${(row as any).description || ''}`
      const seen = new Set<string>()
      let m: RegExpExecArray | null
      while ((m = tagRegex.exec(text)) !== null) {
        const tag = m[2].toLowerCase()
        if (seen.has(tag)) continue
        seen.add(tag)
        counts[tag] = (counts[tag] || 0) + 1
      }
    }
    const hashtags = Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
    return res.status(200).json({ hashtags })
  } catch (error) {
    console.error('Trending hashtags error:', error)
    return res.status(200).json({ hashtags: [] })
  }
}

