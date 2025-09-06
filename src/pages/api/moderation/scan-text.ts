import { NextApiRequest, NextApiResponse } from 'next'
import { moderationService } from '@/services/moderation.service'
import { TextModerationRequest } from '@/types/moderation.types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text, contentId, userId }: TextModerationRequest = req.body

    if (!text || !contentId) {
      return res.status(400).json({ 
        error: 'Missing required fields: text and contentId' 
      })
    }

    if (text.length > 10000) {
      return res.status(400).json({ 
        error: 'Text content too long (max 10,000 characters)' 
      })
    }

    const result = await moderationService.scanText({
      text,
      contentId,
      userId
    })

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Text moderation error:', error)
    res.status(500).json({
      error: 'Failed to scan text content',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}