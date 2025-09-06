import { createMocks } from 'node-mocks-http'
import draftHandler from '@/pages/api/stories/[id]/draft'
import previewHandler from '@/pages/api/stories/[id]/preview'
import metadataHandler from '@/pages/api/stories/[id]/metadata'
import { storyService } from '@/services/story.service'

// Mock the story service
jest.mock('@/services/story.service')
const mockStoryService = storyService as jest.Mocked<typeof storyService>

describe('/api/stories/[id]/draft', () => {
  it('should save draft with PUT method', async () => {
    const mockStory = {
      id: 'story-123',
      creatorId: 'user-123',
      title: 'Updated Title',
      description: 'Updated description',
      nodes: [],
      isPublished: false,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockStoryService.saveDraft.mockResolvedValue(mockStory)

    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: 'story-123' },
      body: {
        title: 'Updated Title',
        description: 'Updated description'
      }
    })

    await draftHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData).toMatchObject({
      id: mockStory.id,
      creatorId: mockStory.creatorId,
      title: mockStory.title,
      description: mockStory.description,
      isPublished: mockStory.isPublished,
      viewCount: mockStory.viewCount
    })
    expect(mockStoryService.saveDraft).toHaveBeenCalledWith('story-123', {
      title: 'Updated Title',
      description: 'Updated description'
    })
  })

  it('should auto-save with PATCH method', async () => {
    mockStoryService.autoSaveDraft.mockResolvedValue()

    const { req, res } = createMocks({
      method: 'PATCH',
      query: { id: 'story-123' },
      body: {
        title: 'Auto-saved title'
      }
    })

    await draftHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({ message: 'Auto-save completed' })
    expect(mockStoryService.autoSaveDraft).toHaveBeenCalledWith('story-123', {
      title: 'Auto-saved title'
    })
  })

  it('should return 405 for unsupported methods', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'story-123' }
    })

    await draftHandler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' })
  })

  it('should handle story not found error', async () => {
    mockStoryService.saveDraft.mockRejectedValue(new Error('Story not found'))

    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: 'nonexistent' },
      body: { title: 'Test' }
    })

    await draftHandler(req, res)

    expect(res._getStatusCode()).toBe(404)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Story not found' })
  })

  it('should handle unauthorized error', async () => {
    mockStoryService.saveDraft.mockRejectedValue(new Error('Unauthorized: You can only update your own stories'))

    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: 'story-123' },
      body: { title: 'Test' }
    })

    await draftHandler(req, res)

    expect(res._getStatusCode()).toBe(403)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' })
  })
})

describe('/api/stories/[id]/preview', () => {
  it('should return story preview data', async () => {
    const mockPreview = {
      story: {
        id: 'story-123',
        creatorId: 'user-123',
        title: 'Test Story',
        description: 'Test description',
        nodes: [],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      validation: {
        isValid: true,
        errors: []
      },
      moderationStatus: {
        contentId: 'story-123',
        status: 'approved',
        confidence: 0.1,
        categories: [],
        reviewRequired: false
      },
      isReadyToPublish: true
    }

    mockStoryService.getStoryPreview.mockResolvedValue(mockPreview)

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'story-123' }
    })

    await previewHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData).toMatchObject({
      story: {
        id: mockPreview.story.id,
        creatorId: mockPreview.story.creatorId,
        title: mockPreview.story.title,
        description: mockPreview.story.description,
        isPublished: mockPreview.story.isPublished,
        viewCount: mockPreview.story.viewCount
      },
      validation: mockPreview.validation,
      moderationStatus: mockPreview.moderationStatus,
      isReadyToPublish: mockPreview.isReadyToPublish
    })
    expect(mockStoryService.getStoryPreview).toHaveBeenCalledWith('story-123')
  })

  it('should return 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'story-123' }
    })

    await previewHandler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' })
  })

  it('should handle story not found', async () => {
    mockStoryService.getStoryPreview.mockRejectedValue(new Error('Story not found'))

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'nonexistent' }
    })

    await previewHandler(req, res)

    expect(res._getStatusCode()).toBe(404)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Story not found' })
  })
})

describe('/api/stories/[id]/metadata', () => {
  it('should update story metadata', async () => {
    const mockStory = {
      id: 'story-123',
      creatorId: 'user-123',
      title: 'Updated Title',
      description: 'Updated description',
      nodes: [],
      isPublished: false,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockStoryService.updateStory.mockResolvedValue(mockStory)

    const { req, res } = createMocks({
      method: 'PATCH',
      query: { id: 'story-123' },
      body: {
        title: 'Updated Title',
        description: 'Updated description'
      }
    })

    await metadataHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData).toMatchObject({
      id: mockStory.id,
      creatorId: mockStory.creatorId,
      title: mockStory.title,
      description: mockStory.description,
      isPublished: mockStory.isPublished,
      viewCount: mockStory.viewCount
    })
    expect(mockStoryService.updateStory).toHaveBeenCalledWith('story-123', {
      title: 'Updated Title',
      description: 'Updated description'
    })
  })

  it('should validate title is not empty', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      query: { id: 'story-123' },
      body: {
        title: '   ', // Empty after trim
        description: 'Valid description'
      }
    })

    await metadataHandler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Title cannot be empty' })
  })

  it('should validate title length', async () => {
    const longTitle = 'a'.repeat(201) // Exceeds 200 character limit

    const { req, res } = createMocks({
      method: 'PATCH',
      query: { id: 'story-123' },
      body: {
        title: longTitle,
        description: 'Valid description'
      }
    })

    await metadataHandler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Title cannot exceed 200 characters' })
  })

  it('should validate description length', async () => {
    const longDescription = 'a'.repeat(1001) // Exceeds 1000 character limit

    const { req, res } = createMocks({
      method: 'PATCH',
      query: { id: 'story-123' },
      body: {
        title: 'Valid title',
        description: longDescription
      }
    })

    await metadataHandler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Description cannot exceed 1000 characters' })
  })

  it('should return 405 for non-PATCH methods', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'story-123' }
    })

    await metadataHandler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' })
  })

  it('should handle missing story ID', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      query: {}, // Missing id
      body: { title: 'Test' }
    })

    await metadataHandler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Story ID is required' })
  })
})