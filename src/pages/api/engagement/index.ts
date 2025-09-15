import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// POST /api/engagement { contentType, contentId, action, metadata? }
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { contentType, contentId, action, metadata, value } = (req.body || {}) as {
      contentType?: string
      contentId?: string
      action?: string
      metadata?: any
      value?: number
    }
    if (!contentId || !action) {
      return res.status(400).json({ error: 'Missing fields' })
    }
    const userId = (req.headers['x-user-id'] as string) || null

    // Best-effort persistence
    try {
      const supabase = createServerClient()
      // Map action synonyms
      const mappedType = action === 'dwell' ? 'time_spent' : action
      const mappedValue = typeof value === 'number' ? value : (metadata && typeof metadata.value === 'number' ? metadata.value : null)
      await supabase.from('user_interactions').insert({
        user_id: userId,
        story_id: contentId,
        type: mappedType,
        value: mappedValue,
        metadata,
      })
    } catch {}

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Engagement API error:', error)
    return res.status(200).json({ ok: true })
  }
}
