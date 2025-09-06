import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface CloudinaryWebhookPayload {
  notification_type: string;
  timestamp: number;
  request_id: string;
  public_id: string;
  version: number;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  type: string;
  etag: string;
  url: string;
  secure_url: string;
  signature: string;
  duration?: number;
  bit_rate?: number;
  frame_rate?: number;
  eager?: Array<{
    transformation: string;
    width: number;
    height: number;
    bytes: number;
    format: string;
    url: string;
    secure_url: string;
  }>;
}

/**
 * Verify Cloudinary webhook signature
 */
function verifyWebhookSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) {
    console.error('CLOUDINARY_API_SECRET not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHash('sha1')
    .update(body + timestamp + secret)
    .digest('hex');

  return signature === expectedSignature;
}

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

  try {
    const signature = req.headers['x-cld-signature'] as string;
    const timestamp = req.headers['x-cld-timestamp'] as string;
    const body = JSON.stringify(req.body);

    // Verify webhook signature for security
    if (!verifyWebhookSignature(body, timestamp, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature'
        }
      });
    }

    const payload: CloudinaryWebhookPayload = req.body;

    console.log('Cloudinary webhook received:', {
      type: payload.notification_type,
      publicId: payload.public_id,
      timestamp: payload.timestamp
    });

    // Handle different notification types
    switch (payload.notification_type) {
      case 'upload':
        await handleUploadComplete(payload);
        break;
      case 'eager':
        await handleEagerTransformationComplete(payload);
        break;
      case 'delete':
        await handleVideoDeleted(payload);
        break;
      default:
        console.log('Unhandled notification type:', payload.notification_type);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);

    res.status(500).json({
      error: {
        code: 'WEBHOOK_PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Webhook processing failed',
        timestamp: new Date().toISOString()
      }
    });
  }
}

async function handleUploadComplete(payload: CloudinaryWebhookPayload) {
  console.log('Video upload completed:', payload.public_id);

  try {
    // Find video record by Cloudinary public ID
    const { videoDatabaseService } = await import('@/services/video.database.service');
    const videoRecord = await videoDatabaseService.getVideoByPublicId(payload.public_id);

    if (!videoRecord) {
      console.warn('Video record not found for public ID:', payload.public_id);
      return;
    }

    // Update video record with Cloudinary details
    await videoDatabaseService.updateProcessingStatus(
      videoRecord.id,
      'completed',
      {
        streamingUrl: payload.secure_url,
        thumbnailUrl: videoRecord.thumbnailUrl // Keep existing thumbnail URL
      }
    );

    // Add background jobs for processing and moderation if not already added
    const { JobService } = await import('@/services/job.service');
    
    await Promise.all([
      JobService.addVideoProcessingJob({
        videoId: videoRecord.id,
        publicId: payload.public_id,
        userId: videoRecord.creatorId,
        metadata: {
          originalFilename: videoRecord.originalFilename || payload.public_id
        }
      }),
      JobService.addVideoModerationJob({
        videoId: videoRecord.id,
        publicId: payload.public_id,
        userId: videoRecord.creatorId
      })
    ]);

    console.log('Background jobs added for video:', payload.public_id);

  } catch (error) {
    console.error('Failed to handle upload completion:', error);
  }
}

async function handleEagerTransformationComplete(payload: CloudinaryWebhookPayload) {
  console.log('Eager transformations completed:', payload.public_id);

  try {
    // Find video record by Cloudinary public ID
    const { videoDatabaseService } = await import('@/services/video.database.service');
    const videoRecord = await videoDatabaseService.getVideoByPublicId(payload.public_id);

    if (!videoRecord) {
      console.warn('Video record not found for public ID:', payload.public_id);
      return;
    }

    // Generate thumbnail URL
    const { videoService } = await import('@/services/video.service');
    const thumbnailUrl = videoService.generateThumbnailUrl(payload.public_id);

    // Update video record with generated URLs
    await videoDatabaseService.updateVideoUrls(videoRecord.id, {
      streamingUrl: payload.secure_url,
      thumbnailUrl
    });

    console.log('Video URLs updated for:', payload.public_id);

  } catch (error) {
    console.error('Failed to handle eager transformation completion:', error);
  }
}

async function handleVideoDeleted(payload: CloudinaryWebhookPayload) {
  console.log('Video deleted:', payload.public_id);

  try {
    // Find video record by Cloudinary public ID
    const { videoDatabaseService } = await import('@/services/video.database.service');
    const videoRecord = await videoDatabaseService.getVideoByPublicId(payload.public_id);

    if (!videoRecord) {
      console.warn('Video record not found for public ID:', payload.public_id);
      return;
    }

    // Delete video record from database
    await videoDatabaseService.deleteVideo(videoRecord.id);

    console.log('Video record deleted for:', payload.public_id);

  } catch (error) {
    console.error('Failed to handle video deletion:', error);
  }
}

// Disable body parser to handle raw webhook payload
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};