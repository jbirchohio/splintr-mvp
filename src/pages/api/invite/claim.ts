import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { code } = req.body || {}
  if (!code) return res.status(400).json({ error: 'Invite code required' })
  const userId = (req.headers['x-user-id'] as string) || ''
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const supabase = createServerClient()
    const { data: ic } = await supabase.from('invite_codes').select('code, active, max_uses, used_count').eq('code', code).single()
    if (!ic || !(ic as any).active) return res.status(400).json({ error: 'Invalid code' })
    const max = (ic as any).max_uses as number | null
    const used = Number((ic as any).used_count) || 0
    if (max !== null && used >= max) return res.status(400).json({ error: 'Code exhausted' })
    const { data: exists } = await supabase.from('invite_redemptions').select('user_id').eq('user_id', userId).single()
    if (!exists) {
      await supabase.from('invite_redemptions').insert({ user_id: userId, code })
      await supabase.from('invite_codes').update({ used_count: used + 1 }).eq('code', code)
    }
    const maxAge = 90 * 24 * 3600
    res.setHeader('Set-Cookie', `invite_ok=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`)
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Invite claim error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
}

