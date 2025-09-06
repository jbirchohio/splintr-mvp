import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { contentId } = req.query
    const contentType = req.query.type as string

    if (!contentId || !contentType) {
      return res.status(400).json({ 
        error: 'Missing required parameters: contentId and type' 
      })
    }

    if (!['story', 'video', 'comment'].includes(contentType)) {
      return res.status(400).json({ 
        error: 'Invalid content type. Must be story, video, or comment' 
      })
    }

    // For videos, check the videos table for moderation results
    if (contentType === 'video') {
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('moderation_result, moderation_status')
        .eq('id', contentId as string)
        .single()

      if (videoError) {
        throw new Error(`Database query failed: ${videoError.message}`)
      }

      if (!videoData || !videoData.moderation_result) {
        return res.status(200).json({
          success: true,
          data: null
        })
      }

      const moderationResult = videoData.moderation_result as any
      
      res.status(200).json({
        success: true,
        data: {
          contentId: contentId,
          contentType: 'video',
          status: videoData.moderation_status,
          confidence: moderationResult.confidence || 0,
          categories: moderationResult.categories || [],
          reviewRequired: moderationResult.reviewRequired || false,
          scanTimestamp: moderationResult.scanTimestamp,
          provider: moderationResult.provider || 'unknown'
        }
      })
    } else {
      // For other content types, return null for now
      return res.status(200).json({
        success: true,
        data: null
      })
    }
  } catch (error) {
    console.error('Moderation status check error:', error)
    res.status(500).json({
      error: 'Failed to check moderation status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}