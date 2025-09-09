import { 
  ModerationResult, 
  TextModerationRequest, 
  VideoModerationRequest,
  OpenAIModerationResponse,
  AWSRekognitionResponse,
  ContentFlag,
  ModerationQueueItem
} from '@/types/moderation.types'
import { moderationConfig } from '@/config/moderation.config'
import { supabase } from '@/lib/supabase'
import AWS from 'aws-sdk'

export class ModerationService {
  private openaiApiKey: string
  private rekognition: AWS.Rekognition | null = null

  constructor() {
    this.openaiApiKey = moderationConfig.openai.apiKey
    
    if (moderationConfig.awsRekognition.enabled) {
      AWS.config.update({
        accessKeyId: moderationConfig.awsRekognition.accessKeyId,
        secretAccessKey: moderationConfig.awsRekognition.secretAccessKey,
        region: moderationConfig.awsRekognition.region
      })
      this.rekognition = new AWS.Rekognition()
    }
  }

  async scanText(request: TextModerationRequest): Promise<ModerationResult> {
    if (!moderationConfig.openai.enabled || !this.openaiApiKey) {
      throw new Error('OpenAI moderation is not configured')
    }

    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: request.text
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data: OpenAIModerationResponse = await response.json()
      const result = data.results[0]

      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category)

      const maxScore = Math.max(...Object.values(result.category_scores))
      
      const moderationResult: ModerationResult = {
        contentId: request.contentId,
        contentType: 'text',
        status: result.flagged ? 'flagged' : 'approved',
        confidence: maxScore,
        categories: flaggedCategories,
        reviewRequired: result.flagged && maxScore < moderationConfig.thresholds.autoRejectThreshold,
        scanTimestamp: new Date(),
        provider: 'openai',
        rawResult: data
      }

      // Store result in database
      await this.storeModerationResult(moderationResult)

      return moderationResult
    } catch (error) {
      console.error('Text moderation failed:', error)
      throw new Error('Failed to scan text content')
    }
  }

  async scanVideo(request: VideoModerationRequest): Promise<ModerationResult> {
    if (!moderationConfig.awsRekognition.enabled || !this.rekognition) {
      throw new Error('AWS Rekognition is not configured')
    }

    try {
      // For video URLs, we need to use StartContentModeration for async processing
      // For this MVP, we'll use DetectModerationLabels on the thumbnail if available
      if (!request.thumbnailUrl) {
        throw new Error('Thumbnail URL required for video moderation')
      }

      const params = {
        Image: {
          S3Object: {
            Bucket: this.extractS3Bucket(request.thumbnailUrl),
            Name: this.extractS3Key(request.thumbnailUrl)
          }
        },
        MinConfidence: moderationConfig.thresholds.videoConfidence * 100
      }

      const result = await this.rekognition.detectModerationLabels(params).promise()
      
      const flaggedCategories = result.ModerationLabels?.map(label => label.Name) || []
      const maxConfidence = Math.max(...(result.ModerationLabels?.map(label => label.Confidence || 0) || [0])) / 100
      
      const moderationResult: ModerationResult = {
        contentId: request.contentId,
        contentType: 'video',
        status: flaggedCategories.length > 0 ? 'flagged' : 'approved',
        confidence: maxConfidence,
        categories: flaggedCategories.filter((cat): cat is string => cat !== undefined),
        reviewRequired: flaggedCategories.length > 0 && maxConfidence < moderationConfig.thresholds.autoRejectThreshold,
        scanTimestamp: new Date(),
        provider: 'aws-rekognition',
        rawResult: result
      }

      // Store result in database
      await this.storeModerationResult(moderationResult)

      return moderationResult
    } catch (error) {
      console.error('Video moderation failed:', error)
      throw new Error('Failed to scan video content')
    }
  }

  async flagContent(contentId: string, contentType: 'story' | 'video' | 'comment', reason: string, reporterId?: string): Promise<ContentFlag> {
    const flagData = {
      content_type: contentType,
      content_id: contentId,
      reporter_id: reporterId,
      reason,
      status: 'pending'
    }

    const { data, error } = await supabase
      .from('content_flags')
      .insert(flagData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create content flag: ${error.message}`)
    }

    return {
      id: data.id,
      contentType: data.content_type as 'story' | 'video' | 'comment',
      contentId: data.content_id,
      reporterId: data.reporter_id || undefined,
      reason: data.reason,
      status: data.status as 'pending' | 'reviewed' | 'dismissed',
      adminNotes: data.admin_notes || undefined,
      createdAt: new Date(data.created_at),
      reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined
    }
  }

  async getModerationQueue(limit = 50): Promise<ModerationQueueItem[]> {
    const { data: flags, error } = await supabase
      .from('content_flags')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch moderation queue: ${error.message}`)
    }

    return flags.map(flag => ({
      id: flag.id,
      contentId: flag.content_id,
      contentType: flag.content_type as 'story' | 'video' | 'comment',
      moderationResult: null as any, // Will be populated separately if needed
      flags: [{
        id: flag.id,
        contentType: flag.content_type as 'story' | 'video' | 'comment',
        contentId: flag.content_id,
        reporterId: flag.reporter_id || undefined,
        reason: flag.reason,
        status: flag.status as 'pending' | 'reviewed' | 'dismissed',
        adminNotes: flag.admin_notes || undefined,
        createdAt: new Date(flag.created_at),
        reviewedAt: flag.reviewed_at ? new Date(flag.reviewed_at) : undefined
      }],
      priority: this.calculatePriority({
        id: flag.id,
        contentType: flag.content_type as 'story' | 'video' | 'comment',
        contentId: flag.content_id,
        reporterId: flag.reporter_id || undefined,
        reason: flag.reason,
        status: flag.status as 'pending' | 'reviewed' | 'dismissed',
        adminNotes: flag.admin_notes || undefined,
        createdAt: new Date(flag.created_at),
        reviewedAt: flag.reviewed_at ? new Date(flag.reviewed_at) : undefined
      }),
      createdAt: new Date(flag.created_at)
    }))
  }

  async reviewFlaggedContent(flagId: string, decision: 'approve' | 'reject', adminNotes?: string): Promise<void> {
    const { error } = await supabase
      .from('content_flags')
      .update({
        status: 'reviewed',
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', flagId)

    if (error) {
      throw new Error(`Failed to update flag status: ${error.message}`)
    }

    // TODO: Implement content action based on decision (hide/remove content)
  }

  private async storeModerationResult(result: ModerationResult): Promise<void> {
    // Moderation results are now stored directly in the videos table
    // This method is kept for compatibility but doesn't need to do anything
    console.log('Moderation result stored in video record:', result.contentId)
  }

  private extractS3Bucket(url: string): string {
    // Extract bucket name from S3 URL
    const match = url.match(/https?:\/\/([^.]+)\.s3/)
    return match?.[1] || ''
  }

  private extractS3Key(url: string): string {
    // Extract object key from S3 URL
    const match = url.match(/\.com\/(.+)$/)
    return match?.[1] || ''
  }

  private calculatePriority(flag: ContentFlag): 'low' | 'medium' | 'high' {
    // Simple priority calculation based on content type and age
    const ageHours = (Date.now() - new Date(flag.createdAt).getTime()) / (1000 * 60 * 60)
    
    if (flag.contentType === 'video' && ageHours < 1) return 'high'
    if (ageHours < 24) return 'medium'
    return 'low'
  }
}

export const moderationService = new ModerationService()