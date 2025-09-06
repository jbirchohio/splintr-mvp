import { videoService } from '@/services/video.service';
import { VideoMetadata, VIDEO_CONSTRAINTS } from '@/types/video.types';

// Mock Cloudinary
jest.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
    api: {
      resource: jest.fn(),
    },
    url: jest.fn(),
    utils: {
      api_sign_request: jest.fn(),
    },
  },
  validateCloudinaryConfig: jest.fn(() => true),
  videoUploadConfig: {},
  thumbnailConfig: {},
}));

// Mock job service
jest.mock('@/services/job.service', () => ({
  JobService: {
    addVideoProcessingJob: jest.fn(),
    addVideoModerationJob: jest.fn(),
  },
}));

// Mock video database service
jest.mock('@/services/video.database.service', () => ({
  videoDatabaseService: {
    createVideo: jest.fn(),
    getVideoById: jest.fn(),
    updateProcessingStatus: jest.fn(),
    updateModerationStatus: jest.fn(),
  },
}));

// Mock moderation service
jest.mock('@/services/moderation.service', () => ({
  moderationService: {
    scanVideo: jest.fn(),
  },
}));

describe('VideoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables for tests
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
  });

  describe('validateVideo', () => {
    it('should validate a correct video file', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const metadata: VideoMetadata = {
        duration: 20,
        size: 50 * 1024 * 1024, // 50MB
      };

      const result = videoService.validateVideo(file, metadata);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject video with invalid duration - too short', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const metadata: VideoMetadata = {
        duration: 10, // Too short
        size: 50 * 1024 * 1024,
      };

      const result = videoService.validateVideo(file, metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'duration',
          code: 'DURATION_TOO_SHORT',
        })
      );
    });

    it('should reject video with invalid duration - too long', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const metadata: VideoMetadata = {
        duration: 35, // Too long
        size: 50 * 1024 * 1024,
      };

      const result = videoService.validateVideo(file, metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'duration',
          code: 'DURATION_TOO_LONG',
        })
      );
    });

    it('should reject video with invalid file size', () => {
      // Create a file with large size
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', {
        value: 150 * 1024 * 1024, // 150MB - too large
        writable: false
      });

      const metadata: VideoMetadata = {
        duration: 20,
        size: 150 * 1024 * 1024, // Too large
      };

      const result = videoService.validateVideo(file, metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'size',
          code: 'FILE_TOO_LARGE',
        })
      );
    });

    it('should reject video with invalid file type', () => {
      const file = new File(['test'], 'test.avi', { type: 'video/avi' });
      const metadata: VideoMetadata = {
        duration: 20,
        size: 50 * 1024 * 1024,
      };

      const result = videoService.validateVideo(file, metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'type',
          code: 'INVALID_FILE_TYPE',
        })
      );
    });

    it('should validate video with all supported mime types', () => {
      const supportedTypes = VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES;
      
      supportedTypes.forEach(mimeType => {
        const file = new File(['test'], 'test.mp4', { type: mimeType });
        const metadata: VideoMetadata = {
          duration: 20,
          size: 50 * 1024 * 1024,
        };

        const result = videoService.validateVideo(file, metadata);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle validation without metadata duration', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const metadata: VideoMetadata = {
        duration: 0, // No duration provided
        size: 50 * 1024 * 1024,
      };

      const result = videoService.validateVideo(file, metadata);
      
      // Should not have duration errors when duration is not provided
      const durationErrors = result.errors.filter(e => e.field === 'duration');
      expect(durationErrors).toHaveLength(0);
    });
  });

  describe('uploadVideo', () => {
    it('should upload video successfully', async () => {
      // Mock database service
      const mockCreateVideo = jest.fn().mockResolvedValue({
        id: 'db-video-id',
        creatorId: 'user123',
        cloudinaryPublicId: 'test-video-id',
        processingStatus: 'pending'
      });
      const mockUpdateProcessingStatus = jest.fn().mockResolvedValue({});
      const mockUpdateModerationStatus = jest.fn().mockResolvedValue({});
      
      require('@/services/video.database.service').videoDatabaseService.createVideo = mockCreateVideo;
      require('@/services/video.database.service').videoDatabaseService.updateProcessingStatus = mockUpdateProcessingStatus;
      require('@/services/video.database.service').videoDatabaseService.updateModerationStatus = mockUpdateModerationStatus;

      // Mock moderation service
      const mockScanVideo = jest.fn().mockResolvedValue({
        status: 'approved',
        confidence: 0.95,
        categories: [],
        reviewRequired: false
      });
      require('@/services/moderation.service').moderationService.scanVideo = mockScanVideo;

      // Mock thumbnail URL generation
      const mockUrl = jest.fn(() => 'https://res.cloudinary.com/test/video/upload/test-video.jpg');
      require('@/lib/cloudinary').default.url = mockUrl;

      const mockUploadStream = jest.fn().mockImplementation((config, callback) => {
        const mockResult = {
          public_id: 'test-video-id',
          secure_url: 'https://res.cloudinary.com/test/video/upload/test-video.mp4',
          duration: 20,
          format: 'mp4',
          bytes: 50 * 1024 * 1024,
          folder: 'splintr/videos/user123',
          original_filename: 'test.mp4'
        };
        
        setTimeout(() => callback(null, mockResult), 0);
        
        return {
          end: jest.fn()
        };
      });

      require('@/lib/cloudinary').default.uploader.upload_stream = mockUploadStream;

      // Create a proper File mock with arrayBuffer method
      const fileContent = new Uint8Array([1, 2, 3, 4]);
      const file = new File([fileContent], 'test.mp4', { type: 'video/mp4' });
      
      // Mock arrayBuffer method
      file.arrayBuffer = jest.fn().mockResolvedValue(fileContent.buffer);

      const metadata: VideoMetadata = {
        duration: 20,
        size: 50 * 1024 * 1024,
        title: 'Test Video',
        description: 'Test Description'
      };

      const result = await videoService.uploadVideo(file, metadata, 'user123');

      expect(result).toMatchObject({
        videoId: 'db-video-id',
        publicId: 'test-video-id',
        uploadUrl: 'https://res.cloudinary.com/test/video/upload/test-video.mp4',
        processingStatus: 'processing',
        duration: 20,
        format: 'mp4',
        bytes: 50 * 1024 * 1024
      });

      expect(mockCreateVideo).toHaveBeenCalledWith({
        creatorId: 'user123',
        metadata,
        cloudinaryPublicId: 'test-video-id',
        streamingUrl: 'https://res.cloudinary.com/test/video/upload/test-video.mp4',
        thumbnailUrl: 'https://res.cloudinary.com/test/video/upload/test-video.jpg'
      });

      expect(mockUpdateProcessingStatus).toHaveBeenCalledWith(
        'db-video-id',
        'processing',
        expect.any(Object)
      );
    });

    it('should reject invalid video during upload', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const metadata: VideoMetadata = {
        duration: 10, // Too short
        size: 50 * 1024 * 1024,
      };

      await expect(videoService.uploadVideo(file, metadata, 'user123'))
        .rejects.toThrow('Video validation failed');
    });
  });

  describe('getVideoDetails', () => {
    it('should get video details from Cloudinary', async () => {
      const mockResource = jest.fn().mockResolvedValue({
        public_id: 'test-video-id',
        secure_url: 'https://res.cloudinary.com/test/video/upload/test-video.mp4',
        duration: 20,
        format: 'mp4',
        bytes: 50 * 1024 * 1024,
        width: 1920,
        height: 1080
      });

      require('@/lib/cloudinary').default.api.resource = mockResource;

      const result = await videoService.getVideoDetails('test-video-id');

      expect(mockResource).toHaveBeenCalledWith('test-video-id', {
        resource_type: 'video'
      });

      expect(result).toMatchObject({
        videoId: 'test-video-id',
        publicId: 'test-video-id',
        streamingUrl: 'https://res.cloudinary.com/test/video/upload/test-video.mp4',
        processingStatus: 'completed',
        duration: 20,
        format: 'mp4',
        bytes: 50 * 1024 * 1024,
        width: 1920,
        height: 1080
      });
    });
  });

  describe('generateThumbnailUrl', () => {
    it('should generate thumbnail URL for video', () => {
      const mockUrl = jest.fn(() => 'https://res.cloudinary.com/test/video/upload/test-video.jpg');
      require('@/lib/cloudinary').default.url = mockUrl;

      const result = videoService.generateThumbnailUrl('test-video');

      expect(mockUrl).toHaveBeenCalledWith('test-video', expect.objectContaining({
        resource_type: 'video',
      }));
      expect(result).toBe('https://res.cloudinary.com/test/video/upload/test-video.jpg');
    });
  });

  describe('generateStreamingUrl', () => {
    it('should generate streaming URL with default quality', () => {
      const mockUrl = jest.fn(() => 'https://res.cloudinary.com/test/video/upload/test-video.mp4');
      require('@/lib/cloudinary').default.url = mockUrl;

      const result = videoService.generateStreamingUrl('test-video');

      expect(mockUrl).toHaveBeenCalledWith('test-video', expect.objectContaining({
        resource_type: 'video',
        streaming_profile: 'sd',
        format: 'auto'
      }));
    });

    it('should generate HD streaming URL', () => {
      const mockUrl = jest.fn(() => 'https://res.cloudinary.com/test/video/upload/test-video.mp4');
      require('@/lib/cloudinary').default.url = mockUrl;

      const result = videoService.generateStreamingUrl('test-video', 'hd');

      expect(mockUrl).toHaveBeenCalledWith('test-video', expect.objectContaining({
        resource_type: 'video',
        streaming_profile: 'hd',
        format: 'auto'
      }));
    });
  });

  describe('generateUploadSignature', () => {
    it('should generate upload signature with user folder', () => {
      const mockApiSignRequest = jest.fn(() => 'test-signature');
      require('@/lib/cloudinary').default.utils.api_sign_request = mockApiSignRequest;

      const result = videoService.generateUploadSignature('user123');

      expect(result).toMatchObject({
        signature: 'test-signature',
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        folder: 'splintr/videos/user123',
      });
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('deleteVideo', () => {
    it('should delete video from Cloudinary', async () => {
      const mockDestroy = jest.fn().mockResolvedValue({ result: 'ok' });
      require('@/lib/cloudinary').default.uploader.destroy = mockDestroy;

      await videoService.deleteVideo('test-video-id');

      expect(mockDestroy).toHaveBeenCalledWith('test-video-id', {
        resource_type: 'video'
      });
    });
  });
});

describe('Video Constants', () => {
  it('should have correct video constraints', () => {
    expect(VIDEO_CONSTRAINTS.MIN_DURATION).toBe(15);
    expect(VIDEO_CONSTRAINTS.MAX_DURATION).toBe(30);
    expect(VIDEO_CONSTRAINTS.MAX_FILE_SIZE).toBe(100 * 1024 * 1024);
    expect(VIDEO_CONSTRAINTS.ALLOWED_FORMATS).toContain('mp4');
    expect(VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES).toContain('video/mp4');
  });
});