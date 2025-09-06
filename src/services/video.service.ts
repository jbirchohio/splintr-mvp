import cloudinary, { 
  validateCloudinaryConfig, 
  videoUploadConfig, 
  thumbnailConfig 
} from '@/lib/cloudinary';
import {
  VideoMetadata,
  VideoUploadResult,
  VideoProcessingResult,
  VideoValidationResult,
  VideoValidationError,
  CloudinaryUploadResponse,
  VIDEO_CONSTRAINTS,
  VideoProcessingStatus,
  AllowedMimeType
} from '@/types/video.types';
import { moderationService } from '@/services/moderation.service';
import { videoDatabaseService } from '@/services/video.database.service';
import { ModerationResult } from '@/types/moderation.types';

export class VideoService {
  constructor() {
    if (!validateCloudinaryConfig()) {
      throw new Error('Cloudinary configuration is invalid');
    }
  }

  /**
   * Validate video file before upload
   */
  validateVideo(file: File, metadata?: VideoMetadata): VideoValidationResult {
    const errors: VideoValidationError[] = [];

    // Check file size
    if (file.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
      errors.push({
        field: 'size',
        message: `File size must be less than ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }

    // Check file type
    if (!VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
      errors.push({
        field: 'type',
        message: `File type ${file.type} is not supported`,
        code: 'INVALID_FILE_TYPE'
      });
    }

    // Check duration if provided in metadata
    if (metadata?.duration) {
      if (metadata.duration < VIDEO_CONSTRAINTS.MIN_DURATION) {
        errors.push({
          field: 'duration',
          message: `Video must be at least ${VIDEO_CONSTRAINTS.MIN_DURATION} seconds long`,
          code: 'DURATION_TOO_SHORT'
        });
      }

      if (metadata.duration > VIDEO_CONSTRAINTS.MAX_DURATION) {
        errors.push({
          field: 'duration',
          message: `Video must be no longer than ${VIDEO_CONSTRAINTS.MAX_DURATION} seconds`,
          code: 'DURATION_TOO_LONG'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Upload video to Cloudinary
   */
  async uploadVideo(
    file: File, 
    metadata: VideoMetadata,
    userId: string
  ): Promise<VideoUploadResult> {
    try {
      // Validate video first
      const validation = this.validateVideo(file, metadata);
      if (!validation.isValid) {
        throw new Error(`Video validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Convert file to buffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload configuration with user-specific folder
      const uploadConfig = {
        resource_type: 'video' as const,
        folder: `splintr/videos/${userId}`,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        eager_async: true,
        notification_url: process.env.CLOUDINARY_WEBHOOK_URL,
        context: {
          user_id: userId,
          original_filename: file.name,
          upload_timestamp: new Date().toISOString(),
          ...(metadata.title && { title: metadata.title }),
          ...(metadata.description && { description: metadata.description })
        }
      };

      // Upload to Cloudinary
      const result = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadConfig,
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve({
                ...result,
                folder: result.folder || uploadConfig.folder,
                original_filename: result.original_filename || file.name
              } as CloudinaryUploadResponse);
            } else {
              reject(new Error('Upload failed with no result'));
            }
          }
        ).end(buffer);
      });

      // Create database record
      const videoRecord = await videoDatabaseService.createVideo({
        creatorId: userId,
        metadata,
        cloudinaryPublicId: result.public_id,
        streamingUrl: result.playback_url || result.secure_url,
        thumbnailUrl: this.generateThumbnailUrl(result.public_id)
      });

      const uploadResult = {
        videoId: videoRecord.id,
        publicId: result.public_id,
        uploadUrl: result.secure_url,
        streamingUrl: result.playback_url || result.secure_url,
        thumbnailUrl: this.generateThumbnailUrl(result.public_id),
        processingStatus: 'processing' as VideoProcessingStatus,
        duration: result.duration,
        format: result.format,
        bytes: result.bytes
      };

      // Update processing status to processing
      await videoDatabaseService.updateProcessingStatus(
        videoRecord.id, 
        'processing',
        {
          streamingUrl: uploadResult.streamingUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
          cloudinaryPublicId: result.public_id
        }
      );

      // Trigger moderation scan asynchronously
      this.triggerModerationScan(videoRecord.id, result.public_id, uploadResult.thumbnailUrl)
        .catch(error => {
          console.error('Moderation scan failed:', error);
          // Don't fail the upload if moderation fails
        });

      return uploadResult;

    } catch (error) {
      console.error('Video upload failed:', error);
      throw new Error(`Video upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get video processing status and details
   */
  async getVideoDetails(publicId: string): Promise<VideoProcessingResult> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: 'video'
      });

      return {
        videoId: result.public_id,
        publicId: result.public_id,
        streamingUrl: result.secure_url,
        thumbnailUrl: this.generateThumbnailUrl(result.public_id),
        processingStatus: 'completed' as VideoProcessingStatus,
        duration: result.duration,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height
      };

    } catch (error) {
      console.error('Failed to get video details:', error);
      throw new Error(`Failed to get video details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate thumbnail URL for a video
   */
  generateThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      ...thumbnailConfig,
      resource_type: 'video'
    });
  }

  /**
   * Generate streaming URL with specific quality
   */
  generateStreamingUrl(publicId: string, quality: 'auto' | 'hd' | 'sd' = 'auto'): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      streaming_profile: quality === 'hd' ? 'hd' : 'sd',
      format: 'auto'
    });
  }

  /**
   * Delete video from Cloudinary
   */
  async deleteVideo(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video'
      });
    } catch (error) {
      console.error('Failed to delete video:', error);
      throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get video upload signature for client-side uploads
   */
  generateUploadSignature(userId: string): {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  } {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = `splintr/videos/${userId}`;
    
    const params = {
      timestamp,
      folder,
      resource_type: 'video',
      use_filename: false,
      unique_filename: true,
      overwrite: false
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET!
    );

    return {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      folder
    };
  }

  /**
   * Trigger moderation scan for uploaded video
   */
  private async triggerModerationScan(videoId: string, publicId: string, thumbnailUrl: string): Promise<ModerationResult> {
    try {
      const moderationResult = await moderationService.scanVideo({
        videoUrl: cloudinary.url(publicId, { resource_type: 'video' }),
        contentId: videoId,
        thumbnailUrl
      });

      // Update database with moderation result
      await videoDatabaseService.updateModerationStatus(
        videoId,
        moderationResult.status === 'approved' ? 'approved' : 
        moderationResult.status === 'rejected' ? 'rejected' : 'flagged',
        moderationResult
      );

      // If content is rejected, we could mark it as hidden or delete it
      if (moderationResult.status === 'rejected') {
        console.warn(`Video ${videoId} was rejected by moderation:`, moderationResult.categories);
        // Content is already marked as rejected in database
      }

      return moderationResult;
    } catch (error) {
      console.error('Video moderation scan failed:', error);
      // Update database to indicate moderation failed
      await videoDatabaseService.updateModerationStatus(videoId, 'pending');
      throw error;
    }
  }

  /**
   * Check if video passes moderation
   */
  async checkModerationStatus(videoId: string): Promise<ModerationResult | null> {
    try {
      const videoRecord = await videoDatabaseService.getVideoById(videoId);
      return videoRecord?.moderationResult || null;
    } catch (error) {
      console.error('Failed to check moderation status:', error);
      return null;
    }
  }

  /**
   * Get video record from database
   */
  async getVideoRecord(videoId: string) {
    return await videoDatabaseService.getVideoById(videoId);
  }

  /**
   * Get videos by creator
   */
  async getCreatorVideos(
    creatorId: string,
    options: {
      limit?: number;
      offset?: number;
      processingStatus?: VideoProcessingStatus;
      moderationStatus?: 'pending' | 'approved' | 'flagged' | 'rejected';
    } = {}
  ) {
    return await videoDatabaseService.getVideosByCreator(creatorId, options);
  }

  /**
   * Get detailed processing status for a video
   */
  async getVideoProcessingDetails(videoId: string): Promise<{
    processingStatus: VideoProcessingStatus;
    moderationStatus: 'pending' | 'approved' | 'flagged' | 'rejected';
    processingProgress?: number;
    errorDetails?: string;
    canRetry: boolean;
    estimatedCompletion?: Date;
  }> {
    const videoRecord = await videoDatabaseService.getVideoById(videoId);
    
    if (!videoRecord) {
      throw new Error('Video not found');
    }

    const canRetry = videoRecord.processingStatus === 'failed';
    let processingProgress: number | undefined;
    let estimatedCompletion: Date | undefined;

    // Calculate processing progress based on status
    switch (videoRecord.processingStatus) {
      case 'pending':
        processingProgress = 0;
        estimatedCompletion = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        break;
      case 'processing':
        processingProgress = 50;
        estimatedCompletion = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
        break;
      case 'completed':
        processingProgress = 100;
        break;
      case 'failed':
        processingProgress = 0;
        break;
    }

    return {
      processingStatus: videoRecord.processingStatus,
      moderationStatus: videoRecord.moderationStatus,
      processingProgress,
      errorDetails: videoRecord.processingStatus === 'failed' ? 'Processing failed due to invalid video format or corruption' : undefined,
      canRetry,
      estimatedCompletion
    };
  }

  /**
   * Batch update video processing status
   */
  async batchUpdateProcessingStatus(
    updates: Array<{
      videoId: string;
      status: VideoProcessingStatus;
      additionalData?: {
        streamingUrl?: string;
        thumbnailUrl?: string;
        cloudinaryPublicId?: string;
      };
    }>
  ): Promise<void> {
    const promises = updates.map(update => 
      videoDatabaseService.updateProcessingStatus(
        update.videoId,
        update.status,
        update.additionalData
      )
    );

    await Promise.all(promises);
  }

  /**
   * Update video processing completion
   */
  async completeVideoProcessing(videoId: string, processingResult: VideoProcessingResult): Promise<void> {
    try {
      await videoDatabaseService.updateProcessingStatus(
        videoId,
        'completed',
        {
          streamingUrl: processingResult.streamingUrl,
          thumbnailUrl: processingResult.thumbnailUrl
        }
      );
    } catch (error) {
      console.error('Failed to update video processing completion:', error);
      throw error;
    }
  }

  /**
   * Mark video processing as failed
   */
  async failVideoProcessing(videoId: string, error: string): Promise<void> {
    try {
      await videoDatabaseService.updateProcessingStatus(videoId, 'failed');
      console.error(`Video processing failed for ${videoId}:`, error);
    } catch (dbError) {
      console.error('Failed to update video processing failure:', dbError);
      throw dbError;
    }
  }

  /**
   * Get creator video statistics
   */
  async getCreatorVideoStats(creatorId: string) {
    return await videoDatabaseService.getCreatorVideoStats(creatorId);
  }
}

// Export singleton instance
export const videoService = new VideoService();