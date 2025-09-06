import { Story, StoryNode, Choice } from './story.types'

// Playback state management types
export interface PlaybackState {
  story: Story
  currentNodeId: string
  currentNode: StoryNode
  pathTaken: string[]
  isPlaying: boolean
  isComplete: boolean
  sessionId: string
  startedAt: Date
  completedAt?: Date
  replayPath?: string[]
  replayIndex?: number
}

export interface PlaybackAction {
  type: 'START_STORY' | 'SELECT_CHOICE' | 'RESTART_STORY' | 'REPLAY_PATH' | 'PAUSE_VIDEO' | 'RESUME_VIDEO' | 'END_STORY'
  payload?: {
    story?: Story
    choiceId?: string
    nodeId?: string
    path?: string[]
  }
}

export interface PlaybackAnalytics {
  storyId: string
  sessionId: string
  viewerId?: string
  pathTaken: string[]
  choicesMade: ChoiceAnalytics[]
  totalDuration: number
  completedAt?: Date
  isCompleted: boolean
}

export interface ChoiceAnalytics {
  nodeId: string
  choiceId: string
  choiceText: string
  selectedAt: Date
  timeToDecision: number // milliseconds
}

export interface VideoPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoaded: boolean
  hasError: boolean
  errorMessage?: string
}

export interface ChoiceOverlayProps {
  choices: Choice[]
  onChoiceSelect: (choice: Choice) => void
  isVisible: boolean
  timeRemaining?: number
}

export interface StoryPlayerProps {
  storyId: string
  onComplete?: (analytics: PlaybackAnalytics) => void
  onError?: (error: Error) => void
  autoStart?: boolean
}

export interface PlaybackControls {
  play: () => void
  pause: () => void
  restart: () => void
  selectChoice: (choiceId: string) => void
  goToNode: (nodeId: string) => void
  replayPath: (path: string[]) => void
}

// Navigation and transition types
export interface StoryNavigation {
  canGoBack: boolean
  canRestart: boolean
  currentPath: string[]
  alternativePaths: string[][]
}

export interface TransitionEffect {
  type: 'fade' | 'slide' | 'cut'
  duration: number
  direction?: 'left' | 'right' | 'up' | 'down'
}

// Error types for playback
export interface PlaybackError extends Error {
  code: 'STORY_NOT_FOUND' | 'VIDEO_LOAD_ERROR' | 'INVALID_CHOICE' | 'NETWORK_ERROR'
  nodeId?: string
  videoId?: string
}