import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET /api/recs/metrics?sinceHours=24
// Computes per-variant outcomes for signed-in users by joining feed_exposures and user_interactions
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const sinceHours = Math.max(1, Math.min(720, parseInt((req.query.sinceHours as string) || '24', 10)))
    const since = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString()
    const supabase = createServerClient()

    // Fetch exposures (signed-in only)
    const { data: exposures, error: expErr } = await supabase
      .from('feed_exposures')
      .select('user_id, story_id, variant, created_at')
      .not('user_id', 'is', null)
      .gte('created_at', since)
      .limit(20000)
    if (expErr) throw expErr

    const byVariant: Record<string, { keys: Set<string>; users: Set<string>; stories: Set<string>; exposures: number }> = {}
    for (const e of exposures || []) {
      const v = String((e as any).variant || 'A').toUpperCase()
      const uid = (e as any).user_id as string
      const sid = (e as any).story_id as string
      if (!uid || !sid) continue
      byVariant[v] = byVariant[v] || { keys: new Set(), users: new Set(), stories: new Set(), exposures: 0 }
      byVariant[v].keys.add(`${uid}|${sid}`)
      byVariant[v].users.add(uid)
      byVariant[v].stories.add(sid)
      byVariant[v].exposures += 1
    }

    const allUsers = Array.from(new Set((exposures || []).map(e => (e as any).user_id).filter(Boolean))) as string[]
    const allStories = Array.from(new Set((exposures || []).map(e => (e as any).story_id).filter(Boolean))) as string[]
    if (allUsers.length === 0 || allStories.length === 0) {
      return res.status(200).json({ since, variants: {} })
    }

    const { data: events, error: evErr } = await supabase
      .from('user_interactions')
      .select('user_id, story_id, type, value, created_at')
      .gte('created_at', since)
      .in('user_id', allUsers)
      .in('story_id', allStories)
      .limit(50000)
    if (evErr) throw evErr

    const result: any = {}
    for (const [variant, agg] of Object.entries(byVariant)) {
      const keys = agg.keys
      let views = 0, completes = 0, likes = 0, shares = 0, dwellSum = 0, dwellCount = 0
      for (const ev of events || []) {
        const uid = (ev as any).user_id as string
        const sid = (ev as any).story_id as string
        if (!keys.has(`${uid}|${sid}`)) continue
        const t = String((ev as any).type)
        if (t === 'view') views++
        else if (t === 'complete') completes++
        else if (t === 'like') likes++
        else if (t === 'share') shares++
        else if (t === 'time_spent') { const v = Number((ev as any).value) || 0; if (v > 0) { dwellSum += v; dwellCount++ } }
      }
      const exposures = agg.exposures
      const dwellAvg = dwellCount ? (dwellSum / dwellCount) : 0
      const metrics = {
        exposures,
        views,
        completes,
        likes,
        shares,
        dwellAvg,
        viewPerExposure: exposures ? views / exposures : 0,
        likePerExposure: exposures ? likes / exposures : 0,
        completionRate: views ? completes / views : 0,
      }
      result[variant] = metrics
    }

    return res.status(200).json({ since, variants: result })
  } catch (error) {
    console.error('Recs metrics error:', error)
    return res.status(500).json({ error: 'Failed to compute metrics' })
  }
}

