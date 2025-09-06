export interface ModerationResult {
  contentId: string
  contentType: 'text' | 'video' | 'image'
  status: 'approved' | 'flagged' | 'rejected'
  confidence: number
  categories: string[]
  reviewRequired: boolean
  scanTimestamp: Date
  provider: 'openai' | 'aws-rekognition' | 'hive'
  rawResult?: any
}

export interface TextModerationRequest {
  text: string
  contentId: string
  userId?: string
}

export interface VideoModerationRequest {
  videoUrl: string
  contentId: string
  userId?: string
  thumbnailUrl?: string
}

export interface ModerationConfig {
  openai: {
    apiKey: string
    enabled: boolean
  }
  awsRekognition: {
    accessKeyId: string
    secretAccessKey: string
    region: string
    enabled: boolean
  }
  hive: {
    apiKey: string
    enabled: boolean
  }
  thresholds: {
    textConfidence: number
    videoConfidence: number
    autoRejectThreshold: number
  }
}

export interface OpenAIModerationResponse {
  id: string
  model: string
  results: Array<{
    flagged: boolean
    categories: {
      [key: string]: boolean
    }
    category_scores: {
      [key: string]: number
    }
  }>
}

export interface AWSRekognitionResponse {
  ModerationLabels: Array<{
    Confidence: number
    Name: string
    ParentName?: string
  }>
  ModerationModelVersion: string
}

export interface ContentFlag {
  id: string
  contentType: 'story' | 'video' | 'comment'
  contentId: string
  reporterId?: string
  reason: string
  status: 'pending' | 'reviewed' | 'dismissed'
  adminNotes?: string
  createdAt: Date
  reviewedAt?: Date
}

export interface ModerationQueueItem {
  id: string
  contentId: string
  contentType: 'story' | 'video' | 'comment'
  moderationResult: ModerationResult
  flags: ContentFlag[]
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
}