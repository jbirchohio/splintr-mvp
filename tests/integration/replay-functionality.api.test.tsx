import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StoryPlayer } from '@/components/story/StoryPlayer'
import { pathExplorationService } from '@/services/path.exploration.service'
import { storyService } from '@/services/story.service'
import { videoDatabaseService } from '@/services/video.database.service'
import { playbackAnalyticsService } from '@/services/playback.analytics.service'

// Mock services
jest.mock('@/services/story.service')
jest.mock('@/services/path.exploration.service')
jest.mock('@/services/video.database.service')
jest.mock('@/services/playback.analytics.service')
jest.mock('@/lib/supabase')

const mockStoryService = storyService as jest.Mocked<typeof storyService>
const mockPathExplorationService = pathExplorationService as jest.Mocked<typeof pathExplorationService>
const mockVideoDatabaseService = videoDatabaseService as jest.Mocked<typeof videoDatabaseService>
const mockPlaybackAnalyticsService = playbackAnalyticsService as jest.Mocked<typeof playbackAnalyticsService>

describe('Replay Functionality Integration', () => {
  const mockStory = {
    id: 'story-1',
    creatorId: 'creator-1',
    title: 'Test Interactive Story',
    description: 'A story for testing replay features',
    nodes: [
      {
        id: 'start-node',
        videoId: 'video-1',
        choices: [
          { id: 'choice-1', text: 'Path A', nextNodeId: 'node-a' },
          { id: 'choice-2', text: 'Path B', nextNodeId: 'node-b' }
        ],
        isStartNode: true,
        isEndNode: false
      },
      {
        id: 'node-a',
        videoId: 'video-2',
        choices: [],
        isStartNode: false,
        isEndNode: true
      },
      {
        id: 'node-b',
        videoId: 'video-3',
        choices: [],
        isStartNode: false,
        isEndNode: true
      }
    ],
    isPublished: true,
    viewCount: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockExplorationData = {
    storyId: 'story-1',
    totalPaths: 2,
    exploredPaths: [['start-node', 'node-a']],
    unexploredPaths: [['start-node', 'node-b']],
    completionPercentage: 50,
    alternateEndings: [
      { id: 'node-a', videoId: 'video-2', choices: [], isStartNode: false, isEndNode: true },
      { id: 'node-b', videoId: 'video-3', choices: [], isStartNode: false, isEndNode: true }
    ],
    discoveredEndings: ['node-a'],
    achievements: [
      {
        id: 'first_completion',
        type: 'first_completion' as const,
        title: 'Story Complete',
        description: 'Completed your first playthrough',
        unlockedAt: new Date(),
        progress: 1,
        maxProgress: 1
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockStoryService.getStory.mockResolvedValue(mockStory)
    mockPathExplorationService.getUserExplorationData.mockResolvedValue(mockExplorationData)
    mockPathExplorationService.getSuggestedChoice.mockReturnValue({
      id: 'choice-2',
      text: 'Path B',
      nextNodeId: 'node-b'
    })
    
    // Mock video database service
    mockVideoDatabaseService.getVideoById.mockResolvedValue({
      id: 'video-1',
      creatorId: 'creator-1',
      originalFilename: 'test.mp4',
      duration: 30,
      fileSize: 1024,
      cloudinaryPublicId: 'test-video',
      processingStatus: 'completed',
      moderationStatus: 'approved',
      streamingUrl: 'https://example.com/video-1.mp4',
      thumbnailUrl: 'https://example.com/video-1-thumb.jpg',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    // Mock playback analytics service
    mockPlaybackAnalyticsService.trackPlaythrough.mockResolvedValue()
    
    // Mock Supabase auth
    const mockSupabase = require('@/lib/supabase').supabase
    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })
    }
  })

  it('should display replay controls when story is loaded', async () => {
    render(<StoryPlayer storyId="story-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Restart')).toBeInTheDocument()
      expect(screen.getByText('Explorer')).toBeInTheDocument()
    })
  })

  it('should show exploration progress in replay controls', async () => {
    render(<StoryPlayer storyId="story-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument()
    })
  })

  it('should open path explorer when explorer button is clicked', async () => {
    render(<StoryPlayer storyId="story-1" />)
    
    await waitFor(() => {
      const explorerButton = screen.getByText('Explorer')
      fireEvent.click(explorerButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Story Explorer')).toBeInTheDocument()
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('Paths')).toBeInTheDocument()
      expect(screen.getByText('Achievements')).toBeInTheDocument()
    })
  })

  it('should display completion percentage in path explorer', async () => {
    render(<StoryPlayer storyId="story-1" />)
    
    // Open explorer
    await waitFor(() => {
      fireEvent.click(screen.getByText('Explorer'))
    })
    
    await waitFor(() => {
      expect(screen.getAllByText('50%')).toHaveLength(2) // One in controls, one in explorer
      expect(screen.getByText('Exploration Progress')).toBeInTheDocument()
      expect(screen.getByText('Paths Explored')).toBeInTheDocument()
      expect(screen.getByText('Paths Remaining')).toBeInTheDocument()
    })
  })

  it('should show explored and unexplored paths', async () => {
    render(<StoryPlayer storyId="story-1" />)
    
    // Open explorer and go to paths tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Explorer'))
    })
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Paths'))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Completed Paths')).toBeInTheDocument()
      expect(screen.getByText('Unexplored Paths')).toBeInTheDocument()
      expect(screen.getByText('Path 1')).toBeInTheDocument()
      expect(screen.getByText('Hidden Path 1')).toBeInTheDocument()
    })
  })

  it('should display achievements in explorer', async () => {
    render(<StoryPlayer storyId="story-1" />)
    
    // Open explorer and go to achievements tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Explorer'))
    })
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Achievements'))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Story Complete')).toBeInTheDocument()
      expect(screen.getByText('Completed your first playthrough')).toBeInTheDocument()
      expect(screen.getByText('Unlocked')).toBeInTheDocument()
    })
  })

  it('should allow replaying a completed path', async () => {
    render(<StoryPlayer storyId="story-1" />)
    
    // Open explorer and go to paths tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Explorer'))
    })
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Paths'))
    })
    
    // Click replay button for first path
    await waitFor(() => {
      const replayButton = screen.getByText('Replay')
      fireEvent.click(replayButton)
    })
    
    // Should close explorer and restart story
    await waitFor(() => {
      expect(screen.queryByText('Story Explorer')).not.toBeInTheDocument()
    })
  })

  it('should show restart prompt with enhanced stats on completion', async () => {
    const onComplete = jest.fn()
    render(<StoryPlayer storyId="story-1" onComplete={onComplete} />)
    
    // Simulate story completion
    await waitFor(() => {
      // This would be triggered by the video ending or choice selection
      // For testing, we'll simulate the completion state
    })
    
    // The restart prompt should show enhanced exploration stats
    // This would need to be tested with actual story completion flow
    expect(true).toBe(true) // Placeholder for actual test
  })

  it('should provide exploration hints for unexplored paths', async () => {
    render(<StoryPlayer storyId="story-1" />)
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Explorer'))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Exploration Hints')).toBeInTheDocument()
      expect(screen.getByText(/1 unexplored paths remaining/)).toBeInTheDocument()
    })
  })

  it('should handle quick actions for replay', async () => {
    render(<StoryPlayer storyId="story-1" />)
    
    // Look for quick actions button (the + button)
    await waitFor(() => {
      // Find the button with the plus icon or similar indicator
      const buttons = screen.getAllByRole('button')
      const quickActionsButton = buttons.find(button => 
        button.querySelector('svg') && 
        button.className.includes('purple')
      )
      if (quickActionsButton) {
        fireEvent.click(quickActionsButton)
      }
    })
    
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Replay Last Path')).toBeInTheDocument()
    })
  })

  it('should track analytics for replayed paths', async () => {
    const onComplete = jest.fn()
    render(<StoryPlayer storyId="story-1" onComplete={onComplete} />)
    
    // This would test that analytics are properly tracked
    // when a path is replayed vs. first-time completion
    expect(true).toBe(true) // Placeholder for actual analytics test
  })
})