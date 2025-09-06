import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/stories/index'
import storyHandler from '@/pages/api/stories/[id]'
import publishHandler from '@/pages/api/stories/[id]/publish'
import validateHandler from '@/pages/api/stories/[id]/validate'
import { CreateStoryRequest, UpdateStoryRequest } from '@/types/story.types'

// Mock Supabase
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User'
}

const mockStory = {
  id: 'story-123',
  creator_id: 'user-123',
  title: 'Test Story',
  description: 'A test story',
  story_data: {
    nodes: [
      {
        id: 'node-1',
        videoId: 'video-1',
        isStartNode: true,
        isEndNode: false,
        choices: [
          { id: 'choice-1', text: 'Choice A', nextNodeId: 'node-2' },
          { id: 'choice-2', text: 'Choice B', nextNodeId: 'node-3' }
        ]
      },
      {
        id: 'node-2',
        videoId: 'video-2',
        isStartNode: false,
        isEndNode: true,
        choices: []
      },
      {
        id: 'node-3',
        videoId: 'video-3',
        isStartNode: false,
        isEndNode: true,
        choices: []
      }
    ]
  },
  is_published: false,
  thumbnail_url: null,
  view_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  published_at: null
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: mockUser },
        error: null
      }))
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: mockStory,
            error: null
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: mockStory,
            error: null
          })),
          order: jest.fn(() => Promise.resolve({
            data: [mockStory],
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { ...mockStory, is_published: true },
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}))

// Mock moderation service
jest.mock('@/services/moderation.service', () => ({
  moderationService: {
    scanText: jest.fn(() => Promise.resolve({
      contentId: 'story-123',
      contentType: 'text',
      status: 'approved',
      confidence: 0.1,
      categories: [],
      reviewRequired: false,
      scanTimestamp: new Date(),
      provider: 'openai'
    }))
  }
}))

describe('/api/stories', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/stories', () => {
    it('should create a new story', async () => {
      const createRequest: CreateStoryRequest = {
        title: 'Test Story',
        description: 'A test story',
        nodes: [
          {
            videoId: 'video-1',
            isStartNode: true,
            isEndNode: false,
            choices: [
              { text: 'Choice A', nextNodeId: 'node-2' },
              { text: 'Choice B', nextNodeId: 'node-3' }
            ]
          },
          {
            videoId: 'video-2',
            isStartNode: false,
            isEndNode: true,
            choices: []
          },
          {
            videoId: 'video-3',
            isStartNode: false,
            isEndNode: true,
            choices: []
          }
        ]
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: createRequest
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const responseData = JSON.parse(res._getData())
      expect(responseData.title).toBe('Test Story')
      expect(responseData.creatorId).toBe('user-123')
    })

    it('should return 400 for missing title', async () => {
      const createRequest = {
        nodes: []
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: createRequest
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('Title is required')
    })

    it('should return 400 for missing nodes', async () => {
      const createRequest = {
        title: 'Test Story',
        nodes: []
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: createRequest
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('Story must have at least one node')
    })
  })

  describe('GET /api/stories', () => {
    it('should get stories by creator', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { creatorId: 'user-123' }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(Array.isArray(responseData)).toBe(true)
      expect(responseData[0].title).toBe('Test Story')
    })

    it('should return 400 when creatorId is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('creatorId parameter is required')
    })
  })
})

describe('/api/stories/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/stories/[id]', () => {
    it('should get a story by id', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'story-123' }
      })

      await storyHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.id).toBe('story-123')
      expect(responseData.title).toBe('Test Story')
    })

    it('should return 400 for missing id', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      })

      await storyHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('Story ID is required')
    })
  })

  describe('PUT /api/stories/[id]', () => {
    it('should update a story', async () => {
      const updateRequest: UpdateStoryRequest = {
        title: 'Updated Story Title'
      }

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'story-123' },
        body: updateRequest
      })

      await storyHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.title).toBe('Test Story') // Mock returns original data
    })
  })
})

describe('/api/stories/[id]/publish', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should publish a story', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'story-123' }
    })

    await publishHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.message).toBe('Story published successfully')
  })

  it('should return 405 for non-POST methods', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'story-123' }
    })

    await publishHandler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const responseData = JSON.parse(res._getData())
    expect(responseData.error).toBe('Method not allowed')
  })
})

describe('/api/stories/[id]/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should validate a story structure', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'story-123' }
    })

    await validateHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.isValid).toBe(true)
    expect(Array.isArray(responseData.errors)).toBe(true)
  })

  it('should return 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'story-123' }
    })

    await validateHandler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const responseData = JSON.parse(res._getData())
    expect(responseData.error).toBe('Method not allowed')
  })
})