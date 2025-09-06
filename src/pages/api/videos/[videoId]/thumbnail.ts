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

    // Return thumbnail URL or redirect to it
    if (video.thumbnailUrl) {
      return res.redirect(302, video.thumbnailUrl)
    }

    // Fallback: construct Cloudinary thumbnail URL if not stored
    const thumbnailUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/so_0,w_400,h_300,c_fill/${video.cloudinaryPublicId}.jpg`
    
    return res.redirect(302, thumbnailUrl)

  } catch (error) {
    console.error('Error getting video thumbnail:', error)
    return res.status(500).json({ error: 'Failed to get video thumbnail' })
  }
}