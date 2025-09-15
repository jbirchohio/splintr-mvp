import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

function isAdmin(req: NextApiRequest): boolean {
  const admins = (process.env.RECS_ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  const userId = (req.headers['x-user-id'] as string) || ''
  return !!userId && admins.includes(userId)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { key, variant } = req.query as { key?: string; variant?: string }
      const supabase = createServerClient()
      let q = supabase.from('recs_config').select('key, variant, data, active, updated_at').order('updated_at', { ascending: false })
      if (key) q = q.eq('key', key)
      if (variant) q = q.eq('variant', variant)
      const { data, error } = await q
      if (error) throw error
      return res.status(200).json({ configs: data || [] })
    }

    if (req.method === 'PUT') {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' })
      const { key, variant, data, active } = req.body || {}
      if (!key || !variant || typeof data !== 'object') return res.status(400).json({ error: 'Invalid payload' })
      const supabase = createServerClient()
      const { error } = await supabase
        .from('recs_config')
        .upsert({ key, variant: String(variant).toUpperCase(), data, active: active ?? true, updated_at: new Date().toISOString() }, { onConflict: 'key,variant' })
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Recs config error:', error)
    return res.status(500).json({ error: 'Internal error' })
  }
}

