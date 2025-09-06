import Bull from 'bull';
import { videoService } from './video.service';
import { videoDatabaseService } from './video.database.service';
import { getRedisClient } from '@/lib/redis';

// Job types
export interface VideoProcessingJob {
  videoId: string;
  publicId: string;
  userId: string;
  metadata: {
    title?: string;
    description?: string;
    originalFilename: string;
  };
}

export interface VideoModerationJob {
  videoId: string;
  publicId: string;
  userId: string;
}

// Create job queues
export const videoProcessingQueue = new Bull<VideoProcessingJob>('video processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const videoModerationQueue = new Bull<VideoModerationJob>('video moderation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Job processors
videoProcessingQueue.process('process-video', async (job) => {
  const { videoId, publicId, userId, metadata } = job.data;
  
  console.log(`Processing video: ${videoId} for user: ${userId}`);
  
  try {
    // Update job progress
    await job.progress(10);
    
    // Get video record from database
    const videoRecord = await videoDatabaseService.getVideoById(videoId);
    if (!videoRecord) {
      throw new Error(`Video record not found: ${videoId}`);
    }

    // Update processing status to processing
    await videoDatabaseService.updateProcessingStatus(videoId, 'processing');
    await job.progress(30);
    
    // Get video details from Cloudinary
    const videoDetails = await videoService.getVideoDetails(publicId);
    await job.progress(60);
    
    // Generate thumbnail
    const thumbnailUrl = videoService.generateThumbnailUrl(publicId);
    await job.progress(80);
    
    // Update database with processing results
    await videoService.completeVideoProcessing(videoId, {
      ...videoDetails,
      thumbnailUrl
    });
    
    console.log('Video processing completed:', videoDetails);
    await job.progress(100);
    
    return {
      videoId,
      status: 'completed',
      videoDetails,
      thumbnailUrl
    };
    
  } catch (error) {
    console.error('Video processing failed:', error);
    
    // Mark processing as failed in database
    try {
      await videoService.failVideoProcessing(videoId, error instanceof Error ? error.message : 'Unknown error');
    } catch (dbError) {
      console.error('Failed to update processing failure status:', dbError);
    }
    
    throw error;
  }
});

videoModerationQueue.process('moderate-video', async (job) => {
  const { videoId, publicId, userId } = job.data;
  
  console.log(`Moderating video: ${videoId} for user: ${userId}`);
  
  try {
    await job.progress(10);
    
    // Get video record from database
    const videoRecord = await videoDatabaseService.getVideoById(videoId);
    if (!videoRecord) {
      throw new Error(`Video record not found: ${videoId}`);
    }

    // Get video URL for moderation
    const videoUrl = videoRecord.streamingUrl || `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${publicId}`;
    const thumbnailUrl = videoRecord.thumbnailUrl || videoService.generateThumbnailUrl(publicId);
    
    await job.progress(30);
    
    // Perform moderation scan using the moderation service
    const { moderationService } = await import('./moderation.service');
    const moderationResult = await moderationService.scanVideo({
      videoUrl,
      contentId: videoId,
      thumbnailUrl
    });
    
    await job.progress(70);
    
    // Update database with moderation results
    const status = moderationResult.status === 'approved' ? 'approved' : 
                  moderationResult.status === 'rejected' ? 'rejected' : 'flagged';
    
    await videoDatabaseService.updateModerationStatus(videoId, status, moderationResult);
    
    console.log('Video moderation completed:', moderationResult);
    await job.progress(100);
    
    return {
      videoId,
      moderationResult
    };
    
  } catch (error) {
    console.error('Video moderation failed:', error);
    
    // Update database to indicate moderation failed (keep as pending)
    try {
      await videoDatabaseService.updateModerationStatus(videoId, 'pending');
    } catch (dbError) {
      console.error('Failed to update moderation failure status:', dbError);
    }
    
    throw error;
  }
});

// Job queue management functions
export class JobService {
  /**
   * Add video processing job to queue
   */
  static async addVideoProcessingJob(data: VideoProcessingJob): Promise<Bull.Job<VideoProcessingJob>> {
    return videoProcessingQueue.add('process-video', data, {
      priority: 1,
      delay: 1000, // Start processing after 1 second
    });
  }

  /**
   * Add video moderation job to queue
   */
  static async addVideoModerationJob(data: VideoModerationJob): Promise<Bull.Job<VideoModerationJob>> {
    return videoModerationQueue.add('moderate-video', data, {
      priority: 2, // Higher priority than processing
      delay: 500, // Start moderation quickly
    });
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string, queueType: 'processing' | 'moderation'): Promise<any> {
    const queue = queueType === 'processing' ? videoProcessingQueue : videoModerationQueue;
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      data: job.data,
      progress: job.progress(),
      state: await job.getState(),
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
      failedReason: job.failedReason,
    };
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(queueType: 'processing' | 'moderation') {
    const queue = queueType === 'processing' ? videoProcessingQueue : videoModerationQueue;
    
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  /**
   * Clean up old jobs
   */
  static async cleanupJobs() {
    await Promise.all([
      videoProcessingQueue.clean(24 * 60 * 60 * 1000, 'completed'), // Clean completed jobs older than 24h
      videoProcessingQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'), // Clean failed jobs older than 7 days
      videoModerationQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      videoModerationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'),
    ]);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down job queues...');
  await Promise.all([
    videoProcessingQueue.close(),
    videoModerationQueue.close(),
  ]);
  process.exit(0);
});