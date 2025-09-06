import { NextApiRequest, NextApiResponse } from 'next';
import { videoService } from '@/services/video.service';
import { videoDatabaseService } from '@/services/video.database.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is allowed'
      }
    });
  }

  const { videoId } = req.query;

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({
      error: {
        code: 'INVALID_VIDEO_ID',
        message: 'Valid video ID is required'
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

    // Get video record to check ownership and status
    const videoRecord = await videoDatabaseService.getVideoById(videoId);

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
          message: 'You do not have permission to retry processing for this video'
        }
      });
    }

    // Check if video is in a state that can be retried
    if (videoRecord.processingStatus !== 'failed') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Only failed videos can be retried'
        }
      });
    }

    // Reset processing status to pending
    await videoDatabaseService.updateProcessingStatus(videoId, 'pending');

    // Reset moderation status if it was also failed
    if (videoRecord.moderationStatus === 'rejected') {
      await videoDatabaseService.updateModerationStatus(videoId, 'pending');
    }

    // If we have a Cloudinary public ID, try to get video details and restart processing
    if (videoRecord.cloudinaryPublicId) {
      try {
        // Check if video still exists in Cloudinary
        const videoDetails = await videoService.getVideoDetails(videoRecord.cloudinaryPublicId);
        
        // Update processing status to processing
        await videoDatabaseService.updateProcessingStatus(
          videoId, 
          'processing',
          {
            streamingUrl: videoDetails.streamingUrl,
            thumbnailUrl: videoDetails.thumbnailUrl
          }
        );

        // Trigger moderation scan again
        const moderationResult = await videoService.checkModerationStatus(videoId);
        
        // Mark as completed if everything is successful
        await videoDatabaseService.updateProcessingStatus(videoId, 'completed');
        
        if (!moderationResult) {
          // Trigger new moderation scan
          // This would typically be done in a background job
          console.log(`Triggering moderation scan for video ${videoId}`);
        }

      } catch (cloudinaryError) {
        console.error('Cloudinary processing retry failed:', cloudinaryError);
        
        // Mark as failed again with error details
        await videoDatabaseService.updateProcessingStatus(videoId, 'failed');
        
        return res.status(500).json({
          error: {
            code: 'RETRY_FAILED',
            message: 'Failed to retry video processing. The video may no longer exist in storage.',
            details: {
              cloudinaryError: cloudinaryError instanceof Error ? cloudinaryError.message : 'Unknown error'
            }
          }
        });
      }
    } else {
      // No Cloudinary public ID - video needs to be re-uploaded
      return res.status(400).json({
        error: {
          code: 'REUPLOAD_REQUIRED',
          message: 'This video needs to be uploaded again as the original file is no longer available'
        }
      });
    }

    // Get updated video record
    const updatedVideo = await videoDatabaseService.getVideoById(videoId);

    res.status(200).json({
      success: true,
      message: 'Video processing retry initiated successfully',
      data: {
        video: updatedVideo
      }
    });

  } catch (error) {
    console.error('Video retry API error:', error);

    // Try to mark video as failed again
    try {
      await videoDatabaseService.updateProcessingStatus(videoId, 'failed');
    } catch (updateError) {
      console.error('Failed to update video status after retry error:', updateError);
    }

    res.status(500).json({
      error: {
        code: 'RETRY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retry video processing',
        timestamp: new Date().toISOString()
      }
    });
  }
}