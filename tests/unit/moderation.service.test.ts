import { ModerationService } from '@/services/moderation.service'
import { TextModerationRequest, VideoModerationRequest } from '@/types/moderation.types'

// Mock external dependencies
const mockSupabaseChain = {
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn(),
  update: jest.fn().mockReturnThis()
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseChain)
  }
}))

jest.mock('aws-sdk', () => ({
  Rekognition: jest.fn(() => ({
    detectModerationLabels: jest.fn(() => ({
      promise: jest.fn()
    }))
  })),
  config: {
    update: jest.fn()
  }
}))

// Mock the moderation config
jest.mock('@/config/moderation.config', () => ({
  moderationConfig: {
    openai: {
      apiKey: 'test-openai-key',
      enabled: true
    },
    awsRekognition: {
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      region: 'us-east-1',
      enabled: true
    },
    hive: {
      apiKey: 'test-hive-key',
      enabled: false
    },
    thresholds: {
      textConfidence: 0.7,
      videoConfidence: 0.8,
      autoRejectThreshold: 0.9
    }
  }
}))

// Mock fetch for OpenAI API
global.fetch = jest.fn()

describe('ModerationService', () => {
  let moderationService: ModerationService
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset mock chain
    Object.values(mockSupabaseChain).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockClear()
      }
    })
    
    moderationService = new ModerationService()
  })

  describe('scanText', () => {
    it('should successfully scan text content', async () => {
      const mockOpenAIResponse = {
        id: 'modr-test',
        model: 'text-moderation-007',
        results: [{
          flagged: false,
          categories: {
            hate: false,
            'hate/threatening': false,
            harassment: false,
            'harassment/threatening': false,
            'self-harm': false,
            'self-harm/intent': false,
            'self-harm/instructions': false,
            sexual: false,
            'sexual/minors': false,
            violence: false,
            'violence/graphic': false
          },
          category_scores: {
            hate: 0.1,
            'hate/threatening': 0.05,
            harassment: 0.2,
            'harassment/threatening': 0.1,
            'self-harm': 0.05,
            'self-harm/intent': 0.03,
            'self-harm/instructions': 0.02,
            sexual: 0.15,
            'sexual/minors': 0.01,
            violence: 0.1,
            'violence/graphic': 0.08
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOpenAIResponse)
      })

      const request: TextModerationRequest = {
        text: 'This is a test message',
        contentId: 'test-content-id',
        userId: 'test-user-id'
      }

      const result = await moderationService.scanText(request)

      expect(result.contentId).toBe('test-content-id')
      expect(result.contentType).toBe('text')
      expect(result.status).toBe('approved')
      expect(result.provider).toBe('openai')
      expect(result.confidence).toBe(0.2) // Max score from category_scores
    })

    it('should flag inappropriate text content', async () => {
      const mockOpenAIResponse = {
        id: 'modr-test',
        model: 'text-moderation-007',
        results: [{
          flagged: true,
          categories: {
            hate: true,
            violence: false
          },
          category_scores: {
            hate: 0.85,
            violence: 0.3
          }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOpenAIResponse)
      })

      const request: TextModerationRequest = {
        text: 'Inappropriate content here',
        contentId: 'test-content-id'
      }

      const result = await moderationService.scanText(request)

      expect(result.status).toBe('flagged')
      expect(result.categories).toContain('hate')
      expect(result.confidence).toBe(0.85)
      expect(result.reviewRequired).toBe(true) // Below auto-reject threshold
    })

    it('should handle OpenAI API errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      })

      const request: TextModerationRequest = {
        text: 'Test message',
        contentId: 'test-content-id'
      }

      await expect(moderationService.scanText(request)).rejects.toThrow('Failed to scan text content')
    })

    it('should handle very long text content', async () => {
      const mockOpenAIResponse = {
        id: 'modr-test',
        model: 'text-moderation-007',
        results: [{
          flagged: false,
          categories: {},
          category_scores: { hate: 0.1 }
        }]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOpenAIResponse)
      })

      const request: TextModerationRequest = {
        text: 'a'.repeat(5000), // Long but within service limits
        contentId: 'test-content-id'
      }

      // The service should handle long text, API validation happens at endpoint level
      await expect(moderationService.scanText(request)).resolves.toBeDefined()
    })
  })

  describe('flagContent', () => {
    it('should successfully create a content flag', async () => {
      const mockDatabaseFlag = {
        id: 'flag-id',
        content_type: 'video',
        content_id: 'content-id',
        reporter_id: 'user-id',
        reason: 'Inappropriate content',
        status: 'pending',
        admin_notes: null,
        created_at: new Date().toISOString(),
        reviewed_at: null
      }

      const expectedFlag = {
        id: 'flag-id',
        contentType: 'video',
        contentId: 'content-id',
        reporterId: 'user-id',
        reason: 'Inappropriate content',
        status: 'pending',
        adminNotes: undefined,
        createdAt: new Date(mockDatabaseFlag.created_at),
        reviewedAt: undefined
      }

      mockSupabaseChain.single.mockResolvedValue({
        data: mockDatabaseFlag,
        error: null
      })

      const result = await moderationService.flagContent(
        'content-id',
        'video',
        'Inappropriate content',
        'user-id'
      )

      expect(result).toEqual(expectedFlag)
    })

    it('should handle database errors when creating flags', async () => {
      mockSupabaseChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(
        moderationService.flagContent('content-id', 'video', 'Test reason')
      ).rejects.toThrow('Failed to create content flag: Database error')
    })
  })

  describe('getModerationQueue', () => {
    it('should fetch moderation queue items', async () => {
      const mockFlags = [
        {
          id: 'flag-1',
          content_id: 'content-1',
          content_type: 'video',
          reason: 'Inappropriate',
          status: 'pending',
          created_at: new Date().toISOString(),
          moderation_results: [{
            status: 'flagged',
            confidence: 0.8,
            categories: ['violence']
          }]
        }
      ]

      mockSupabaseChain.limit.mockResolvedValue({
        data: mockFlags,
        error: null
      })

      const result = await moderationService.getModerationQueue(10)

      expect(result).toHaveLength(1)
      expect(result[0].contentId).toBe('content-1')
      expect(result[0].priority).toBeDefined()
    })
  })

  describe('reviewFlaggedContent', () => {
    it('should successfully review flagged content', async () => {
      mockSupabaseChain.eq.mockResolvedValue({
        error: null
      })

      await expect(
        moderationService.reviewFlaggedContent('flag-id', 'approve', 'Looks fine')
      ).resolves.not.toThrow()
    })

    it('should handle database errors during review', async () => {
      mockSupabaseChain.eq.mockResolvedValue({
        error: { message: 'Update failed' }
      })

      await expect(
        moderationService.reviewFlaggedContent('flag-id', 'approve')
      ).rejects.toThrow('Failed to update flag status: Update failed')
    })
  })
})