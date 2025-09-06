import { NextApiRequest, NextApiResponse } from 'next';
import { videoService } from '@/services/video.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { videoId } = req.query;

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({
      error: {
        code: 'INVALID_VIDEO_ID',
        message: 'Valid video ID is required'
      }
    });
  }

  switch (req.method) {
    case 'GET':
      return handleGetVideo(req, res, videoId);
    case 'DELETE':
      return handleDeleteVideo(req, res, videoId);
    default:
      return res.status(405).json({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only GET and DELETE methods are allowed'
        }
      });
  }
}

async function handleGetVideo(
  req: NextApiRequest,
  res: NextApiResponse,
  videoId: string
) {
  try {
    // Get video record from database
    const videoRecord = await videoService.getVideoRecord(videoId);

    if (!videoRecord) {
      return res.status(404).json({
        error: {
          code: 'VIDEO_NOT_FOUND',
          message: 'Video not found'
        }
      });
    }

    // TODO: Add authorization check - ensure user can access this video
    // For now, we'll return the video data

    // Get additional details from Cloudinary if needed
    let cloudinaryDetails = null;
    if (videoRecord.cloudinaryPublicId && videoRecord.processingStatus === 'completed') {
      try {
        cloudinaryDetails = await videoService.getVideoDetails(videoRecord.cloudinaryPublicId);
      } catch (error) {
        console.warn('Failed to get Cloudinary details:', error);
        // Continue without Cloudinary details
      }
    }

    // Get moderation status
    const moderationResult = await videoService.checkModerationStatus(videoId);

    res.status(200).json({
      success: true,
      data: {
        ...videoRecord,
        cloudinaryDetails,
        moderationResult,
        // Generate streaming URLs
        streamingUrls: videoRecord.cloudinaryPublicId ? {
          auto: videoService.generateStreamingUrl(videoRecord.cloudinaryPublicId, 'auto'),
          hd: videoService.generateStreamingUrl(videoRecord.cloudinaryPublicId, 'hd'),
          sd: videoService.generateStreamingUrl(videoRecord.cloudinaryPublicId, 'sd')
        } : null
      }
    });

  } catch (error) {
    console.error('Get video API error:', error);

    res.status(500).json({
      error: {
        code: 'VIDEO_FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch video',
        timestamp: new Date().toISOString()
      }
    });
  }
}

async function handleDeleteVideo(
  req: NextApiRequest,
  res: NextApiResponse,
  videoId: string
) {
  try {
    // TODO: Add authentication and authorization checks
    const userId = req.headers['user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        }
      });
    }

    // Get video record to check ownership
    const videoRecord = await videoService.getVideoRecord(videoId);

    if (!videoRecord) {
      return res.status(404).json({
        error: {
          code: 'VIDEO_NOT_FOUND',
          message: 'Video not found'
        }
      });
    }

    // Check if user owns the video
    if (videoRecord.creatorId !== userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this video'
        }
      });
    }

    // Delete from Cloudinary if public ID exists
    if (videoRecord.cloudinaryPublicId) {
      try {
        await videoService.deleteVideo(videoRecord.cloudinaryPublicId);
      } catch (error) {
        console.warn('Failed to delete from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    const { videoDatabaseService } = await import('@/services/video.database.service');
    await videoDatabaseService.deleteVideo(videoId);

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Delete video API error:', error);

    res.status(500).json({
      error: {
        code: 'VIDEO_DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete video',
        timestamp: new Date().toISOString()
      }
    });
  }
}