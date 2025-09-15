import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { id } = req.query as { id?: string }
  const { storyId } = req.body || {}
  const userId = (req.headers['x-user-id'] as string) || ''
  if (!id || !storyId) return res.status(400).json({ error: 'Missing fields' })
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const supabase = createServerClient()
    // Ensure ownership of story
    const { data: s } = await supabase.from('stories').select('id, creator_id, is_published').eq('id', storyId).single()
    if (!s || (s as any).creator_id !== userId) return res.status(403).json({ error: 'Forbidden' })
    const { error } = await supabase.from('story_challenges').insert({ challenge_id: id, story_id: storyId })
    if (error) throw error
    return res.status(201).json({ ok: true })
  } catch (e) {
    console.error('Join challenge error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
}

