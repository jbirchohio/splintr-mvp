import { 
  VideoMetadata, 
  VideoValidationResult, 
  VideoValidationError, 
  VIDEO_CONSTRAINTS,
  AllowedMimeType 
} from '@/types/video.types';

export interface ExtendedVideoValidation extends VideoValidationResult {
  warnings: VideoValidationError[];
  recommendations: string[];
}

export class VideoValidationService {
  /**
   * Comprehensive video validation with warnings and recommendations
   */
  validateVideoComprehensive(file: File, metadata?: VideoMetadata): ExtendedVideoValidation {
    const errors: VideoValidationError[] = [];
    const warnings: VideoValidationError[] = [];
    const recommendations: string[] = [];

    // File size validation
    if (file.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
      errors.push({
        field: 'size',
        message: `File size must be less than ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      });
    } else if (file.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE * 0.8) {
      warnings.push({
        field: 'size',
        message: `File size is close to the limit. Consider compressing your video.`,
        code: 'FILE_SIZE_WARNING'
      });
      recommendations.push('Use video compression to reduce file size while maintaining quality');
    }

    // File type validation
    if (!VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
      errors.push({
        field: 'type',
        message: `File type ${file.type} is not supported. Supported formats: ${VIDEO_CONSTRAINTS.ALLOWED_FORMATS.join(', ')}`,
        code: 'INVALID_FILE_TYPE'
      });
    } else if (file.type === 'video/x-msvideo') {
      warnings.push({
        field: 'type',
        message: 'AVI format may have compatibility issues. MP4 is recommended.',
        code: 'FORMAT_WARNING'
      });
      recommendations.push('Convert to MP4 format for better compatibility and smaller file size');
    }

    // Duration validation
    if (metadata?.duration) {
      if (metadata.duration < VIDEO_CONSTRAINTS.MIN_DURATION) {
        errors.push({
          field: 'duration',
          message: `Video must be at least ${VIDEO_CONSTRAINTS.MIN_DURATION} seconds long`,
          code: 'DURATION_TOO_SHORT'
        });
      } else if (metadata.duration > VIDEO_CONSTRAINTS.MAX_DURATION) {
        errors.push({
          field: 'duration',
          message: `Video must be no longer than ${VIDEO_CONSTRAINTS.MAX_DURATION} seconds`,
          code: 'DURATION_TOO_LONG'
        });
      } else {
        // Duration is valid, provide optimization recommendations
        if (metadata.duration < VIDEO_CONSTRAINTS.MIN_DURATION + 2) {
          recommendations.push('Consider adding a bit more content to make your story more engaging');
        }
        if (metadata.duration > VIDEO_CONSTRAINTS.MAX_DURATION - 2) {
          recommendations.push('Your video is close to the maximum length. Consider trimming for better pacing');
        }
      }
    } else {
      warnings.push({
        field: 'duration',
        message: 'Video duration could not be determined. It will be validated during upload.',
        code: 'DURATION_UNKNOWN'
      });
    }

    // File name validation
    if (file.name.length > 255) {
      warnings.push({
        field: 'filename',
        message: 'File name is very long and may be truncated',
        code: 'FILENAME_TOO_LONG'
      });
    }

    // Check for special characters in filename
    if (!/^[a-zA-Z0-9._\-\s]+$/.test(file.name)) {
      warnings.push({
        field: 'filename',
        message: 'File name contains special characters that may cause issues',
        code: 'FILENAME_SPECIAL_CHARS'
      });
      recommendations.push('Use only letters, numbers, spaces, dots, and hyphens in file names');
    }

    // General recommendations
    if (errors.length === 0) {
      recommendations.push('Ensure good lighting and clear audio for best results');
      recommendations.push('Keep your content engaging throughout the entire duration');
      recommendations.push('Consider your story structure and choice points before uploading');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Validate video metadata from processing
   */
  validateProcessedVideo(metadata: {
    duration: number;
    width: number;
    height: number;
    bitrate?: number;
    framerate?: number;
    format: string;
  }): VideoValidationResult {
    const errors: VideoValidationError[] = [];

    // Duration validation (more precise after processing)
    if (metadata.duration < VIDEO_CONSTRAINTS.MIN_DURATION) {
      errors.push({
        field: 'duration',
        message: `Processed video duration (${metadata.duration}s) is below minimum requirement`,
        code: 'PROCESSED_DURATION_TOO_SHORT'
      });
    }

    if (metadata.duration > VIDEO_CONSTRAINTS.MAX_DURATION) {
      errors.push({
        field: 'duration',
        message: `Processed video duration (${metadata.duration}s) exceeds maximum allowed`,
        code: 'PROCESSED_DURATION_TOO_LONG'
      });
    }

    // Resolution validation
    if (metadata.width < 480 || metadata.height < 480) {
      errors.push({
        field: 'resolution',
        message: 'Video resolution is too low. Minimum 480p required.',
        code: 'RESOLUTION_TOO_LOW'
      });
    }

    // Aspect ratio validation (should be reasonable for mobile viewing)
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      errors.push({
        field: 'aspectRatio',
        message: 'Video aspect ratio is not suitable for mobile viewing',
        code: 'INVALID_ASPECT_RATIO'
      });
    }

    // Frame rate validation
    if (metadata.framerate && (metadata.framerate < 15 || metadata.framerate > 60)) {
      errors.push({
        field: 'framerate',
        message: 'Video frame rate should be between 15-60 fps',
        code: 'INVALID_FRAMERATE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get validation recommendations based on video characteristics
   */
  getOptimizationRecommendations(metadata: {
    size: number;
    duration: number;
    width?: number;
    height?: number;
    bitrate?: number;
  }): string[] {
    const recommendations: string[] = [];

    // Size optimization
    const sizeInMB = metadata.size / (1024 * 1024);
    const durationInSeconds = metadata.duration;
    const mbPerSecond = sizeInMB / durationInSeconds;

    if (mbPerSecond > 3) {
      recommendations.push('Your video has a high bitrate. Consider reducing quality to improve upload speed');
    }

    // Resolution optimization
    if (metadata.width && metadata.height) {
      const totalPixels = metadata.width * metadata.height;
      
      if (totalPixels > 1920 * 1080) {
        recommendations.push('Consider reducing resolution to 1080p for faster processing and smaller file size');
      } else if (totalPixels < 720 * 720) {
        recommendations.push('Higher resolution video will provide better quality for viewers');
      }
    }

    // Duration optimization
    if (metadata.duration > 25) {
      recommendations.push('Consider trimming to focus on the most engaging parts of your content');
    } else if (metadata.duration < 18) {
      recommendations.push('Adding more content could make your story more engaging');
    }

    return recommendations;
  }

  /**
   * Check if video needs re-encoding based on format and quality
   */
  needsReencoding(metadata: {
    format: string;
    codec?: string;
    bitrate?: number;
    width: number;
    height: number;
  }): {
    needsReencoding: boolean;
    reasons: string[];
    recommendedSettings: {
      format: string;
      maxBitrate: number;
      maxResolution: string;
    };
  } {
    const reasons: string[] = [];
    let needsReencoding = false;

    // Check format compatibility
    if (!['mp4', 'webm'].includes(metadata.format.toLowerCase())) {
      needsReencoding = true;
      reasons.push('Format not optimized for web streaming');
    }

    // Check codec compatibility
    if (metadata.codec && !['h264', 'h265', 'vp8', 'vp9'].includes(metadata.codec.toLowerCase())) {
      needsReencoding = true;
      reasons.push('Codec not optimized for web playback');
    }

    // Check bitrate
    const totalPixels = metadata.width * metadata.height;
    const recommendedMaxBitrate = this.getRecommendedBitrate(totalPixels);
    
    if (metadata.bitrate && metadata.bitrate > recommendedMaxBitrate * 1.5) {
      needsReencoding = true;
      reasons.push('Bitrate too high for efficient streaming');
    }

    // Check resolution
    if (metadata.width > 1920 || metadata.height > 1920) {
      needsReencoding = true;
      reasons.push('Resolution too high for mobile-first platform');
    }

    return {
      needsReencoding,
      reasons,
      recommendedSettings: {
        format: 'mp4',
        maxBitrate: recommendedMaxBitrate,
        maxResolution: totalPixels > 1920 * 1080 ? '1080p' : 'original'
      }
    };
  }

  /**
   * Get recommended bitrate based on resolution
   */
  private getRecommendedBitrate(totalPixels: number): number {
    if (totalPixels <= 720 * 480) return 1000; // 1 Mbps for SD
    if (totalPixels <= 1280 * 720) return 2500; // 2.5 Mbps for 720p
    if (totalPixels <= 1920 * 1080) return 5000; // 5 Mbps for 1080p
    return 8000; // 8 Mbps for higher resolutions
  }

  /**
   * Validate video for story creation
   */
  validateForStoryCreation(videoRecord: {
    processingStatus: string;
    moderationStatus: string;
    duration: number;
    streamingUrl?: string;
    thumbnailUrl?: string;
  }): {
    canUse: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check processing status
    if (videoRecord.processingStatus !== 'completed') {
      issues.push('Video processing is not complete');
    }

    // Check moderation status
    if (videoRecord.moderationStatus === 'rejected') {
      issues.push('Video was rejected during content moderation');
    } else if (videoRecord.moderationStatus === 'flagged') {
      warnings.push('Video is flagged and may be removed after review');
    } else if (videoRecord.moderationStatus === 'pending') {
      warnings.push('Video is still under moderation review');
    }

    // Check required URLs
    if (!videoRecord.streamingUrl) {
      issues.push('Video streaming URL is not available');
    }

    if (!videoRecord.thumbnailUrl) {
      warnings.push('Video thumbnail is not available');
    }

    // Check duration for story suitability
    if (videoRecord.duration < 10) {
      warnings.push('Very short videos may not provide enough time for viewers to make choices');
    }

    return {
      canUse: issues.length === 0,
      issues,
      warnings
    };
  }
}

// Export singleton instance
export const videoValidationService = new VideoValidationService();