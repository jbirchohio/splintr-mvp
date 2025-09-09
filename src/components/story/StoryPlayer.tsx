import React, { useEffect, useState, useCallback } from 'react'
import { VideoPlayer } from './VideoPlayer'
import { StoryNavigationControls } from './StoryNavigationControls'
import { StoryInfoOverlay } from './StoryInfoOverlay'
import { ReplayControls } from './ReplayControls'
import { PathHistoryPanel } from './PathHistoryPanel'
import { AchievementNotification, useAchievementNotifications } from './AchievementNotification'
import { useStoryPlayback } from '@/hooks/useStoryPlayback'
import { StoryPlayerProps } from '@/types/playback.types'
import { Choice } from '@/types/story.types'
import { VideoRecord } from '@/types/video.types'
import { videoDatabaseService } from '@/services/video.database.service'
import { supabase } from '@/lib/supabase'

// Get video by ID using the actual service
const getVideoById = async (videoId: string): Promise<VideoRecord> => {
  try {
    const video = await videoDatabaseService.getVideoById(videoId)
    if (!video) {
      throw new Error('Video not found')
    }
    
    // Ensure we have streaming URLs and required fields
    return {
      ...video,
      originalFilename: video.originalFilename || 'unknown',
      streamingUrl: video.streamingUrl || `/api/videos/${videoId}/stream`,
      thumbnailUrl: video.thumbnailUrl || `/api/videos/${videoId}/thumbnail`,
      moderationResult: video.moderationResult as Record<string, unknown> | null | undefined
    }
  } catch (error) {
    console.error('Failed to fetch video:', error)
    throw error
  }
}

export function StoryPlayer({ 
  storyId, 
  onComplete, 
  onError, 
  autoStart = true 
}: StoryPlayerProps) {
  // Get current user for exploration tracking
  const [userId, setUserId] = useState<string | undefined>()
  
  const { 
    state, 
    controls, 
    navigation, 
    getAnalytics, 
    explorationData,
    newAchievements,
    getSuggestedChoice,
    clearAchievement,
    isLoading, 
    error 
  } = useStoryPlayback(storyId, userId)
  
  const [currentVideo, setCurrentVideo] = useState<VideoRecord | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [showRestartPrompt, setShowRestartPrompt] = useState(false)
  const [showInfoOverlay, setShowInfoOverlay] = useState(false)
  const [showPathExplorer, setShowPathExplorer] = useState(false)
  
  // Achievement notifications
  const { 
    currentAchievement, 
    showAchievement, 
    hideCurrentAchievement 
  } = useAchievementNotifications()

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id)
    }
    getCurrentUser()
  }, [])

  // Show achievement notifications
  useEffect(() => {
    if (newAchievements.length > 0) {
      newAchievements.forEach(achievement => {
        showAchievement(achievement)
        clearAchievement(achievement.id)
      })
    }
  }, [newAchievements, showAchievement, clearAchievement])

  // Load video when current node changes
  useEffect(() => {
    if (!state.currentNode?.videoId) return

    const loadVideo = async () => {
      setVideoLoading(true)
      try {
        const video = await getVideoById(state.currentNode.videoId)
        setCurrentVideo(video)
      } catch (error) {
        console.error('Failed to load video:', error)
        onError?.(error as Error)
      } finally {
        setVideoLoading(false)
      }
    }

    loadVideo()
  }, [state.currentNode?.videoId, onError])

  // Handle story completion
  useEffect(() => {
    if (state.isComplete) {
      const analytics = getAnalytics()
      onComplete?.(analytics)
      setShowRestartPrompt(true)
    }
  }, [state.isComplete, getAnalytics, onComplete])

  // Handle choice selection
  const handleChoiceSelect = useCallback((choice: Choice) => {
    controls.selectChoice(choice.id)
  }, [controls])

  // Handle video end (for nodes without choices)
  const handleVideoEnd = useCallback(() => {
    if (state.currentNode?.isEndNode) {
      // End story if this is an end node
      const analytics = getAnalytics()
      onComplete?.(analytics)
      setShowRestartPrompt(true)
    }
  }, [state.currentNode?.isEndNode, getAnalytics, onComplete])

  // Handle restart
  const handleRestart = useCallback(() => {
    setShowRestartPrompt(false)
    controls.restart()
  }, [controls])

  // Handle path replay
  const handleReplayPath = useCallback((path: string[]) => {
    setShowRestartPrompt(false)
    setShowPathExplorer(false)
    controls.replayPath(path)
  }, [controls])

  // Handle back navigation (if implemented)
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack && navigation.currentPath.length > 1) {
      const previousNodeId = navigation.currentPath[navigation.currentPath.length - 2]
      controls.goToNode(previousNodeId)
    }
  }, [navigation, controls])

  // Handle choice suggestion
  const handleChoiceSuggestion = useCallback((choice: Choice) => {
    // Highlight or auto-select the suggested choice
    controls.selectChoice(choice.id)
  }, [controls])

  // Error handling
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        <div className="text-center">
          <div className="text-xl mb-4">⚠️</div>
          <div className="text-lg mb-2">Failed to load story</div>
          <div className="text-sm opacity-75 mb-4">{typeof error === 'string' ? error : error instanceof Error ? error.message : 'Unknown error'}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading || videoLoading || !currentVideo) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-lg">Loading story...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Main Video Player */}
      <VideoPlayer
        videoUrl={currentVideo.streamingUrl}
        choices={state.currentNode?.choices || []}
        onVideoEnd={handleVideoEnd}
        onChoiceSelect={handleChoiceSelect}
        autoPlay={autoStart}
        showChoices={!state.isComplete}
        className="w-full h-full"
        immersiveMode={true}
        showProgressBar={true}
      />

      {/* Enhanced Story Navigation */}
      {state.story && (
        <div className="absolute top-0 left-0 right-0 z-10 p-4">
          <StoryNavigationControls
            story={state.story}
            navigation={navigation}
            onGoBack={handleGoBack}
            onRestart={handleRestart}
            onToggleInfo={() => setShowInfoOverlay(true)}
          />
        </div>
      )}

      {/* Replay Controls */}
      {state.story && explorationData && (
        <div className="absolute top-4 right-4 z-10">
          <ReplayControls
            story={state.story}
            explorationData={explorationData}
            currentPath={navigation.currentPath}
            onRestart={handleRestart}
            onReplayPath={handleReplayPath}
            onShowExplorer={() => setShowPathExplorer(true)}
            onChoiceHint={handleChoiceSuggestion}
          />
        </div>
      )}

      {/* Enhanced Restart Prompt Modal */}
      {showRestartPrompt && explorationData && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transform animate-pulse">
            <div className="text-4xl mb-6 animate-bounce">🎉</div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900">Story Complete!</h3>
            <p className="text-gray-600 mb-2 text-lg">
              You've reached the end of this path.
            </p>
            <p className="text-gray-500 mb-8 text-sm">
              Want to explore different choices and discover new endings?
            </p>
            
            {/* Enhanced Story Stats */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-600">{navigation.currentPath.length}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Steps</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">
                    {explorationData.discoveredEndings.length}/{explorationData.alternateEndings.length}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Endings</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-600">
                    {Math.round(explorationData.completionPercentage)}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Complete</div>
                </div>
              </div>
            </div>

            {/* Exploration Status */}
            {explorationData.unexploredPaths.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-amber-800 text-sm">
                  🗺️ {explorationData.unexploredPaths.length} more paths to discover!
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleRestart}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white 
                         rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 
                         transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                Explore Again
              </button>
              <button
                onClick={() => setShowPathExplorer(true)}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold 
                         hover:bg-green-600 transform hover:scale-105 transition-all duration-200"
              >
                View Paths
              </button>
              <button
                onClick={() => setShowRestartPrompt(false)}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold 
                         hover:bg-gray-200 transform hover:scale-105 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Path Explorer Panel */}
      {state.story && explorationData && (
        <PathHistoryPanel
          story={state.story}
          explorationData={explorationData}
          currentNodeId={state.currentNodeId}
          currentPath={navigation.currentPath}
          onChoiceSuggestion={handleChoiceSuggestion}
          onPathSelect={handleReplayPath}
          isVisible={showPathExplorer}
          onClose={() => setShowPathExplorer(false)}
        />
      )}

      {/* Story Info Overlay */}
      {state.story && (
        <StoryInfoOverlay
          story={state.story}
          analytics={getAnalytics()}
          isVisible={showInfoOverlay}
          onClose={() => setShowInfoOverlay(false)}
          onShare={() => {
            // TODO: Implement sharing functionality
            console.log('Share story:', state.story?.id)
          }}
        />
      )}

      {/* Achievement Notifications */}
      <AchievementNotification
        achievement={currentAchievement}
        onClose={hideCurrentAchievement}
      />

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-sm text-white text-xs p-3 rounded-lg max-w-xs border border-white/20">
          <div className="font-medium mb-2">Debug Info</div>
          <div>Story: {state.story?.title}</div>
          <div>Current Node: {state.currentNodeId}</div>
          <div>Path: {navigation.currentPath.join(' → ')}</div>
          <div>Choices: {state.currentNode?.choices.length || 0}</div>
          <div>Is End: {state.currentNode?.isEndNode ? 'Yes' : 'No'}</div>
          <div>Complete: {state.isComplete ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  )
}