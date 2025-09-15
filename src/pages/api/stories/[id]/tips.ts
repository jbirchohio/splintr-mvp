import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET daily tips for a story: ?days=30
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { id } = req.query as { id?: string }
  if (!id) return res.status(400).json({ error: 'Story ID required' })
  try {
    const days = Math.max(1, Math.min(365, parseInt((req.query.days as string) || '30', 10)))
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('tips')
      .select('amount, created_at')
      .eq('story_id', id)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
    if (error) throw error
    const byDay: Record<string, number> = {}
    for (const t of data || []) {
      const d = new Date((t as any).created_at)
      const key = d.toISOString().slice(0,10)
      byDay[key] = (byDay[key] || 0) + Number((t as any).amount || 0)
    }
    const series = Object.entries(byDay).sort(([a],[b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }))
    return res.status(200).json({ series })
  } catch (e) {
    console.error('Tips series error', e)
    return res.status(200).json({ series: [] })
  }
}

