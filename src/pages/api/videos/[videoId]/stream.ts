import { NextApiRequest, NextApiResponse } from 'next'
import { videoDatabaseService } from '@/services/video.database.service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { videoId } = req.query

    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ error: 'Video ID is required' })
    }

    // Get video record from database
    const video = await videoDatabaseService.getVideoById(videoId)

    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    // Check if video is processed and approved
    if (video.processingStatus !== 'completed') {
      return res.status(400).json({ error: 'Video is not ready for streaming' })
    }

    if (video.moderationStatus === 'rejected') {
      return res.status(403).json({ error: 'Video is not available' })
    }

    // For development, redirect to the Cloudinary URL
    // In production, you might want to implement signed URLs or proxy the stream
    if (video.streamingUrl) {
      return res.redirect(302, video.streamingUrl)
    }

    // Fallback: construct Cloudinary URL if not stored
    const cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${video.cloudinaryPublicId}.mp4`
    
    return res.redirect(302, cloudinaryUrl)

  } catch (error) {
    console.error('Error streaming video:', error)
    return res.status(500).json({ error: 'Failed to stream video' })
  }
}