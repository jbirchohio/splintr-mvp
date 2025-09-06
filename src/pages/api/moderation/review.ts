import { NextApiRequest, NextApiResponse } from 'next'
import { moderationService } from '@/services/moderation.service'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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
    // For now, we'll assume any authenticated user can review content
    // In production, you'd check user.app_metadata.role === 'admin'

    const { flagId, decision, adminNotes } = req.body

    if (!flagId || !decision) {
      return res.status(400).json({ 
        error: 'Missing required fields: flagId and decision' 
      })
    }

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ 
        error: 'Invalid decision. Must be approve or reject' 
      })
    }

    await moderationService.reviewFlaggedContent(flagId, decision, adminNotes)

    res.status(200).json({
      success: true,
      message: `Content ${decision}d successfully`
    })
  } catch (error) {
    console.error('Content review error:', error)
    res.status(500).json({
      error: 'Failed to review content',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}