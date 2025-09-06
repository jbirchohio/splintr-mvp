import { useReducer, useEffect, useCallback, useRef, useState } from 'react'
import { 
  PlaybackState, 
  PlaybackAction, 
  PlaybackAnalytics, 
  ChoiceAnalytics,
  PlaybackControls,
  StoryNavigation 
} from '@/types/playback.types'
import { Story, StoryNode, Choice } from '@/types/story.types'
import { storyService } from '@/services/story.service'
import { pathExplorationService, PathExplorationData, Achievement } from '@/services/path.exploration.service'
import { playbackAnalyticsService } from '@/services/playback.analytics.service'

// Generate unique session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Initial playback state
const createInitialState = (): Partial<PlaybackState> => ({
  currentNodeId: '',
  pathTaken: [],
  isPlaying: false,
  isComplete: false,
  sessionId: generateSessionId(),
  startedAt: new Date()
})

// Playback reducer
function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'START_STORY': {
      if (!action.payload?.story) return state
      
      const story = action.payload.story
      const startNode = story.nodes.find(node => node.isStartNode)
      
      if (!startNode) {
        throw new Error('Story has no start node')
      }

      return {
        ...state,
        story,
        currentNodeId: startNode.id,
        currentNode: startNode,
        pathTaken: [startNode.id],
        isPlaying: true,
        isComplete: false,
        startedAt: new Date()
      }
    }

    case 'SELECT_CHOICE': {
      if (!action.payload?.choiceId || !state.story) return state

      const currentNode = state.currentNode
      const selectedChoice = currentNode.choices.find(choice => choice.id === action.payload!.choiceId)
      
      if (!selectedChoice || !selectedChoice.nextNodeId) {
        return state
      }

      const nextNode = state.story.nodes.find(node => node.id === selectedChoice.nextNodeId)
      if (!nextNode) {
        return state
      }

      const newPathTaken = [...state.pathTaken, nextNode.id]
      const isComplete = nextNode.isEndNode

      return {
        ...state,
        currentNodeId: nextNode.id,
        currentNode: nextNode,
        pathTaken: newPathTaken,
        isComplete,
        completedAt: isComplete ? new Date() : undefined
      }
    }

    case 'RESTART_STORY': {
      if (!state.story) return state

      const startNode = state.story.nodes.find(node => node.isStartNode)
      if (!startNode) return state

      return {
        ...state,
        currentNodeId: startNode.id,
        currentNode: startNode,
        pathTaken: [startNode.id],
        isPlaying: true,
        isComplete: false,
        sessionId: generateSessionId(),
        startedAt: new Date(),
        completedAt: undefined
      }
    }

    case 'REPLAY_PATH': {
      if (!action.payload?.path || !state.story) return state

      const path = action.payload.path
      if (path.length === 0) return state

      const startNodeId = path[0]
      const startNode = state.story.nodes.find(node => node.id === startNodeId)
      if (!startNode) return state

      return {
        ...state,
        currentNodeId: startNodeId,
        currentNode: startNode,
        pathTaken: [startNodeId],
        isPlaying: true,
        isComplete: false,
        sessionId: generateSessionId(),
        startedAt: new Date(),
        completedAt: undefined,
        replayPath: path,
        replayIndex: 0
      }
    }

    case 'PAUSE_VIDEO':
      return {
        ...state,
        isPlaying: false
      }

    case 'RESUME_VIDEO':
      return {
        ...state,
        isPlaying: true
      }

    case 'END_STORY':
      return {
        ...state,
        isPlaying: false,
        isComplete: true,
        completedAt: new Date()
      }

    default:
      return state
  }
}

export function useStoryPlayback(storyId: string, userId?: string) {
  const [state, dispatch] = useReducer(playbackReducer, createInitialState() as PlaybackState)
  const [explorationData, setExplorationData] = useState<PathExplorationData | null>(null)
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const choiceAnalyticsRef = useRef<ChoiceAnalytics[]>([])
  const nodeStartTimeRef = useRef<Date>(new Date())
  const previousCompletionsRef = useRef<number>(0)

  // Load story and exploration data on mount
  useEffect(() => {
    if (!storyId) return

    const loadStoryAndExploration = async () => {
      try {
        const [story, exploration] = await Promise.all([
          storyService.getStory(storyId),
          pathExplorationService.getUserExplorationData(storyId, userId)
        ])
        
        dispatch({ type: 'START_STORY', payload: { story } })
        setExplorationData(exploration)
        previousCompletionsRef.current = exploration.exploredPaths.length
      } catch (error) {
        console.error('Failed to load story:', error)
        throw error
      }
    }

    loadStoryAndExploration()
  }, [storyId, userId])

  // Track node start time when current node changes
  useEffect(() => {
    if (state.currentNodeId) {
      nodeStartTimeRef.current = new Date()
    }
  }, [state.currentNodeId])

  // Track completion and check for achievements
  useEffect(() => {
    if (state.isComplete && explorationData && userId) {
      const trackCompletionAndAchievements = async () => {
        try {
          // Track the playthrough
          const analytics = getAnalytics()
          await playbackAnalyticsService.trackPlaythrough(analytics)
          
          // Refresh exploration data to check for new achievements
          const updatedExploration = await pathExplorationService.getUserExplorationData(storyId, userId)
          setExplorationData(updatedExploration)
          
          // Check for new achievements
          const newAchievementCount = updatedExploration.achievements.length
          const previousAchievementCount = explorationData.achievements.length
          
          if (newAchievementCount > previousAchievementCount) {
            const newAchievements = updatedExploration.achievements.slice(previousAchievementCount)
            setNewAchievements(prev => [...prev, ...newAchievements])
          }
        } catch (error) {
          console.error('Failed to track completion:', error)
        }
      }
      
      trackCompletionAndAchievements()
    }
  }, [state.isComplete, explorationData, userId, storyId])

  // Control functions
  const selectChoice = useCallback((choiceId: string) => {
    if (!state.currentNode) return

    const choice = state.currentNode.choices.find(c => c.id === choiceId)
    if (!choice) return

    // Record choice analytics
    const now = new Date()
    const timeToDecision = now.getTime() - nodeStartTimeRef.current.getTime()
    
    const choiceAnalytic: ChoiceAnalytics = {
      nodeId: state.currentNodeId,
      choiceId: choice.id,
      choiceText: choice.text,
      selectedAt: now,
      timeToDecision
    }

    choiceAnalyticsRef.current.push(choiceAnalytic)

    dispatch({ type: 'SELECT_CHOICE', payload: { choiceId } })
  }, [state.currentNode, state.currentNodeId])

  const restart = useCallback(() => {
    // Reset analytics
    choiceAnalyticsRef.current = []
    dispatch({ type: 'RESTART_STORY' })
  }, [])

  const replayPath = useCallback((path: string[]) => {
    // Reset analytics for new playthrough
    choiceAnalyticsRef.current = []
    dispatch({ type: 'REPLAY_PATH', payload: { path } })
  }, [])

  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE_VIDEO' })
  }, [])

  const resume = useCallback(() => {
    dispatch({ type: 'RESUME_VIDEO' })
  }, [])

  const goToNode = useCallback((nodeId: string) => {
    if (!state.story) return

    const targetNode = state.story.nodes.find(node => node.id === nodeId)
    if (!targetNode) return

    // This is a navigation function - update path accordingly
    const newPathTaken = [...state.pathTaken, nodeId]
    
    dispatch({ 
      type: 'SELECT_CHOICE', 
      payload: { 
        choiceId: '', // Not from a choice selection
        nodeId 
      } 
    })
  }, [state.story, state.pathTaken])

  // Get suggested choice for exploration
  const getSuggestedChoice = useCallback((): Choice | null => {
    if (!state.story || !explorationData) return null
    
    return pathExplorationService.getSuggestedChoice(
      state.story, 
      state.currentNodeId, 
      explorationData.exploredPaths
    )
  }, [state.story, state.currentNodeId, explorationData])

  // Clear achievement notification
  const clearAchievement = useCallback((achievementId: string) => {
    setNewAchievements(prev => prev.filter(a => a.id !== achievementId))
  }, [])

  // Generate navigation info
  const navigation: StoryNavigation = {
    canGoBack: state.pathTaken.length > 1,
    canRestart: state.pathTaken.length > 0,
    currentPath: state.pathTaken,
    alternativePaths: explorationData?.unexploredPaths || []
  }

  // Generate analytics data
  const getAnalytics = useCallback((): PlaybackAnalytics => {
    const totalDuration = state.completedAt 
      ? state.completedAt.getTime() - state.startedAt.getTime()
      : Date.now() - state.startedAt.getTime()

    return {
      storyId: state.story?.id || storyId,
      sessionId: state.sessionId,
      pathTaken: state.pathTaken,
      choicesMade: choiceAnalyticsRef.current,
      totalDuration,
      completedAt: state.completedAt,
      isCompleted: state.isComplete
    }
  }, [state, storyId])

  // Control interface
  const controls: PlaybackControls = {
    play: resume,
    pause,
    restart,
    selectChoice,
    goToNode,
    replayPath
  }

  return {
    state,
    controls,
    navigation,
    getAnalytics,
    explorationData,
    newAchievements,
    getSuggestedChoice,
    clearAchievement,
    isLoading: !state.story || !explorationData,
    error: null as string | Error | null // Could be enhanced with error state
  }
}