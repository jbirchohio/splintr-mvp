import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET -> { notifications: [...], unreadCount }
// PATCH -> mark all read
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = (req.headers['x-user-id'] as string) || ''
  if (!userId) return res.status(200).json({ notifications: [], unreadCount: 0 })

  try {
    const supabase = createServerClient()
    if (req.method === 'GET') {
      const [{ data, error }, { count, error: cntErr }] = await Promise.all([
        supabase
          .from('notifications')
          .select('id, type, data, created_at, is_read')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false)
      ])
      if (error) throw error
      if (cntErr) throw cntErr
      return res.status(200).json({ notifications: data || [], unreadCount: count || 0 })
    }
    if (req.method === 'PATCH') {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Notifications API error:', error)
    if (req.method === 'GET') return res.status(200).json({ notifications: [], unreadCount: 0 })
    return res.status(200).json({ ok: true })
  }
}
