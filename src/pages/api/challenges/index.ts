import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerClient()
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, slug, title, description, hashtag, active, start_at, end_at')
        .eq('active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      // Counts
      const ids = (data || []).map((c: any) => c.id)
      let counts: Record<string, number> = {}
      if (ids.length) {
        const { data: sc } = await supabase
          .from('story_challenges')
          .select('challenge_id')
          .in('challenge_id', ids)
        for (const r of sc || []) counts[(r as any).challenge_id] = (counts[(r as any).challenge_id] || 0) + 1
      }
      return res.status(200).json({ challenges: (data || []).map((c: any) => ({ ...c, count: counts[c.id] || 0 })) })
    }
    if (req.method === 'POST') {
      // Admin-only create (check role via header set by middleware or service usage)
      const userId = (req.headers['x-user-id'] as string) || ''
      if (!userId) return res.status(401).json({ error: 'Unauthorized' })
      const { data: u } = await supabase.auth.getUser()
      const role = (u as any)?.data?.user?.app_metadata?.role
      if (role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
      const { title, description, hashtag, startAt, endAt } = req.body || {}
      if (!title) return res.status(400).json({ error: 'Title required' })
      const slug = slugify(title)
      const { error } = await supabase.from('challenges').insert({ title, description, hashtag, slug, start_at: startAt || null, end_at: endAt || null })
      if (error) throw error
      return res.status(201).json({ ok: true })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Challenges API error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
}

