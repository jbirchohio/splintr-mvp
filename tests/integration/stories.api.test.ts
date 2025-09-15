import { createMocks } from 'node-mocks-http'
import handler from '../shims/pages/api/stories/index'
import storyHandler from '@/pages/api/stories/[id]'
import publishHandler from '@/pages/api/stories/[id]/publish'
import validateHandler from '@/pages/api/stories/[id]/validate'

// Mock the story service
jest.mock('@/services/story.service', () => ({
  storyService: {
    createStory: jest.fn(),
    getStory: jest.fn(),
    getStoriesByCreator: jest.fn(),
    updateStory: jest.fn(),
    publishStory: jest.fn(),
    validateStoryStructure: jest.fn()
  }
}))

import { storyService } from '@/services/story.service'

describe('/api/stories', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/stories', () => {
    it('should create a story successfully', async () => {
      const mockStory = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [{
          videoId: 'video-1',
          isStartNode: true,
          isEndNode: true,
          choices: []
        }],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      ;(storyService.createStory as jest.Mock).mockResolvedValue(mockStory)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test Story',
          nodes: [{
            videoId: 'video-1',
            isStartNode: true,
            isEndNode: true,
            choices: []
          }]
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      expect(JSON.parse(res._getData())).toEqual(mockStory)
      expect(storyService.createStory).toHaveBeenCalledWith({
        title: 'Test Story',
        nodes: [{
          videoId: 'video-1',
          isStartNode: true,
          isEndNode: true,
          choices: []
        }]
      })
    })

    it('should return 400 for missing title', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          nodes: []
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({ error: 'Title is required' })
    })

    it('should return 400 for missing nodes', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test Story'
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({ error: 'Story must have at least one node' })
    })
  })

  describe('GET /api/stories', () => {
    it('should get stories by creator', async () => {
      const mockStories = [
        {
          id: 'story-1',
          creatorId: 'user-1',
          title: 'Story 1',
          nodes: [],
          isPublished: true,
          viewCount: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      ;(storyService.getStoriesByCreator as jest.Mock).mockResolvedValue(mockStories)

      const { req, res } = createMocks({
        method: 'GET',
        query: { creatorId: 'user-1' }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toEqual(mockStories)
      expect(storyService.getStoriesByCreator).toHaveBeenCalledWith('user-1')
    })

    it('should return 400 when creatorId is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({ error: 'creatorId parameter is required' })
    })
  })
})

describe('/api/stories/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/stories/[id]', () => {
    it('should get a story by id', async () => {
      const mockStory = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [],
        isPublished: true,
        viewCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      ;(storyService.getStory as jest.Mock).mockResolvedValue(mockStory)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'story-1' }
      })

      await storyHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toEqual(mockStory)
      expect(storyService.getStory).toHaveBeenCalledWith('story-1')
    })

    it('should return 404 for non-existent story', async () => {
      ;(storyService.getStory as jest.Mock).mockRejectedValue(new Error('Story not found'))

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'non-existent' }
      })

      await storyHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
      expect(JSON.parse(res._getData())).toEqual({ error: 'Story not found' })
    })
  })

  describe('PUT /api/stories/[id]', () => {
    it('should update a story', async () => {
      const mockUpdatedStory = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Updated Story',
        nodes: [],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      ;(storyService.updateStory as jest.Mock).mockResolvedValue(mockUpdatedStory)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'story-1' },
        body: { title: 'Updated Story' }
      })

      await storyHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toEqual(mockUpdatedStory)
      expect(storyService.updateStory).toHaveBeenCalledWith('story-1', { title: 'Updated Story' })
    })
  })
})

describe('/api/stories/[id]/publish', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should publish a story successfully', async () => {
    ;(storyService.publishStory as jest.Mock).mockResolvedValue(undefined)

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'story-1' }
    })

    await publishHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({ message: 'Story published successfully' })
    expect(storyService.publishStory).toHaveBeenCalledWith('story-1')
  })

  it('should return 400 for validation errors', async () => {
    ;(storyService.publishStory as jest.Mock).mockRejectedValue(
      new Error('Cannot publish story: Story must have at least one end node')
    )

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'story-1' }
    })

    await publishHandler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toEqual({ 
      error: 'Cannot publish story: Story must have at least one end node' 
    })
  })
})

describe('/api/stories/[id]/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should validate a story structure', async () => {
    const mockStory = {
      id: 'story-1',
      creatorId: 'user-1',
      title: 'Test Story',
      nodes: [],
      isPublished: false,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const mockValidation = {
      isValid: true,
      errors: []
    }

    ;(storyService.getStory as jest.Mock).mockResolvedValue(mockStory)
    ;(storyService.validateStoryStructure as jest.Mock).mockReturnValue(mockValidation)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'story-1' }
    })

    await validateHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual(mockValidation)
    expect(storyService.getStory).toHaveBeenCalledWith('story-1')
    expect(storyService.validateStoryStructure).toHaveBeenCalledWith(mockStory)
  })
})
