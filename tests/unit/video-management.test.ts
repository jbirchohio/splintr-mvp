import { VideoValidationService } from '@/services/video.validation.service';
import { VIDEO_CONSTRAINTS } from '@/types/video.types';

// Mock file for testing
const createMockFile = (options: {
  name?: string;
  size?: number;
  type?: string;
}): File => {
  const file = new File([''], options.name || 'test.mp4', {
    type: options.type || 'video/mp4'
  });
  
  // Mock the size property
  Object.defineProperty(file, 'size', {
    value: options.size || 50 * 1024 * 1024, // 50MB default
    writable: false
  });
  
  return file;
};

describe('VideoValidationService', () => {
  let validationService: VideoValidationService;

  beforeEach(() => {
    validationService = new VideoValidationService();
  });

  describe('validateVideoComprehensive', () => {
    it('should validate a good video file', () => {
      const file = createMockFile({
        name: 'good-video.mp4',
        size: 50 * 1024 * 1024, // 50MB
        type: 'video/mp4'
      });

      const metadata = {
        duration: 20,
        size: file.size,
        originalFilename: file.name
      };

      const result = validationService.validateVideoComprehensive(file, metadata);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.recommendations).toContain('Ensure good lighting and clear audio for best results');
    });

    it('should reject oversized files', () => {
      const file = createMockFile({
        size: VIDEO_CONSTRAINTS.MAX_FILE_SIZE + 1000,
        type: 'video/mp4'
      });

      const result = validationService.validateVideoComprehensive(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FILE_TOO_LARGE');
    });

    it('should reject invalid file types', () => {
      const file = createMockFile({
        type: 'video/mkv'
      });

      const result = validationService.validateVideoComprehensive(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_FILE_TYPE');
    });

    it('should reject videos that are too short', () => {
      const file = createMockFile({ type: 'video/mp4' });
      const metadata = {
        duration: VIDEO_CONSTRAINTS.MIN_DURATION - 1,
        size: file.size,
        originalFilename: file.name
      };

      const result = validationService.validateVideoComprehensive(file, metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DURATION_TOO_SHORT');
    });

    it('should reject videos that are too long', () => {
      const file = createMockFile({ type: 'video/mp4' });
      const metadata = {
        duration: VIDEO_CONSTRAINTS.MAX_DURATION + 1,
        size: file.size,
        originalFilename: file.name
      };

      const result = validationService.validateVideoComprehensive(file, metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DURATION_TOO_LONG');
    });

    it('should warn about large files approaching the limit', () => {
      const file = createMockFile({
        size: VIDEO_CONSTRAINTS.MAX_FILE_SIZE * 0.9, // 90% of limit
        type: 'video/mp4'
      });

      const result = validationService.validateVideoComprehensive(file);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some(w => w.code === 'FILE_SIZE_WARNING')).toBe(true);
    });

    it('should warn about AVI format', () => {
      const file = createMockFile({
        type: 'video/x-msvideo'
      });

      const result = validationService.validateVideoComprehensive(file);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some(w => w.code === 'FORMAT_WARNING')).toBe(true);
    });

    it('should warn about special characters in filename', () => {
      const file = createMockFile({
        name: 'test@#$%.mp4',
        type: 'video/mp4'
      });

      const result = validationService.validateVideoComprehensive(file);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'FILENAME_SPECIAL_CHARS')).toBe(true);
    });
  });

  describe('validateProcessedVideo', () => {
    it('should validate processed video metadata', () => {
      const metadata = {
        duration: 20,
        width: 1920,
        height: 1080,
        bitrate: 5000,
        framerate: 30,
        format: 'mp4'
      };

      const result = validationService.validateProcessedVideo(metadata);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject low resolution videos', () => {
      const metadata = {
        duration: 20,
        width: 320,
        height: 240,
        format: 'mp4'
      };

      const result = validationService.validateProcessedVideo(metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('RESOLUTION_TOO_LOW');
    });

    it('should reject invalid aspect ratios', () => {
      const metadata = {
        duration: 20,
        width: 1920,
        height: 500, // Very wide aspect ratio
        format: 'mp4'
      };

      const result = validationService.validateProcessedVideo(metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_ASPECT_RATIO');
    });

    it('should reject invalid frame rates', () => {
      const metadata = {
        duration: 20,
        width: 1920,
        height: 1080,
        framerate: 5, // Too low
        format: 'mp4'
      };

      const result = validationService.validateProcessedVideo(metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FRAMERATE');
    });
  });

  describe('needsReencoding', () => {
    it('should not require reencoding for optimal videos', () => {
      const metadata = {
        format: 'mp4',
        codec: 'h264',
        bitrate: 3000,
        width: 1280,
        height: 720
      };

      const result = validationService.needsReencoding(metadata);

      expect(result.needsReencoding).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should require reencoding for incompatible formats', () => {
      const metadata = {
        format: 'avi',
        width: 1280,
        height: 720
      };

      const result = validationService.needsReencoding(metadata);

      expect(result.needsReencoding).toBe(true);
      expect(result.reasons).toContain('Format not optimized for web streaming');
    });

    it('should require reencoding for high bitrate videos', () => {
      const metadata = {
        format: 'mp4',
        bitrate: 15000, // Very high bitrate
        width: 1280,
        height: 720
      };

      const result = validationService.needsReencoding(metadata);

      expect(result.needsReencoding).toBe(true);
      expect(result.reasons).toContain('Bitrate too high for efficient streaming');
    });

    it('should require reencoding for oversized videos', () => {
      const metadata = {
        format: 'mp4',
        width: 3840,
        height: 2160 // 4K resolution
      };

      const result = validationService.needsReencoding(metadata);

      expect(result.needsReencoding).toBe(true);
      expect(result.reasons).toContain('Resolution too high for mobile-first platform');
    });
  });

  describe('validateForStoryCreation', () => {
    it('should allow completed and approved videos', () => {
      const videoRecord = {
        processingStatus: 'completed',
        moderationStatus: 'approved',
        duration: 20,
        streamingUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg'
      };

      const result = validationService.validateForStoryCreation(videoRecord);

      expect(result.canUse).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject videos that are not processed', () => {
      const videoRecord = {
        processingStatus: 'pending',
        moderationStatus: 'approved',
        duration: 20,
        streamingUrl: 'https://example.com/video.mp4'
      };

      const result = validationService.validateForStoryCreation(videoRecord);

      expect(result.canUse).toBe(false);
      expect(result.issues).toContain('Video processing is not complete');
    });

    it('should reject videos that are moderation rejected', () => {
      const videoRecord = {
        processingStatus: 'completed',
        moderationStatus: 'rejected',
        duration: 20,
        streamingUrl: 'https://example.com/video.mp4'
      };

      const result = validationService.validateForStoryCreation(videoRecord);

      expect(result.canUse).toBe(false);
      expect(result.issues).toContain('Video was rejected during content moderation');
    });

    it('should warn about flagged videos', () => {
      const videoRecord = {
        processingStatus: 'completed',
        moderationStatus: 'flagged',
        duration: 20,
        streamingUrl: 'https://example.com/video.mp4'
      };

      const result = validationService.validateForStoryCreation(videoRecord);

      expect(result.canUse).toBe(true);
      expect(result.warnings).toContain('Video is flagged and may be removed after review');
    });

    it('should reject videos without streaming URL', () => {
      const videoRecord = {
        processingStatus: 'completed',
        moderationStatus: 'approved',
        duration: 20
      };

      const result = validationService.validateForStoryCreation(videoRecord);

      expect(result.canUse).toBe(false);
      expect(result.issues).toContain('Video streaming URL is not available');
    });

    it('should warn about very short videos', () => {
      const videoRecord = {
        processingStatus: 'completed',
        moderationStatus: 'approved',
        duration: 8, // Very short
        streamingUrl: 'https://example.com/video.mp4'
      };

      const result = validationService.validateForStoryCreation(videoRecord);

      expect(result.canUse).toBe(true);
      expect(result.warnings).toContain('Very short videos may not provide enough time for viewers to make choices');
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should recommend compression for high bitrate videos', () => {
      const metadata = {
        size: 80 * 1024 * 1024, // 80MB
        duration: 20, // 20 seconds = 4MB/s
        width: 1920,
        height: 1080
      };

      const recommendations = validationService.getOptimizationRecommendations(metadata);

      expect(recommendations).toContain('Your video has a high bitrate. Consider reducing quality to improve upload speed');
    });

    it('should recommend resolution reduction for very high resolution', () => {
      const metadata = {
        size: 50 * 1024 * 1024,
        duration: 20,
        width: 3840,
        height: 2160
      };

      const recommendations = validationService.getOptimizationRecommendations(metadata);

      expect(recommendations).toContain('Consider reducing resolution to 1080p for faster processing and smaller file size');
    });

    it('should recommend higher resolution for low quality videos', () => {
      const metadata = {
        size: 10 * 1024 * 1024,
        duration: 20,
        width: 640,
        height: 480
      };

      const recommendations = validationService.getOptimizationRecommendations(metadata);

      expect(recommendations).toContain('Higher resolution video will provide better quality for viewers');
    });

    it('should recommend trimming for long videos', () => {
      const metadata = {
        size: 50 * 1024 * 1024,
        duration: 28 // Close to max
      };

      const recommendations = validationService.getOptimizationRecommendations(metadata);

      expect(recommendations).toContain('Consider trimming to focus on the most engaging parts of your content');
    });

    it('should recommend adding content for short videos', () => {
      const metadata = {
        size: 20 * 1024 * 1024,
        duration: 16 // Short but valid
      };

      const recommendations = validationService.getOptimizationRecommendations(metadata);

      expect(recommendations).toContain('Adding more content could make your story more engaging');
    });
  });
});