import { NextApiRequest, NextApiResponse } from 'next';
import { videoDatabaseService } from '@/services/video.database.service';
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
    // TODO: Add authentication middleware to get userId
    const userId = req.headers['user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        }
      });
    }

    // Get all videos that are not completed and approved
    const allVideos = await videoDatabaseService.getVideosByCreator(userId, {
      limit: 100 // Get up to 100 processing videos
    });

    // Filter to only include videos that need attention
    const processingVideos = allVideos.filter(video => 
      video.processingStatus !== 'completed' || 
      video.moderationStatus !== 'approved'
    );

    // Get detailed processing information for each video
    const videosWithDetails = await Promise.all(
      processingVideos.map(async (video) => {
        try {
          const details = await videoService.getVideoProcessingDetails(video.id);
          return {
            videoId: video.id,
            originalFilename: video.originalFilename || 'Unknown',
            duration: video.duration,
            fileSize: video.fileSize,
            createdAt: video.createdAt,
            ...details
          };
        } catch (error) {
          console.error(`Failed to get processing details for video ${video.id}:`, error);
          return {
            videoId: video.id,
            originalFilename: video.originalFilename || 'Unknown',
            duration: video.duration,
            fileSize: video.fileSize,
            createdAt: video.createdAt,
            processingStatus: video.processingStatus,
            moderationStatus: video.moderationStatus,
            canRetry: video.processingStatus === 'failed',
            errorDetails: 'Unable to fetch processing details'
          };
        }
      })
    );

    // Sort by creation date (newest first)
    videosWithDetails.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate summary statistics
    const stats = {
      total: videosWithDetails.length,
      pending: videosWithDetails.filter(v => v.processingStatus === 'pending').length,
      processing: videosWithDetails.filter(v => v.processingStatus === 'processing').length,
      failed: videosWithDetails.filter(v => v.processingStatus === 'failed').length,
      moderationPending: videosWithDetails.filter(v => v.moderationStatus === 'pending').length,
      flagged: videosWithDetails.filter(v => v.moderationStatus === 'flagged').length,
      rejected: videosWithDetails.filter(v => v.moderationStatus === 'rejected').length
    };

    res.status(200).json({
      success: true,
      data: {
        videos: videosWithDetails,
        stats
      }
    });

  } catch (error) {
    console.error('Processing videos API error:', error);

    res.status(500).json({
      error: {
        code: 'PROCESSING_FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch processing videos',
        timestamp: new Date().toISOString()
      }
    });
  }
}