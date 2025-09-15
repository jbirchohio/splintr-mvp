import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET /api/categories -> { categories: [{ category, count }] }
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const supabase = createServerClient()
    // Aggregate by category for published stories
    // Supabase doesn't support groupBy in JS client directly; use RPC or multiple queries.
    // Simple approach: fetch categories and count client-side.
    const { data, error } = await supabase
      .from('stories')
      .select('category')
      .eq('is_published', true)
    if (error) throw error

    const counts: Record<string, number> = {}
    for (const row of data || []) {
      const c = (row as any).category as string | null
      if (!c) continue
      counts[c] = (counts[c] || 0) + 1
    }
    const categories = Object.entries(counts).map(([category, count]) => ({ category, count }))
    categories.sort((a, b) => b.count - a.count)
    return res.status(200).json({ categories })
  } catch (error) {
    console.error('Categories API error:', error)
    return res.status(200).json({ categories: [] })
  }
}

