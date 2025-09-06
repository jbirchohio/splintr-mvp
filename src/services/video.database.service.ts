import { createServerClient } from '@/lib/supabase';
import { Database } from '@/types/database.types';
import { VideoMetadata, VideoProcessingStatus } from '@/types/video.types';
import { ModerationResult } from '@/types/moderation.types';

type VideoRow = Database['public']['Tables']['videos']['Row'];
type VideoInsert = Database['public']['Tables']['videos']['Insert'];
type VideoUpdate = Database['public']['Tables']['videos']['Update'];

export interface VideoRecord {
  id: string;
  creatorId: string;
  originalFilename?: string;
  duration: number;
  fileSize: number;
  cloudinaryPublicId?: string;
  streamingUrl?: string;
  thumbnailUrl?: string;
  processingStatus: VideoProcessingStatus;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'rejected';
  moderationResult?: ModerationResult;
  createdAt: string;
  updatedAt: string;
}

export class VideoDatabaseService {
  private supabase = createServerClient();

  /**
   * Create a new video record in the database
   */
  async createVideo(data: {
    creatorId: string;
    metadata: VideoMetadata;
    cloudinaryPublicId?: string;
    streamingUrl?: string;
    thumbnailUrl?: string;
  }): Promise<VideoRecord> {
    const videoData: VideoInsert = {
      creator_id: data.creatorId,
      original_filename: data.metadata.originalFilename,
      duration: data.metadata.duration,
      file_size: data.metadata.size,
      cloudinary_public_id: data.cloudinaryPublicId,
      streaming_url: data.streamingUrl,
      thumbnail_url: data.thumbnailUrl,
      processing_status: 'pending',
      moderation_status: 'pending'
    };

    const { data: video, error } = await this.supabase
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create video record:', error);
      throw new Error(`Failed to create video record: ${error.message}`);
    }

    return this.mapRowToRecord(video);
  }

  /**
   * Get video by ID
   */
  async getVideoById(videoId: string): Promise<VideoRecord | null> {
    const { data: video, error } = await this.supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Video not found
      }
      console.error('Failed to get video:', error);
      throw new Error(`Failed to get video: ${error.message}`);
    }

    return this.mapRowToRecord(video);
  }

  /**
   * Get video by Cloudinary public ID
   */
  async getVideoByPublicId(publicId: string): Promise<VideoRecord | null> {
    const { data: video, error } = await this.supabase
      .from('videos')
      .select('*')
      .eq('cloudinary_public_id', publicId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Video not found
      }
      console.error('Failed to get video by public ID:', error);
      throw new Error(`Failed to get video by public ID: ${error.message}`);
    }

    return this.mapRowToRecord(video);
  }

  /**
   * Get videos by creator ID
   */
  async getVideosByCreator(
    creatorId: string,
    options: {
      limit?: number;
      offset?: number;
      processingStatus?: VideoProcessingStatus;
      moderationStatus?: 'pending' | 'approved' | 'flagged' | 'rejected';
    } = {}
  ): Promise<VideoRecord[]> {
    let query = this.supabase
      .from('videos')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (options.processingStatus) {
      query = query.eq('processing_status', options.processingStatus);
    }

    if (options.moderationStatus) {
      query = query.eq('moderation_status', options.moderationStatus);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data: videos, error } = await query;

    if (error) {
      console.error('Failed to get videos by creator:', error);
      throw new Error(`Failed to get videos by creator: ${error.message}`);
    }

    return videos.map(video => this.mapRowToRecord(video));
  }

  /**
   * Update video processing status
   */
  async updateProcessingStatus(
    videoId: string,
    status: VideoProcessingStatus,
    additionalData?: {
      streamingUrl?: string;
      thumbnailUrl?: string;
      cloudinaryPublicId?: string;
    }
  ): Promise<VideoRecord> {
    const updateData: VideoUpdate = {
      processing_status: status,
      ...additionalData
    };

    const { data: video, error } = await this.supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update processing status:', error);
      throw new Error(`Failed to update processing status: ${error.message}`);
    }

    return this.mapRowToRecord(video);
  }

  /**
   * Update video moderation status and result
   */
  async updateModerationStatus(
    videoId: string,
    status: 'pending' | 'approved' | 'flagged' | 'rejected',
    moderationResult?: ModerationResult
  ): Promise<VideoRecord> {
    const updateData: VideoUpdate = {
      moderation_status: status,
      moderation_result: moderationResult as any
    };

    const { data: video, error } = await this.supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update moderation status:', error);
      throw new Error(`Failed to update moderation status: ${error.message}`);
    }

    return this.mapRowToRecord(video);
  }

  /**
   * Update video URLs after processing
   */
  async updateVideoUrls(
    videoId: string,
    urls: {
      streamingUrl?: string;
      thumbnailUrl?: string;
    }
  ): Promise<VideoRecord> {
    const updateData: VideoUpdate = {
      streaming_url: urls.streamingUrl,
      thumbnail_url: urls.thumbnailUrl
    };

    const { data: video, error } = await this.supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update video URLs:', error);
      throw new Error(`Failed to update video URLs: ${error.message}`);
    }

    return this.mapRowToRecord(video);
  }

  /**
   * Delete video record
   */
  async deleteVideo(videoId: string): Promise<void> {
    const { error } = await this.supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      console.error('Failed to delete video:', error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  /**
   * Get videos pending processing
   */
  async getVideosForProcessing(limit = 10): Promise<VideoRecord[]> {
    const { data: videos, error } = await this.supabase
      .from('videos')
      .select('*')
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Failed to get videos for processing:', error);
      throw new Error(`Failed to get videos for processing: ${error.message}`);
    }

    return videos.map(video => this.mapRowToRecord(video));
  }

  /**
   * Get videos pending moderation
   */
  async getVideosForModeration(limit = 10): Promise<VideoRecord[]> {
    const { data: videos, error } = await this.supabase
      .from('videos')
      .select('*')
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Failed to get videos for moderation:', error);
      throw new Error(`Failed to get videos for moderation: ${error.message}`);
    }

    return videos.map(video => this.mapRowToRecord(video));
  }

  /**
   * Get video statistics for a creator
   */
  async getCreatorVideoStats(creatorId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    approved: number;
    flagged: number;
    rejected: number;
  }> {
    const { data: stats, error } = await this.supabase
      .from('videos')
      .select('processing_status, moderation_status')
      .eq('creator_id', creatorId);

    if (error) {
      console.error('Failed to get creator video stats:', error);
      throw new Error(`Failed to get creator video stats: ${error.message}`);
    }

    const result = {
      total: stats.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      approved: 0,
      flagged: 0,
      rejected: 0
    };

    stats.forEach(video => {
      // Processing status counts
      switch (video.processing_status) {
        case 'pending':
          result.pending++;
          break;
        case 'processing':
          result.processing++;
          break;
        case 'completed':
          result.completed++;
          break;
        case 'failed':
          result.failed++;
          break;
      }

      // Moderation status counts
      switch (video.moderation_status) {
        case 'approved':
          result.approved++;
          break;
        case 'flagged':
          result.flagged++;
          break;
        case 'rejected':
          result.rejected++;
          break;
      }
    });

    return result;
  }

  /**
   * Map database row to VideoRecord
   */
  private mapRowToRecord(row: VideoRow): VideoRecord {
    return {
      id: row.id,
      creatorId: row.creator_id,
      originalFilename: row.original_filename || undefined,
      duration: row.duration,
      fileSize: row.file_size,
      cloudinaryPublicId: row.cloudinary_public_id || undefined,
      streamingUrl: row.streaming_url || undefined,
      thumbnailUrl: row.thumbnail_url || undefined,
      processingStatus: row.processing_status as VideoProcessingStatus,
      moderationStatus: row.moderation_status as 'pending' | 'approved' | 'flagged' | 'rejected',
      moderationResult: row.moderation_result ? row.moderation_result as unknown as ModerationResult : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Export singleton instance
export const videoDatabaseService = new VideoDatabaseService();