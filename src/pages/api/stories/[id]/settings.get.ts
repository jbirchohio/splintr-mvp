import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET current flags for story (creator must be owner)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { id } = req.query as { id?: string }
  if (!id) return res.status(400).json({ error: 'Story ID required' })
  const userId = (req.headers['x-user-id'] as string) || ''
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('stories')
      .select('id, creator_id, is_premium, tip_enabled, scheduled_publish_at')
      .eq('id', id)
      .single()
    if (error || !data) throw error
    if ((data as any).creator_id !== userId) return res.status(403).json({ error: 'Forbidden' })
    return res.status(200).json({
      isPremium: !!(data as any).is_premium,
      tipEnabled: !!(data as any).tip_enabled,
      scheduledPublishAt: (data as any).scheduled_publish_at || null,
    })
  } catch (e) {
    console.error('Get story settings error', e)
    return res.status(500).json({ error: 'Failed to get settings' })
  }
}

