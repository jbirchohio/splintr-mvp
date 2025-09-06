import { NextApiRequest, NextApiResponse } from 'next'
import { moderationService } from '@/services/moderation.service'
import { VideoModerationRequest } from '@/types/moderation.types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { videoUrl, contentId, userId, thumbnailUrl }: VideoModerationRequest = req.body

    if (!videoUrl || !contentId) {
      return res.status(400).json({ 
        error: 'Missing required fields: videoUrl and contentId' 
      })
    }

    const result = await moderationService.scanVideo({
      videoUrl,
      contentId,
      userId,
      thumbnailUrl
    })

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Video moderation error:', error)
    res.status(500).json({
      error: 'Failed to scan video content',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}