import { NextApiRequest, NextApiResponse } from 'next';
import { videoService } from '@/services/video.service';
import { VideoProcessingStatus } from '@/types/video.types';

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
    // TODO: Add authentication middleware to get userId
    // For now, using a placeholder
    const userId = req.headers['user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        }
      });
    }

    // Parse query parameters
    const {
      limit = '10',
      offset = '0',
      processingStatus,
      moderationStatus
    } = req.query;

    const parsedLimit = parseInt(limit as string, 10);
    const parsedOffset = parseInt(offset as string, 10);

    if (isNaN(parsedLimit) || isNaN(parsedOffset) || parsedLimit < 1 || parsedOffset < 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Invalid limit or offset parameters'
        }
      });
    }

    // Validate processing status if provided
    if (processingStatus && !['pending', 'processing', 'completed', 'failed'].includes(processingStatus as string)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PROCESSING_STATUS',
          message: 'Invalid processing status. Must be one of: pending, processing, completed, failed'
        }
      });
    }

    // Validate moderation status if provided
    if (moderationStatus && !['pending', 'approved', 'flagged', 'rejected'].includes(moderationStatus as string)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MODERATION_STATUS',
          message: 'Invalid moderation status. Must be one of: pending, approved, flagged, rejected'
        }
      });
    }

    // Get videos for the creator
    const videos = await videoService.getCreatorVideos(userId, {
      limit: parsedLimit,
      offset: parsedOffset,
      processingStatus: processingStatus as VideoProcessingStatus,
      moderationStatus: moderationStatus as 'pending' | 'approved' | 'flagged' | 'rejected'
    });

    // Get creator video statistics
    const stats = await videoService.getCreatorVideoStats(userId);

    res.status(200).json({
      success: true,
      data: {
        videos,
        stats,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: videos.length === parsedLimit
        }
      }
    });

  } catch (error) {
    console.error('Video library API error:', error);

    res.status(500).json({
      error: {
        code: 'LIBRARY_FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch video library',
        timestamp: new Date().toISOString()
      }
    });
  }
}