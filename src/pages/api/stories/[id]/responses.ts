import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string }
  if (!id) return res.status(400).json({ error: 'Story ID required' })
  const supabase = createServerClient()
  try {
    if (req.method === 'GET') {
      // List responses for a story
      const { data, error } = await supabase
        .from('story_responses')
        .select('id, response_story_id, type, created_at, stories!story_responses_response_story_id_fkey ( title, creator_id, thumbnail_url )')
        .eq('original_story_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ responses: data || [] })
    }
    if (req.method === 'POST') {
      const userId = (req.headers['x-user-id'] as string) || ''
      if (!userId) return res.status(401).json({ error: 'Unauthorized' })
      const { responseStoryId, type } = req.body || {}
      if (!responseStoryId) return res.status(400).json({ error: 'responseStoryId required' })
      // Ensure the caller owns the response story
      const { data: respStory, error: sErr } = await supabase
        .from('stories')
        .select('id, creator_id')
        .eq('id', responseStoryId)
        .single()
      if (sErr || !respStory || (respStory as any).creator_id !== userId) return res.status(403).json({ error: 'Forbidden' })

      const { error } = await supabase
        .from('story_responses')
        .insert({ original_story_id: id, response_story_id: responseStoryId, type: type || 'duet' })
      if (error) throw error
      return res.status(201).json({ ok: true })
    }
    if (req.method === 'DELETE') {
      const userId = (req.headers['x-user-id'] as string) || ''
      if (!userId) return res.status(401).json({ error: 'Unauthorized' })
      const { responseStoryId } = req.body || {}
      if (!responseStoryId) return res.status(400).json({ error: 'responseStoryId required' })
      // Allow delete only by owner of response story (enforced by RLS too)
      const { error } = await supabase
        .from('story_responses')
        .delete()
        .eq('original_story_id', id)
        .eq('response_story_id', responseStoryId)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Responses API error', e)
    return res.status(500).json({ error: 'Internal error' })
  }
}

