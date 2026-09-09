import React, { useEffect, useState, useCallback, useRef } from 'react'
import { VideoPlayer, VideoPlaybackMetric } from './VideoPlayer'
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
import { RecommendationTelemetryService } from '@/services/recommendation-telemetry.service'
import { supabase } from '@/lib/supabase'

const getVideoById = async (videoId: string): Promise<VideoRecord> => {
  try {
    const video = await videoDatabaseService.getVideoById(videoId)
    if (!video) throw new Error('Video not found')

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
  autoStart = true,
  muted,
  paused,
  onVideoLoaded,
  watermark
}: StoryPlayerProps) {
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
  const nodeStartedAtRef = useRef<number>(Date.now())
  const lastCompletedSessionRef = useRef<string | null>(null)
  const replayCountRef = useRef(0)
  const watchMetricRef = useRef<VideoPlaybackMetric | null>(null)
  const lastWatchLabelNodeRef = useRef<string | null>(null)

  const {
    currentAchievement,
    showAchievement,
    hideCurrentAchievement
  } = useAchievementNotifications()

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id)
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (newAchievements.length > 0) {
      newAchievements.forEach(achievement => {
        showAchievement(achievement)
        clearAchievement(achievement.id)
      })
    }
  }, [newAchievements, showAchievement, clearAchievement])

  useEffect(() => {
    nodeStartedAtRef.current = Date.now()
    watchMetricRef.current = null
    lastWatchLabelNodeRef.current = null
  }, [state.currentNodeId])

  useEffect(() => {
    if (!state.currentNode?.videoId) return

    const loadVideo = async () => {
      setVideoLoading(true)
      try {
        const video = await getVideoById(state.currentNode.videoId)
        setCurrentVideo(video)
        try {
          onVideoLoaded?.({ streamingUrl: video.streamingUrl })
        } catch {}
      } catch (error) {
        console.error('Failed to load video:', error)
        onError?.(error as Error)
      } finally {
        setVideoLoading(false)
      }
    }

    loadVideo()
  }, [state.currentNode?.videoId, onError, onVideoLoaded])

  const handlePlaybackMetric = useCallback((metric: VideoPlaybackMetric) => {
    const existing = watchMetricRef.current
    if (!existing || metric.watchMs >= existing.watchMs || metric.completed) {
      watchMetricRef.current = metric
    }
  }, [])

  const recordWatchExit = useCallback((reason: string, completedNode: boolean) => {
    const metric = watchMetricRef.current
    const nodeId = state.currentNodeId
    if (!metric || !nodeId || lastWatchLabelNodeRef.current === nodeId) return

    lastWatchLabelNodeRef.current = nodeId
    const fastSkip = !completedNode && metric.watchMs < 3000 && metric.watchRatio < 0.2

    RecommendationTelemetryService.track({
      storyId,
      action: 'dwell',
      sessionId: state.sessionId,
      metadata: {
        nodeId,
        pathDepth: navigation.currentPath.length,
        watchMs: metric.watchMs,
        durationMs: metric.durationMs,
        watchRatio: metric.watchRatio,
        completedNode,
        playbackCompleted: metric.completed,
        exitReason: reason,
        fastSkip
      }
    })

    if (fastSkip) {
      RecommendationTelemetryService.track({
        storyId,
        action: 'skip',
        sessionId: state.sessionId,
        metadata: {
          nodeId,
          pathDepth: navigation.currentPath.length,
          watchMs: metric.watchMs,
          durationMs: metric.durationMs,
          watchRatio: metric.watchRatio,
          exitReason: reason,
          fastSkip: true
        }
      })
    }
  }, [navigation.currentPath.length, state.currentNodeId, state.sessionId, storyId])

  useEffect(() => {
    if (!state.isComplete || !state.sessionId) return
    if (lastCompletedSessionRef.current === state.sessionId) return
    lastCompletedSessionRef.current = state.sessionId

    recordWatchExit('path_complete', true)
    const analytics = getAnalytics()

    RecommendationTelemetryService.track({
      storyId,
      action: 'path_complete',
      sessionId: state.sessionId,
      metadata: {
        pathDepth: analytics.pathTaken.length,
        totalDurationMs: analytics.totalDuration,
        replayCount: replayCountRef.current
      }
    })

    RecommendationTelemetryService.track({
      storyId,
      action: 'complete',
      sessionId: state.sessionId,
      metadata: {
        pathDepth: analytics.pathTaken.length,
        totalDurationMs: analytics.totalDuration
      }
    })

    if (replayCountRef.current > 0) {
      RecommendationTelemetryService.track({
        storyId,
        action: 'alternate_ending',
        sessionId: state.sessionId,
        metadata: {
          pathDepth: analytics.pathTaken.length,
          discoveredEndings: explorationData?.discoveredEndings.length || 0,
          alternateEndings: explorationData?.alternateEndings.length || 0
        }
      })
    }

    onComplete?.(analytics)
    setShowRestartPrompt(true)
  }, [state.isComplete, state.sessionId, storyId, getAnalytics, onComplete, explorationData, recordWatchExit])

  const handleChoiceSelect = useCallback((choice: Choice) => {
    const currentNode = state.currentNode
    const choiceLatencyMs = Math.max(0, Date.now() - nodeStartedAtRef.current)
    const nextNodeId = choice.nextNodeId || null

    recordWatchExit('choice', true)

    RecommendationTelemetryService.track({
      storyId,
      action: 'choice',
      sessionId: state.sessionId,
      metadata: {
        nodeId: state.currentNodeId,
        choiceId: choice.id,
        nextNodeId,
        choiceLatencyMs,
        pathDepth: navigation.currentPath.length,
        completedNode: true
      }
    })

    RecommendationTelemetryService.track({
      storyId,
      action: 'complete',
      sessionId: state.sessionId,
      metadata: {
        nodeId: state.currentNodeId,
        pathDepth: navigation.currentPath.length,
        completedNode: true,
        terminalNode: Boolean(currentNode?.isEndNode)
      }
    })

    if (nextNodeId) {
      RecommendationTelemetryService.track({
        storyId,
        action: 'continuation',
        sessionId: state.sessionId,
        metadata: {
          nodeId: state.currentNodeId,
          choiceId: choice.id,
          nextNodeId,
          pathDepth: navigation.currentPath.length + 1
        }
      })
    }

    controls.selectChoice(choice.id)
  }, [controls, navigation.currentPath.length, recordWatchExit, state.currentNode, state.currentNodeId, state.sessionId, storyId])

  const handleVideoEnd = useCallback(() => {
    recordWatchExit('video_end', true)

    RecommendationTelemetryService.track({
      storyId,
      action: 'complete',
      sessionId: state.sessionId,
      metadata: {
        nodeId: state.currentNodeId,
        pathDepth: navigation.currentPath.length,
        completedNode: true,
        terminalNode: Boolean(state.currentNode?.isEndNode)
      }
    })

    if (state.currentNode?.isEndNode) {
      const analytics = getAnalytics()
      onComplete?.(analytics)
      setShowRestartPrompt(true)
    }
  }, [recordWatchExit, state.currentNode, state.currentNodeId, state.sessionId, navigation.currentPath.length, storyId, getAnalytics, onComplete])

  const handleRestart = useCallback(() => {
    recordWatchExit('restart', false)
    replayCountRef.current += 1
    RecommendationTelemetryService.track({
      storyId,
      action: 'replay',
      sessionId: state.sessionId,
      metadata: {
        replayMode: 'restart',
        previousPathDepth: navigation.currentPath.length,
        replayCount: replayCountRef.current
      }
    })
    setShowRestartPrompt(false)
    controls.restart()
  }, [controls, navigation.currentPath.length, recordWatchExit, state.sessionId, storyId])

  const handleReplayPath = useCallback((path: string[]) => {
    recordWatchExit('replay_path', false)
    replayCountRef.current += 1
    RecommendationTelemetryService.track({
      storyId,
      action: 'replay',
      sessionId: state.sessionId,
      metadata: {
        replayMode: 'path',
        replayPath: path,
        previousPath: navigation.currentPath,
        replayCount: replayCountRef.current
      }
    })
    setShowRestartPrompt(false)
    setShowPathExplorer(false)
    controls.replayPath(path)
  }, [controls, navigation.currentPath, recordWatchExit, state.sessionId, storyId])

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack && navigation.currentPath.length > 1) {
      recordWatchExit('back_navigation', false)
      const previousNodeId = navigation.currentPath[navigation.currentPath.length - 2]
      controls.goToNode(previousNodeId)
    }
  }, [navigation, controls, recordWatchExit])

  const handleChoiceSuggestion = useCallback((choice: Choice) => {
    controls.selectChoice(choice.id)
  }, [controls])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        <div className="text-center">
          <div className="text-xl mb-4">⚠️</div>
          <div className="text-lg mb-2">Failed to load story</div>
          <div className="text-sm opacity-75 mb-4">{typeof error === 'string' ? error : error instanceof Error ? error.message : 'Unknown error'}</div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors">
            Retry
          </button>
        </div>
      </div>
    )
  }

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
      <VideoPlayer
        videoUrl={currentVideo.streamingUrl}
        choices={state.currentNode?.choices || []}
        onVideoEnd={handleVideoEnd}
        onChoiceSelect={handleChoiceSelect}
        onPlaybackMetric={handlePlaybackMetric}
        autoPlay={autoStart}
        muted={muted}
        externalPaused={paused}
        watermark={watermark}
        enableAR={true}
        showChoices={!state.isComplete}
        className="w-full h-full"
        immersiveMode={true}
        showProgressBar={true}
      />

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

      {showRestartPrompt && explorationData && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transform animate-pulse">
            <div className="text-4xl mb-6 animate-bounce">🎉</div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900">Story Complete!</h3>
            <p className="text-gray-600 mb-2 text-lg">You've reached the end of this path.</p>
            <p className="text-gray-500 mb-8 text-sm">Want to explore different choices and discover new endings?</p>

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
                  <div className="text-xl font-bold text-purple-600">{Math.round(explorationData.completionPercentage)}%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Complete</div>
                </div>
              </div>
            </div>

            {explorationData.unexploredPaths.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-amber-800 text-sm">{explorationData.unexploredPaths.length} more paths to discover.</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button onClick={handleRestart} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                Explore Again
              </button>
              <button onClick={() => setShowPathExplorer(true)} className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transform hover:scale-105 transition-all duration-200">
                View Paths
              </button>
              <button onClick={() => setShowRestartPrompt(false)} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transform hover:scale-105 transition-all duration-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

      {state.story && (
        <StoryInfoOverlay
          story={state.story}
          analytics={getAnalytics()}
          isVisible={showInfoOverlay}
          onClose={() => setShowInfoOverlay(false)}
          onShare={() => {
            console.log('Share story:', state.story?.id)
          }}
        />
      )}

      <AchievementNotification achievement={currentAchievement} onClose={hideCurrentAchievement} />

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
