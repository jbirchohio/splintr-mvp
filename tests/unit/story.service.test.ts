import { StoryService } from '@/services/story.service'
import { Story, CreateStoryRequest, StoryNode } from '@/types/story.types'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }))
  }
}))

describe('StoryService', () => {
  let storyService: StoryService

  beforeEach(() => {
    storyService = new StoryService()
    jest.clearAllMocks()
  })

  describe('validateStoryStructure', () => {
    it('should validate a correct story structure', () => {
      const validStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
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
        ],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(validStory)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject story with no nodes', () => {
      const invalidStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(invalidStory)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Story must have at least one node')
    })

    it('should reject story with no start node', () => {
      const invalidStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [
          {
            id: 'node-1',
            videoId: 'video-1',
            isStartNode: false,
            isEndNode: true,
            choices: []
          }
        ],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(invalidStory)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Story must have exactly one start node')
    })

    it('should reject story with multiple start nodes', () => {
      const invalidStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [
          {
            id: 'node-1',
            videoId: 'video-1',
            isStartNode: true,
            isEndNode: false,
            choices: [
              { id: 'choice-1', text: 'Choice A', nextNodeId: 'node-2' },
              { id: 'choice-2', text: 'Choice B', nextNodeId: 'node-2' }
            ]
          },
          {
            id: 'node-2',
            videoId: 'video-2',
            isStartNode: true,
            isEndNode: true,
            choices: []
          }
        ],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(invalidStory)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Story can only have one start node')
    })

    it('should reject story with no end nodes', () => {
      const invalidStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [
          {
            id: 'node-1',
            videoId: 'video-1',
            isStartNode: true,
            isEndNode: false,
            choices: [
              { id: 'choice-1', text: 'Choice A', nextNodeId: 'node-2' },
              { id: 'choice-2', text: 'Choice B', nextNodeId: 'node-2' }
            ]
          },
          {
            id: 'node-2',
            videoId: 'video-2',
            isStartNode: false,
            isEndNode: false,
            choices: [
              { id: 'choice-3', text: 'Choice C', nextNodeId: 'node-1' },
              { id: 'choice-4', text: 'Choice D', nextNodeId: 'node-1' }
            ]
          }
        ],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(invalidStory)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Story must have at least one end node')
    })

    it('should reject non-end nodes without exactly 2 choices', () => {
      const invalidStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [
          {
            id: 'node-1',
            videoId: 'video-1',
            isStartNode: true,
            isEndNode: false,
            choices: [
              { id: 'choice-1', text: 'Choice A', nextNodeId: 'node-2' }
            ]
          },
          {
            id: 'node-2',
            videoId: 'video-2',
            isStartNode: false,
            isEndNode: true,
            choices: []
          }
        ],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(invalidStory)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Non-end node 1 must have exactly 2 choices')
    })

    it('should reject choices pointing to non-existent nodes', () => {
      const invalidStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [
          {
            id: 'node-1',
            videoId: 'video-1',
            isStartNode: true,
            isEndNode: false,
            choices: [
              { id: 'choice-1', text: 'Choice A', nextNodeId: 'non-existent' },
              { id: 'choice-2', text: 'Choice B', nextNodeId: 'node-2' }
            ]
          },
          {
            id: 'node-2',
            videoId: 'video-2',
            isStartNode: false,
            isEndNode: true,
            choices: []
          }
        ],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(invalidStory)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Node 1, choice 1 points to non-existent node')
    })

    it('should reject stories with orphaned nodes', () => {
      const invalidStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [
          {
            id: 'node-1',
            videoId: 'video-1',
            isStartNode: true,
            isEndNode: false,
            choices: [
              { id: 'choice-1', text: 'Choice A', nextNodeId: 'node-2' },
              { id: 'choice-2', text: 'Choice B', nextNodeId: 'node-2' }
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
        ],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(invalidStory)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Found 1 unreachable nodes')
    })

    it('should reject end nodes with choices', () => {
      const invalidStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [
          {
            id: 'node-1',
            videoId: 'video-1',
            isStartNode: true,
            isEndNode: false,
            choices: [
              { id: 'choice-1', text: 'Choice A', nextNodeId: 'node-2' },
              { id: 'choice-2', text: 'Choice B', nextNodeId: 'node-2' }
            ]
          },
          {
            id: 'node-2',
            videoId: 'video-2',
            isStartNode: false,
            isEndNode: true,
            choices: [
              { id: 'choice-3', text: 'Invalid choice', nextNodeId: null }
            ]
          }
        ],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(invalidStory)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('End node 2 should not have choices')
    })

    it('should reject choices with empty text', () => {
      const invalidStory: Story = {
        id: 'story-1',
        creatorId: 'user-1',
        title: 'Test Story',
        nodes: [
          {
            id: 'node-1',
            videoId: 'video-1',
            isStartNode: true,
            isEndNode: false,
            choices: [
              { id: 'choice-1', text: '', nextNodeId: 'node-2' },
              { id: 'choice-2', text: 'Choice B', nextNodeId: 'node-2' }
            ]
          },
          {
            id: 'node-2',
            videoId: 'video-2',
            isStartNode: false,
            isEndNode: true,
            choices: []
          }
        ],
        isPublished: false,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = storyService.validateStoryStructure(invalidStory)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Node 1, choice 1 must have text')
    })
  })
})