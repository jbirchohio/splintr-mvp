import { NextApiRequest, NextApiResponse } from 'next'
import { moderationService } from '@/services/moderation.service'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user from auth token
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authorization token' })
    }

    const { contentId, contentType, reason } = req.body

    if (!contentId || !contentType || !reason) {
      return res.status(400).json({ 
        error: 'Missing required fields: contentId, contentType, and reason' 
      })
    }

    if (!['story', 'video', 'comment'].includes(contentType)) {
      return res.status(400).json({ 
        error: 'Invalid contentType. Must be story, video, or comment' 
      })
    }

    if (reason.length > 100) {
      return res.status(400).json({ 
        error: 'Reason too long (max 100 characters)' 
      })
    }

    const flag = await moderationService.flagContent(
      contentId,
      contentType,
      reason,
      user.id
    )

    res.status(201).json({
      success: true,
      data: flag
    })
  } catch (error) {
    console.error('Content flagging error:', error)
    res.status(500).json({
      error: 'Failed to flag content',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}