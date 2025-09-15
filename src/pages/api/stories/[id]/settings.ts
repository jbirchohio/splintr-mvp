import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// PATCH: update story flags: { isPremium?: boolean, tipEnabled?: boolean, scheduledPublishAt?: string|null }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })
  const { id } = req.query as { id?: string }
  if (!id) return res.status(400).json({ error: 'Story ID required' })
  const userId = (req.headers['x-user-id'] as string) || ''
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const { isPremium, tipEnabled, scheduledPublishAt } = req.body || {}
    const supabase = createServerClient()
    // Only allow updates for creator-owned story
    const updates: any = {}
    if (typeof isPremium === 'boolean') updates.is_premium = isPremium
    if (typeof tipEnabled === 'boolean') updates.tip_enabled = tipEnabled
    if (scheduledPublishAt === null) updates.scheduled_publish_at = null
    if (typeof scheduledPublishAt === 'string') updates.scheduled_publish_at = scheduledPublishAt

    const { data: story, error: fetchErr } = await supabase
      .from('stories')
      .select('id, creator_id')
      .eq('id', id)
      .single()
    if (fetchErr || !story || (story as any).creator_id !== userId) return res.status(403).json({ error: 'Forbidden' })

    const { error } = await supabase
      .from('stories')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Update story settings error', e)
    return res.status(500).json({ error: 'Failed to update settings' })
  }
}

