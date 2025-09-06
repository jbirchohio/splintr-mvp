import { createMocks } from 'node-mocks-http'
import scanTextHandler from '@/pages/api/moderation/scan-text'
import scanVideoHandler from '@/pages/api/moderation/scan-video'
import flagContentHandler from '@/pages/api/moderation/flag-content'
import queueHandler from '@/pages/api/moderation/queue'
import reviewHandler from '@/pages/api/moderation/review'

// Mock the moderation service
jest.mock('@/services/moderation.service', () => ({
  moderationService: {
    scanText: jest.fn(),
    scanVideo: jest.fn(),
    flagContent: jest.fn(),
    getModerationQueue: jest.fn(),
    reviewFlaggedContent: jest.fn()
  }
}))

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    }
  }
}))

describe('/api/moderation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('/scan-text', () => {
    it('should successfully scan text content', async () => {
      const mockResult = {
        contentId: 'test-id',
        contentType: 'text',
        status: 'approved',
        confidence: 0.2,
        categories: [],
        reviewRequired: false,
        scanTimestamp: '2025-09-06T04:16:51.637Z',
        provider: 'openai'
      }

      const { moderationService } = require('@/services/moderation.service')
      moderationService.scanText.mockResolvedValue(mockResult)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          text: 'This is a test message',
          contentId: 'test-id'
        }
      })

      await scanTextHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResult)
    })

    it('should return 400 for missing required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          text: 'Test message'
          // Missing contentId
        }
      })

      await scanTextHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 400 for text that is too long', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          text: 'a'.repeat(10001),
          contentId: 'test-id'
        }
      })

      await scanTextHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('Text content too long')
    })

    it('should return 405 for non-POST methods', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      })

      await scanTextHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })
  })

  describe('/scan-video', () => {
    it('should successfully scan video content', async () => {
      const mockResult = {
        contentId: 'video-id',
        contentType: 'video',
        status: 'approved',
        confidence: 0.1,
        categories: [],
        reviewRequired: false,
        scanTimestamp: '2025-09-06T04:16:51.657Z',
        provider: 'aws-rekognition'
      }

      const { moderationService } = require('@/services/moderation.service')
      moderationService.scanVideo.mockResolvedValue(mockResult)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          videoUrl: 'https://example.com/video.mp4',
          contentId: 'video-id',
          thumbnailUrl: 'https://example.com/thumb.jpg'
        }
      })

      await scanVideoHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResult)
    })

    it('should return 400 for missing required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          videoUrl: 'https://example.com/video.mp4'
          // Missing contentId
        }
      })

      await scanVideoHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
    })
  })

  describe('/flag-content', () => {
    it('should successfully flag content with authentication', async () => {
      const mockFlag = {
        id: 'flag-id',
        contentType: 'video',
        contentId: 'content-id',
        reporterId: 'user-id',
        reason: 'Inappropriate',
        status: 'pending',
        createdAt: '2025-09-06T04:16:51.660Z'
      }

      const { supabase } = require('@/lib/supabase')
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null
      })

      const { moderationService } = require('@/services/moderation.service')
      moderationService.flagContent.mockResolvedValue(mockFlag)

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token'
        },
        body: {
          contentId: 'content-id',
          contentType: 'video',
          reason: 'Inappropriate content'
        }
      })

      await flagContentHandler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockFlag)
    })

    it('should return 401 for missing authorization', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          contentId: 'content-id',
          contentType: 'video',
          reason: 'Test reason'
        }
      })

      await flagContentHandler(req, res)

      expect(res._getStatusCode()).toBe(401)
    })

    it('should return 400 for invalid content type', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null
      })

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token'
        },
        body: {
          contentId: 'content-id',
          contentType: 'invalid-type',
          reason: 'Test reason'
        }
      })

      await flagContentHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('Invalid contentType')
    })
  })

  describe('/queue', () => {
    it('should return moderation queue for authenticated users', async () => {
      const mockQueue = [
        {
          id: 'queue-item-1',
          contentId: 'content-1',
          contentType: 'video',
          moderationResult: null,
          flags: [],
          priority: 'medium',
          createdAt: '2025-09-06T04:16:51.664Z'
        }
      ]

      const { supabase } = require('@/lib/supabase')
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id' } },
        error: null
      })

      const { moderationService } = require('@/services/moderation.service')
      moderationService.getModerationQueue.mockResolvedValue(mockQueue)

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer admin-token'
        },
        query: {
          limit: '25'
        }
      })

      await queueHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockQueue)
      expect(moderationService.getModerationQueue).toHaveBeenCalledWith(25)
    })

    it('should return 401 for unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      })

      await queueHandler(req, res)

      expect(res._getStatusCode()).toBe(401)
    })
  })

  describe('/review', () => {
    it('should successfully review flagged content', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id' } },
        error: null
      })

      const { moderationService } = require('@/services/moderation.service')
      moderationService.reviewFlaggedContent.mockResolvedValue(undefined)

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token'
        },
        body: {
          flagId: 'flag-id',
          decision: 'approve',
          adminNotes: 'Content is acceptable'
        }
      })

      await reviewHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(true)
      expect(data.message).toContain('approved successfully')
    })

    it('should return 400 for invalid decision', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id' } },
        error: null
      })

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer admin-token'
        },
        body: {
          flagId: 'flag-id',
          decision: 'invalid-decision'
        }
      })

      await reviewHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('Invalid decision')
    })
  })
})