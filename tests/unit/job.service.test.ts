import { JobService } from '@/services/job.service';

// Mock Bull
jest.mock('bull', () => {
  const mockJob = {
    id: 'test-job-id',
    data: {},
    progress: jest.fn(() => 0),
    getState: jest.fn(() => 'completed'),
    timestamp: Date.now(),
    processedOn: Date.now(),
    finishedOn: Date.now(),
    failedReason: null,
  };

  const mockQueue = {
    add: jest.fn(() => Promise.resolve(mockJob)),
    getJob: jest.fn(() => Promise.resolve(mockJob)),
    getWaiting: jest.fn(() => Promise.resolve([])),
    getActive: jest.fn(() => Promise.resolve([])),
    getCompleted: jest.fn(() => Promise.resolve([])),
    getFailed: jest.fn(() => Promise.resolve([])),
    clean: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
    process: jest.fn(),
  };

  return jest.fn(() => mockQueue);
});

// Mock Redis
jest.mock('@/lib/redis', () => ({
  redisClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

// Mock video service
jest.mock('@/services/video.service', () => ({
  videoService: {
    getVideoDetails: jest.fn(() => Promise.resolve({
      videoId: 'test-video',
      publicId: 'test-video',
      streamingUrl: 'https://test.com/video.mp4',
      processingStatus: 'completed',
      duration: 20,
      format: 'mp4',
      bytes: 1024,
    })),
    generateThumbnailUrl: jest.fn(() => 'https://test.com/thumbnail.jpg'),
  },
}));

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
  });

  describe('addVideoProcessingJob', () => {
    it('should add video processing job to queue', async () => {
      const jobData = {
        videoId: 'test-video-id',
        publicId: 'test-public-id',
        userId: 'user123',
        metadata: {
          title: 'Test Video',
          description: 'Test Description',
          originalFilename: 'test.mp4',
        },
      };

      const job = await JobService.addVideoProcessingJob(jobData);

      expect(job).toBeDefined();
      expect(job.id).toBe('test-job-id');
    });
  });

  describe('addVideoModerationJob', () => {
    it('should add video moderation job to queue', async () => {
      const jobData = {
        videoId: 'test-video-id',
        publicId: 'test-public-id',
        userId: 'user123',
      };

      const job = await JobService.addVideoModerationJob(jobData);

      expect(job).toBeDefined();
      expect(job.id).toBe('test-job-id');
    });
  });

  describe('getJobStatus', () => {
    it('should get job status for processing queue', async () => {
      const status = await JobService.getJobStatus('test-job-id', 'processing');

      expect(status).toMatchObject({
        id: 'test-job-id',
        state: 'completed',
      });
    });

    it('should get job status for moderation queue', async () => {
      const status = await JobService.getJobStatus('test-job-id', 'moderation');

      expect(status).toMatchObject({
        id: 'test-job-id',
        state: 'completed',
      });
    });

    it('should return null for non-existent job', async () => {
      // Mock getJob to return null
      const Bull = require('bull');
      const mockQueue = new Bull();
      mockQueue.getJob.mockResolvedValueOnce(null);

      const status = await JobService.getJobStatus('non-existent-job', 'processing');

      expect(status).toBeNull();
    });
  });

  describe('getQueueStats', () => {
    it('should get processing queue statistics', async () => {
      const stats = await JobService.getQueueStats('processing');

      expect(stats).toMatchObject({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      });
    });

    it('should get moderation queue statistics', async () => {
      const stats = await JobService.getQueueStats('moderation');

      expect(stats).toMatchObject({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe('cleanupJobs', () => {
    it('should clean up old jobs from both queues', async () => {
      await JobService.cleanupJobs();

      // Verify that clean was called on both queues
      const Bull = require('bull');
      const mockQueue = new Bull();
      expect(mockQueue.clean).toHaveBeenCalledTimes(4); // 2 calls per queue (completed and failed)
    });
  });
});