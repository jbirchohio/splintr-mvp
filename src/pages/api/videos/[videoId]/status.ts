import { NextApiRequest, NextApiResponse } from 'next';
import { videoService } from '@/services/video.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: { 
        code: 'METHOD_NOT_ALLOWED', 
        message: 'Only GET method is allowed' 
      } 
    });
  }

  try {
    const { videoId } = req.query;

    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_VIDEO_ID',
          message: 'Valid video ID is required'
        }
      });
    }

    // Get video processing status and details
    const videoDetails = await videoService.getVideoDetails(videoId);

    res.status(200).json({
      success: true,
      data: videoDetails
    });

  } catch (error) {
    console.error('Video status API error:', error);
    
    // Handle specific Cloudinary errors
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'VIDEO_NOT_FOUND',
          message: 'Video not found'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'STATUS_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Failed to check video status',
        timestamp: new Date().toISOString()
      }
    });
  }
}