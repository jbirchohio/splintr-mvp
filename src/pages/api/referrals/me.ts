import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req.headers['x-user-id'] as string) || ''
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const supabase = createServerClient()
  try {
    if (req.method === 'GET') {
      const { data: codeRow } = await supabase.from('referral_codes').select('code').eq('user_id', userId).single()
      const code = codeRow?.code || null
      let referred = 0
      if (code) {
        const { count } = await supabase.from('referral_attributions').select('*', { count: 'exact', head: true }).eq('referrer_user_id', userId)
        referred = count || 0
      }
      const { data: rewards } = await supabase.from('referral_rewards').select('points').eq('user_id', userId)
      const points = (rewards || []).reduce((s, r: any) => s + (Number(r.points) || 0), 0)
      const origin = req.headers['x-forwarded-proto'] && req.headers['x-forwarded-host'] ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}` : `${req.headers['origin'] || ''}`
      const link = code ? `${origin}/?ref=${encodeURIComponent(code)}` : null
      return res.status(200).json({ code, link, referred, points })
    }
    if (req.method === 'POST') {
      // Create code if not exists
      const { data: existing } = await supabase.from('referral_codes').select('code').eq('user_id', userId).single()
      if (existing?.code) return res.status(200).json({ code: existing.code })
      let code = makeCode()
      // Ensure uniqueness
      for (let i = 0; i < 5; i++) {
        const { data: dup } = await supabase.from('referral_codes').select('code').eq('code', code).single()
        if (!dup) break
        code = makeCode()
      }
      const { error } = await supabase.from('referral_codes').insert({ code, user_id: userId })
      if (error) throw error
      return res.status(201).json({ code })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Referrals me error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
}

