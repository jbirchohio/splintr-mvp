import { playbackAnalyticsService } from '@/services/playback.analytics.service'
import { PlaybackAnalytics, ChoiceAnalytics } from '@/types/playback.types'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase')
const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('PlaybackAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock auth.getUser
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })
  })

  describe('trackPlaythrough', () => {
    it('should track a completed playthrough', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      const mockRpc = jest.fn().mockResolvedValue({ error: null })
      
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert
      })
      mockSupabase.rpc = mockRpc

      const analytics: PlaybackAnalytics = {
        storyId: 'story-1',
        sessionId: 'session-1',
        viewerId: 'user-1',
        pathTaken: ['node-1', 'node-2'],
        choicesMade: [
          {
            nodeId: 'node-1',
            choiceId: 'choice-1',
            choiceText: 'Go left',
            selectedAt: new Date(),
            timeToDecision: 2500
          }
        ],
        totalDuration: 45000,
        completedAt: new Date(),
        isCompleted: true
      }

      await playbackAnalyticsService.trackPlaythrough(analytics)

      expect(mockInsert).toHaveBeenCalledWith({
        story_id: 'story-1',
        viewer_id: 'user-1',
        session_id: 'session-1',
        path_taken: ['node-1', 'node-2'],
        choices_made: analytics.choicesMade,
        total_duration: 45000,
        completed_at: analytics.completedAt!.toISOString(),
        is_completed: true
      })

      // Should increment view count for completed stories
      expect(mockRpc).toHaveBeenCalledWith('increment_story_views', {
        story_id: 'story-1'
      })
    })

    it('should track incomplete playthrough without incrementing views', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      const mockRpc = jest.fn().mockResolvedValue({ error: null })
      
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert
      })
      mockSupabase.rpc = mockRpc

      const analytics: PlaybackAnalytics = {
        storyId: 'story-1',
        sessionId: 'session-1',
        pathTaken: ['node-1'],
        choicesMade: [],
        totalDuration: 15000,
        isCompleted: false
      }

      await playbackAnalyticsService.trackPlaythrough(analytics)

      expect(mockInsert).toHaveBeenCalled()
      expect(mockRpc).not.toHaveBeenCalled() // Should not increment views
    })

    it('should handle anonymous users', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null
      })
      
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert
      })

      const analytics: PlaybackAnalytics = {
        storyId: 'story-1',
        sessionId: 'session-1',
        pathTaken: ['node-1', 'node-2'],
        choicesMade: [],
        totalDuration: 30000,
        isCompleted: true
      }

      await playbackAnalyticsService.trackPlaythrough(analytics)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          viewer_id: null
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ 
        error: { message: 'Database error' } 
      })
      
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert
      })

      const analytics: PlaybackAnalytics = {
        storyId: 'story-1',
        sessionId: 'session-1',
        pathTaken: ['node-1'],
        choicesMade: [],
        totalDuration: 15000,
        isCompleted: false
      }

      // Should not throw error
      await expect(playbackAnalyticsService.trackPlaythrough(analytics)).resolves.toBeUndefined()
    })
  })

  describe('getStoryAnalytics', () => {
    it('should calculate story analytics correctly', async () => {
      const mockPlaythroughs = [
        {
          id: '1',
          story_id: 'story-1',
          viewer_id: 'user-1',
          path_taken: ['node-1', 'node-2'],
          choices_made: [
            { nodeId: 'node-1', choiceId: 'choice-1', choiceText: 'Left', selectedAt: new Date(), timeToDecision: 2000 }
          ],
          total_duration: 30000,
          is_completed: true,
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          story_id: 'story-1',
          viewer_id: 'user-2',
          path_taken: ['node-1', 'node-3'],
          choices_made: [
            { nodeId: 'node-1', choiceId: 'choice-2', choiceText: 'Right', selectedAt: new Date(), timeToDecision: 1500 }
          ],
          total_duration: 25000,
          is_completed: true,
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          story_id: 'story-1',
          viewer_id: 'user-3',
          path_taken: ['node-1'],
          choices_made: [],
          total_duration: 10000,
          is_completed: false,
          completed_at: null,
          created_at: new Date().toISOString()
        }
      ]

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockPlaythroughs,
          error: null
        })
      })

      mockSupabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      })

      const analytics = await playbackAnalyticsService.getStoryAnalytics('story-1')

      expect(analytics.totalViews).toBe(3)
      expect(analytics.completionRate).toBe(2/3) // 2 completed out of 3 total
      expect(analytics.averageDuration).toBe(21666.666666666668) // Average of 30000, 25000, 10000
      expect(analytics.popularPaths).toEqual([
        ['node-1', 'node-2'],
        ['node-1', 'node-3'],
        ['node-1']
      ])
      expect(analytics.choiceDistribution).toEqual({
        'node-1': {
          'choice-1': 1,
          'choice-2': 1
        }
      })
    })

    it('should handle empty analytics', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      mockSupabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      })

      const analytics = await playbackAnalyticsService.getStoryAnalytics('story-1')

      expect(analytics.totalViews).toBe(0)
      expect(analytics.completionRate).toBe(0)
      expect(analytics.averageDuration).toBe(0)
      expect(analytics.popularPaths).toEqual([])
      expect(analytics.choiceDistribution).toEqual({})
    })
  })

  describe('getUserPlaythroughs', () => {
    it('should fetch user playthroughs with story details', async () => {
      const mockPlaythroughs = [
        {
          id: '1',
          story_id: 'story-1',
          viewer_id: 'user-1',
          path_taken: ['node-1', 'node-2'],
          completed_at: new Date().toISOString(),
          session_id: 'session-1',
          created_at: new Date().toISOString(),
          stories: {
            title: 'Test Story',
            creator_id: 'creator-1',
            thumbnail_url: 'https://example.com/thumb.jpg'
          }
        }
      ]

      const mockLimit = jest.fn().mockResolvedValue({
        data: mockPlaythroughs,
        error: null
      })

      const mockOrder = jest.fn().mockReturnValue({
        limit: mockLimit
      })

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      })

      mockSupabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      })

      const playthroughs = await playbackAnalyticsService.getUserPlaythroughs('user-1', 5)

      expect(mockSelect).toHaveBeenCalledWith(`
          *,
          stories (
            title,
            creator_id,
            thumbnail_url
          )
        `)
      expect(mockEq).toHaveBeenCalledWith('viewer_id', 'user-1')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockLimit).toHaveBeenCalledWith(5)
      expect(playthroughs).toHaveLength(1)
    })
  })

  describe('getRealtimeAnalytics', () => {
    it('should calculate realtime analytics for recent playthroughs', async () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const mockPlaythroughs = [
        {
          id: '1',
          story_id: 'story-1',
          completed_at: null, // Active viewer
          choices_made: [],
          created_at: now.toISOString()
        },
        {
          id: '2',
          story_id: 'story-1',
          completed_at: now.toISOString(), // Recent completion
          choices_made: [
            { nodeId: 'node-1', choiceId: 'choice-1', choiceText: 'Left' }
          ],
          created_at: now.toISOString()
        }
      ]

      const mockGte = jest.fn().mockResolvedValue({
        data: mockPlaythroughs,
        error: null
      })

      const mockEq = jest.fn().mockReturnValue({
        gte: mockGte
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      })

      mockSupabase.from = jest.fn().mockReturnValue({
        select: mockSelect
      })

      const analytics = await playbackAnalyticsService.getRealtimeAnalytics('story-1')

      expect(analytics.activeViewers).toBe(1)
      expect(analytics.recentCompletions).toBe(1)
      expect(analytics.topChoices).toEqual([
        { nodeId: 'node', choiceId: '1', count: 1 }
      ])
    })
  })
})