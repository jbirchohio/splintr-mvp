import { NextApiRequest, NextApiResponse } from 'next'
import { moderationService } from '@/services/moderation.service'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if user is admin
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authorization token' })
    }

    // TODO: Implement proper admin role checking
    // For now, we'll assume any authenticated user can access the queue
    // In production, you'd check user.app_metadata.role === 'admin'

    const limit = parseInt(req.query.limit as string) || 50
    const queue = await moderationService.getModerationQueue(limit)

    res.status(200).json({
      success: true,
      data: queue
    })
  } catch (error) {
    console.error('Moderation queue error:', error)
    res.status(500).json({
      error: 'Failed to fetch moderation queue',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}