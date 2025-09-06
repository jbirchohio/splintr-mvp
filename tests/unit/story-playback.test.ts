import { renderHook, act, waitFor } from '@testing-library/react'
import { useStoryPlayback } from '@/hooks/useStoryPlayback'
import { storyService } from '@/services/story.service'
import { pathExplorationService } from '@/services/path.exploration.service'
import { playbackAnalyticsService } from '@/services/playback.analytics.service'
import { Story, StoryNode } from '@/types/story.types'

// Mock the services
jest.mock('@/services/story.service')
jest.mock('@/services/path.exploration.service')
jest.mock('@/services/playback.analytics.service')
jest.mock('@/lib/supabase')

const mockStoryService = storyService as jest.Mocked<typeof storyService>
const mockPathExplorationService = pathExplorationService as jest.Mocked<typeof pathExplorationService>
const mockPlaybackAnalyticsService = playbackAnalyticsService as jest.Mocked<typeof playbackAnalyticsService>

// Mock story data
const mockStory: Story = {
  id: 'story-1',
  creatorId: 'creator-1',
  title: 'Test Story',
  description: 'A test story',
  nodes: [
    {
      id: 'node-1',
      videoId: 'video-1',
      choices: [
        { id: 'choice-1', text: 'Go left', nextNodeId: 'node-2' },
        { id: 'choice-2', text: 'Go right', nextNodeId: 'node-3' }
      ],
      isStartNode: true,
      isEndNode: false
    },
    {
      id: 'node-2',
      videoId: 'video-2',
      choices: [],
      isStartNode: false,
      isEndNode: true
    },
    {
      id: 'node-3',
      videoId: 'video-3',
      choices: [],
      isStartNode: false,
      isEndNode: true
    }
  ],
  isPublished: true,
  thumbnailUrl: 'https://example.com/thumb.jpg',
  viewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
}

// Mock exploration data
const mockExplorationData = {
  storyId: 'story-1',
  totalPaths: 2,
  exploredPaths: [],
  unexploredPaths: [['node-1', 'node-2'], ['node-1', 'node-3']],
  completionPercentage: 0,
  alternateEndings: [
    { id: 'node-2', videoId: 'video-2', choices: [], isStartNode: false, isEndNode: true },
    { id: 'node-3', videoId: 'video-3', choices: [], isStartNode: false, isEndNode: true }
  ],
  discoveredEndings: [],
  achievements: []
}

describe('useStoryPlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStoryService.getStory.mockResolvedValue(mockStory)
    mockPathExplorationService.getUserExplorationData.mockResolvedValue(mockExplorationData)
    mockPathExplorationService.getSuggestedChoice.mockReturnValue(null)
    mockPlaybackAnalyticsService.trackPlaythrough.mockResolvedValue()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useStoryPlayback('story-1'))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.state.story).toBeUndefined()
    expect(result.current.explorationData).toBeNull()
  })

  it('should load story and start at the start node', async () => {
    const { result } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    expect(mockStoryService.getStory).toHaveBeenCalledWith('story-1')
    expect(mockPathExplorationService.getUserExplorationData).toHaveBeenCalledWith('story-1', undefined)
    expect(result.current.state.story).toEqual(mockStory)
    expect(result.current.state.currentNodeId).toBe('node-1')
    expect(result.current.state.currentNode).toEqual(mockStory.nodes[0])
    expect(result.current.state.pathTaken).toEqual(['node-1'])
    expect(result.current.state.isPlaying).toBe(true)
    expect(result.current.state.isComplete).toBe(false)
    expect(result.current.explorationData).toEqual(mockExplorationData)
  })

  it('should handle choice selection correctly', async () => {
    const { result } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    act(() => {
      result.current.controls.selectChoice('choice-1')
    })

    expect(result.current.state.currentNodeId).toBe('node-2')
    expect(result.current.state.currentNode).toEqual(mockStory.nodes[1])
    expect(result.current.state.pathTaken).toEqual(['node-1', 'node-2'])
    expect(result.current.state.isComplete).toBe(true) // node-2 is an end node
  })

  it('should handle story restart', async () => {
    const { result } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    // Make a choice first
    act(() => {
      result.current.controls.selectChoice('choice-1')
    })

    expect(result.current.state.currentNodeId).toBe('node-2')

    // Restart the story
    act(() => {
      result.current.controls.restart()
    })

    expect(result.current.state.currentNodeId).toBe('node-1')
    expect(result.current.state.pathTaken).toEqual(['node-1'])
    expect(result.current.state.isComplete).toBe(false)
    expect(result.current.state.sessionId).toBeDefined()
  })

  it('should track analytics correctly', async () => {
    const { result } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    // Make a choice
    act(() => {
      result.current.controls.selectChoice('choice-2')
    })

    const analytics = result.current.getAnalytics()

    expect(analytics.storyId).toBe('story-1')
    expect(analytics.pathTaken).toEqual(['node-1', 'node-3'])
    expect(analytics.choicesMade).toHaveLength(1)
    expect(analytics.choicesMade[0].choiceId).toBe('choice-2')
    expect(analytics.choicesMade[0].choiceText).toBe('Go right')
    expect(analytics.isCompleted).toBe(true)
    expect(analytics.completedAt).toBeDefined()
  })

  it('should provide correct navigation state', async () => {
    const { result } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    // Initial state
    expect(result.current.navigation.canGoBack).toBe(false)
    expect(result.current.navigation.canRestart).toBe(true)
    expect(result.current.navigation.currentPath).toEqual(['node-1'])
    expect(result.current.navigation.alternativePaths).toEqual(mockExplorationData.unexploredPaths)

    // After making a choice
    act(() => {
      result.current.controls.selectChoice('choice-1')
    })

    expect(result.current.navigation.canGoBack).toBe(true)
    expect(result.current.navigation.canRestart).toBe(true)
    expect(result.current.navigation.currentPath).toEqual(['node-1', 'node-2'])
  })

  it('should handle pause and resume', async () => {
    const { result } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    expect(result.current.state.isPlaying).toBe(true)

    act(() => {
      result.current.controls.pause()
    })

    expect(result.current.state.isPlaying).toBe(false)

    act(() => {
      result.current.controls.play()
    })

    expect(result.current.state.isPlaying).toBe(true)
  })

  it('should handle invalid choice selection gracefully', async () => {
    const { result } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    const initialNodeId = result.current.state.currentNodeId

    act(() => {
      result.current.controls.selectChoice('invalid-choice-id')
    })

    // Should remain on the same node
    expect(result.current.state.currentNodeId).toBe(initialNodeId)
  })

  it('should generate unique session IDs', async () => {
    const { result: result1 } = renderHook(() => useStoryPlayback('story-1'))
    const { result: result2 } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result1.current.state.story).toBeDefined()
      expect(result1.current.explorationData).toBeDefined()
    })
    
    await waitFor(() => {
      expect(result2.current.state.story).toBeDefined()
      expect(result2.current.explorationData).toBeDefined()
    })

    expect(result1.current.state.sessionId).toBeDefined()
    expect(result2.current.state.sessionId).toBeDefined()
    expect(result1.current.state.sessionId).not.toBe(result2.current.state.sessionId)
  })

  it('should handle path replay functionality', async () => {
    const { result } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    const pathToReplay = ['node-1', 'node-2']

    act(() => {
      result.current.controls.replayPath(pathToReplay)
    })

    expect(result.current.state.currentNodeId).toBe('node-1')
    expect(result.current.state.pathTaken).toEqual(['node-1'])
    expect(result.current.state.isComplete).toBe(false)
    expect(result.current.state.replayPath).toEqual(pathToReplay)
    expect(result.current.state.replayIndex).toBe(0)
  })

  it('should provide suggested choices for exploration', async () => {
    const mockSuggestedChoice = { id: 'choice-2', text: 'Go right', nextNodeId: 'node-3' }
    mockPathExplorationService.getSuggestedChoice.mockReturnValue(mockSuggestedChoice)

    const { result } = renderHook(() => useStoryPlayback('story-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    const suggestion = result.current.getSuggestedChoice()
    expect(suggestion).toEqual(mockSuggestedChoice)
    expect(mockPathExplorationService.getSuggestedChoice).toHaveBeenCalledWith(
      mockStory,
      'node-1',
      mockExplorationData.exploredPaths
    )
  })

  it('should handle achievement notifications', async () => {
    const { result } = renderHook(() => useStoryPlayback('story-1', 'user-1'))

    await waitFor(() => {
      expect(result.current.state.story).toBeDefined()
      expect(result.current.explorationData).toBeDefined()
    })

    expect(result.current.newAchievements).toEqual([])
    expect(typeof result.current.clearAchievement).toBe('function')
  })
})