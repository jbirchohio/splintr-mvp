import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// POST { storyId, amount }
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const userId = (req.headers['x-user-id'] as string) || ''
    const { storyId, amount } = (req.body || {}) as { storyId?: string; amount?: number }
    if (!storyId || typeof amount !== 'number') return res.status(400).json({ error: 'Invalid payload' })

    // Best-effort persistence (scaffolding)
    try {
      if (userId) {
        const supabase = createServerClient()
        await supabase.from('tips').insert({ story_id: storyId, user_id: userId, amount })
      }
    } catch {}

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Tips API error:', error)
    return res.status(200).json({ ok: true })
  }
}

