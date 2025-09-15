import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const userId = (req.headers['x-user-id'] as string) || ''
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const supabase = createServerClient()
    // Check already attributed
    const { data: exists } = await supabase.from('referral_attributions').select('user_id').eq('user_id', userId).single()
    if (exists) return res.status(200).json({ ok: true, already: true })
    // Read cookie
    const cookie = (req.headers['cookie'] || '').split(/;\s*/).find(c => c.startsWith('ref_code='))
    const code = cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
    if (!code) return res.status(200).json({ ok: true, noCode: true })
    // Resolve referrer
    const { data: rc } = await supabase.from('referral_codes').select('code, user_id').eq('code', code).single()
    if (!rc || (rc as any).user_id === userId) return res.status(200).json({ ok: true, invalid: true })
    const referrer = (rc as any).user_id as string
    // Attribute
    await supabase.from('referral_attributions').insert({ user_id: userId, referrer_user_id: referrer, code })
    // Rewards
    await supabase.from('referral_rewards').insert([
      { user_id: referrer, points: 100, reason: 'referral' },
      { user_id: userId, points: 50, reason: 'invited' },
    ])
    // Mark invite_ok cookie for gating flows
    const maxAge = 90 * 24 * 3600
    res.setHeader('Set-Cookie', `invite_ok=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`)
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Referral claim error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
}
