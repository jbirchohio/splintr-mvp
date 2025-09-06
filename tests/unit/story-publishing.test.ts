import { storyService } from '@/services/story.service'
import { supabase } from '@/lib/supabase'
import { moderationService } from '@/services/moderation.service'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('@/services/moderation.service')

const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockModerationService = moderationService as jest.Mocked<typeof moderationService>

describe('Story Publishing Workflow', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  const mockStory = {
    id: 'story-123',
    creator_id: 'user-123',
    title: 'Test Story',
    description: 'Test description',
    story_data: {
      nodes: [
        {
          id: 'node-1',
          videoId: 'video-1',
          isStartNode: true,
          isEndNode: false,
          choices: [
            { id: 'choice-1', text: 'Choice 1', nextNodeId: 'node-2' },
            { id: 'choice-2', text: 'Choice 2', nextNodeId: 'node-3' }
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
    view_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })

  describe('saveDraft', () => {
    it('should save story as draft without publishing', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { creator_id: 'user-123' },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockStory, is_published: false },
                error: null
              })
            })
          })
        })
      } as any)

      const result = await storyService.saveDraft('story-123', {
        title: 'Updated Title',
        description: 'Updated description'
      })

      expect(result.isPublished).toBe(false)
      expect(mockSupabase.from).toHaveBeenCalledWith('stories')
    })

    it('should throw error if user does not own story', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { creator_id: 'other-user' },
              error: null
            })
          })
        })
      } as any)

      await expect(
        storyService.saveDraft('story-123', { title: 'Updated Title' })
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('autoSaveDraft', () => {
    it('should silently save draft without throwing errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { creator_id: 'user-123', is_published: false },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      } as any)

      // Should not throw even if there are issues
      await expect(
        storyService.autoSaveDraft('story-123', { title: 'Auto-saved title' })
      ).resolves.toBeUndefined()
    })

    it('should not auto-save published stories', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { creator_id: 'user-123', is_published: true },
              error: null
            })
          })
        }),
        update: mockUpdate
      } as any)

      await storyService.autoSaveDraft('story-123', { title: 'Should not save' })

      // Should not call update for published stories
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('getStoryPreview', () => {
    it('should return complete preview data for valid story', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockStory,
              error: null
            })
          })
        })
      } as any)

      mockModerationService.scanText.mockResolvedValue({
        contentId: 'story-123',
        contentType: 'text',
        status: 'approved',
        confidence: 0.1,
        categories: [],
        reviewRequired: false,
        scanTimestamp: new Date(),
        provider: 'openai'
      })

      const preview = await storyService.getStoryPreview('story-123')

      expect(preview.story.id).toBe('story-123')
      expect(preview.validation.isValid).toBe(true)
      expect(preview.moderationStatus?.status).toBe('approved')
      expect(preview.isReadyToPublish).toBe(true)
    })

    it('should return not ready to publish for invalid story', async () => {
      const invalidStory = {
        ...mockStory,
        story_data: {
          nodes: [
            {
              id: 'node-1',
              videoId: 'video-1',
              isStartNode: true,
              isEndNode: false,
              choices: [] // Invalid: non-end node with no choices
            }
          ]
        }
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: invalidStory,
              error: null
            })
          })
        })
      } as any)

      const preview = await storyService.getStoryPreview('story-123')

      expect(preview.validation.isValid).toBe(false)
      expect(preview.isReadyToPublish).toBe(false)
    })

    it('should handle moderation failures gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockStory,
              error: null
            })
          })
        })
      } as any)

      mockModerationService.scanText.mockRejectedValue(new Error('Moderation API error'))

      const preview = await storyService.getStoryPreview('story-123')

      expect(preview.validation.isValid).toBe(true)
      expect(preview.isReadyToPublish).toBe(false) // Should be false due to moderation failure
    })
  })

  describe('publishStory', () => {
    it('should publish valid story that passes moderation', async () => {
      // Mock getStory
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockStory,
              error: null
            })
          })
        })
      } as any)

      // Mock updateStory calls
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { creator_id: 'user-123' },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockStory, is_published: true },
                error: null
              })
            })
          })
        })
      } as any)

      mockModerationService.scanText.mockResolvedValue({
        contentId: 'story-123',
        contentType: 'text',
        status: 'approved',
        confidence: 0.1,
        categories: [],
        reviewRequired: false,
        scanTimestamp: new Date(),
        provider: 'openai'
      })

      await expect(storyService.publishStory('story-123')).resolves.toBeUndefined()
    })

    it('should reject publishing story with validation errors', async () => {
      const invalidStory = {
        ...mockStory,
        story_data: { nodes: [] } // Invalid: no nodes
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: invalidStory,
              error: null
            })
          })
        })
      } as any)

      await expect(storyService.publishStory('story-123')).rejects.toThrow('Cannot publish story')
    })

    it('should reject publishing story that fails moderation', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockStory,
              error: null
            })
          })
        })
      } as any)

      mockModerationService.scanText.mockResolvedValue({
        contentId: 'story-123',
        contentType: 'text',
        status: 'rejected',
        confidence: 0.9,
        categories: ['inappropriate-content'],
        reviewRequired: false,
        scanTimestamp: new Date(),
        provider: 'openai'
      })

      await expect(storyService.publishStory('story-123')).rejects.toThrow('violates community guidelines')
    })
  })
})