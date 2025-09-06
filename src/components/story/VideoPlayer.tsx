import React, { useRef, useEffect, useState, useCallback } from 'react'
import { VideoPlayerState, TransitionEffect } from '@/types/playback.types'
import { Choice } from '@/types/story.types'

interface VideoPlayerProps {
  videoUrl: string
  choices: Choice[]
  onVideoEnd: () => void
  onChoiceSelect: (choice: Choice) => void
  autoPlay?: boolean
  showChoices?: boolean
  transitionEffect?: TransitionEffect
  className?: string
  showProgressBar?: boolean
  immersiveMode?: boolean
}

export function VideoPlayer({
  videoUrl,
  choices,
  onVideoEnd,
  onChoiceSelect,
  autoPlay = true,
  showChoices = true,
  transitionEffect = { type: 'fade', duration: 300 },
  className = '',
  showProgressBar = true,
  immersiveMode = true
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playerState, setPlayerState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
    hasError: false
  })
  const [showChoiceOverlay, setShowChoiceOverlay] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setPlayerState(prev => ({
        ...prev,
        duration: videoRef.current!.duration,
        isLoaded: true
      }))
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime
      const duration = videoRef.current.duration
      const remaining = duration - currentTime

      setPlayerState(prev => ({
        ...prev,
        currentTime
      }))

      setTimeRemaining(remaining)

      // Show choices in the last 3 seconds if there are choices
      if (choices.length > 0 && remaining <= 3 && remaining > 0) {
        setShowChoiceOverlay(true)
      }
    }
  }, [choices.length])

  const handlePlay = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: true }))
  }, [])

  const handlePause = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: false }))
  }, [])

  const handleEnded = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: false }))
    
    // If no choices, call onVideoEnd immediately
    if (choices.length === 0) {
      onVideoEnd()
    } else {
      // Show choices overlay if not already shown
      setShowChoiceOverlay(true)
    }
  }, [choices.length, onVideoEnd])

  const handleError = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      hasError: true,
      errorMessage: 'Failed to load video'
    }))
  }, [])

  // Choice selection handler
  const handleChoiceClick = useCallback((choice: Choice) => {
    setShowChoiceOverlay(false)
    onChoiceSelect(choice)
  }, [onChoiceSelect])

  // Video control methods
  const play = useCallback(() => {
    videoRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    videoRef.current?.pause()
  }, [])

  // Auto-play when video loads
  useEffect(() => {
    if (playerState.isLoaded && autoPlay && videoRef.current) {
      videoRef.current.play().catch(error => {
        console.warn('Auto-play failed:', error)
        // Auto-play might be blocked by browser policy
      })
    }
  }, [playerState.isLoaded, autoPlay])

  // Reset overlay when video URL changes
  useEffect(() => {
    setShowChoiceOverlay(false)
    setPlayerState(prev => ({
      ...prev,
      isLoaded: false,
      hasError: false,
      errorMessage: undefined
    }))
  }, [videoUrl])

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`w-full h-full object-cover transition-all duration-500 ${
          immersiveMode ? 'scale-105' : 'scale-100'
        }`}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        playsInline
        preload="metadata"
        muted={autoPlay} // Mute for autoplay compliance
      />

      {/* Video Progress Bar */}
      {showProgressBar && playerState.isLoaded && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-30">
          <div 
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ 
              width: `${(playerState.currentTime / playerState.duration) * 100}%` 
            }}
          />
        </div>
      )}

      {/* Immersive Gradient Overlays */}
      {immersiveMode && (
        <>
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </>
      )}

      {/* Loading State with Enhanced Animation */}
      {!playerState.isLoaded && !playerState.hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white mx-auto mb-4"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 animate-pulse"></div>
            </div>
            <div className="text-white text-lg font-medium animate-pulse">Loading video...</div>
          </div>
        </div>
      )}

      {/* Enhanced Error State */}
      {playerState.hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-center max-w-sm mx-4">
            <div className="text-4xl mb-4 animate-bounce">⚠️</div>
            <div className="text-xl font-semibold mb-2">Video Unavailable</div>
            <div className="text-sm opacity-75 mb-6">
              {playerState.errorMessage || 'This video failed to load. Please try again.'}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Choice Overlay */}
      {showChoiceOverlay && showChoices && choices.length > 0 && (
        <ChoiceOverlay
          choices={choices}
          onChoiceSelect={handleChoiceClick}
          timeRemaining={timeRemaining}
          transitionEffect={transitionEffect}
          immersiveMode={immersiveMode}
        />
      )}

      {/* Tap to Play Indicator (for when autoplay fails) */}
      {playerState.isLoaded && !playerState.isPlaying && !showChoiceOverlay && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={play}
        >
          <div className="bg-white/90 rounded-full p-6 transform hover:scale-110 transition-transform">
            <svg className="w-12 h-12 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Video Controls (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-8 left-4 text-white text-xs bg-black/75 p-3 rounded-lg backdrop-blur-sm">
          <div>Time: {playerState.currentTime.toFixed(1)}s / {playerState.duration.toFixed(1)}s</div>
          <div>Playing: {playerState.isPlaying ? 'Yes' : 'No'}</div>
          <div>Choices visible: {showChoiceOverlay ? 'Yes' : 'No'}</div>
          <div>Remaining: {timeRemaining.toFixed(1)}s</div>
        </div>
      )}
    </div>
  )
}

// Enhanced Choice Overlay Component
interface ChoiceOverlayProps {
  choices: Choice[]
  onChoiceSelect: (choice: Choice) => void
  timeRemaining: number
  transitionEffect: TransitionEffect
  immersiveMode?: boolean
}

function ChoiceOverlay({ 
  choices, 
  onChoiceSelect, 
  timeRemaining,
  transitionEffect,
  immersiveMode = true
}: ChoiceOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleChoiceClick = (choice: Choice) => {
    setSelectedChoice(choice.id)
    // Add slight delay for selection animation
    setTimeout(() => onChoiceSelect(choice), 200)
  }

  const getTransitionClasses = () => {
    const duration = `duration-${transitionEffect.duration || 300}`
    
    if (!isVisible) {
      switch (transitionEffect.type) {
        case 'fade':
          return `transition-all ${duration} opacity-0 scale-95`
        case 'slide':
          return `transition-all ${duration} transform translate-y-8 opacity-0`
        default:
          return `transition-all ${duration} opacity-0 scale-95`
      }
    }
    
    return `transition-all ${duration} opacity-100 transform translate-y-0 scale-100`
  }

  const getChoiceButtonClasses = (choice: Choice, index: number) => {
    const baseClasses = `
      w-full p-5 font-semibold rounded-2xl transition-all duration-300
      transform active:scale-95 shadow-2xl
      backdrop-blur-sm border-2
    `
    
    const isSelected = selectedChoice === choice.id
    
    if (immersiveMode) {
      if (isSelected) {
        return `${baseClasses} 
          bg-blue-500 border-blue-400 text-white scale-105
          shadow-blue-500/50`
      }
      return `${baseClasses}
        bg-white/95 hover:bg-white border-white/50 hover:border-white
        text-gray-900 hover:scale-105 hover:shadow-white/20`
    }
    
    // Standard mode
    if (isSelected) {
      return `${baseClasses} bg-blue-600 border-blue-500 text-white scale-105`
    }
    return `${baseClasses} bg-white hover:bg-gray-50 border-gray-200 text-gray-900 hover:scale-102`
  }

  return (
    <div className={`absolute inset-0 flex items-end justify-center ${
      immersiveMode ? 'bg-gradient-to-t from-black/80 via-black/40 to-transparent' : 'bg-black/50'
    }`}>
      <div className={`w-full max-w-lg mx-4 mb-8 ${getTransitionClasses()}`}>
        {/* Enhanced Timer indicator */}
        {timeRemaining > 0 && (
          <div className="text-center mb-6">
            <div className={`text-lg font-medium mb-3 ${
              immersiveMode ? 'text-white drop-shadow-lg' : 'text-white'
            }`}>
              Choose your path
            </div>
            <div className="relative">
              <div className="w-full bg-white/20 rounded-full h-2 backdrop-blur-sm">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    immersiveMode ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white'
                  }`}
                  style={{ width: `${Math.max(0, (timeRemaining / 3) * 100)}%` }}
                />
              </div>
              {timeRemaining <= 1 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* Enhanced Choice Buttons */}
        <div className="space-y-4">
          {choices.map((choice, index) => (
            <button
              key={choice.id}
              onClick={() => handleChoiceClick(choice)}
              className={getChoiceButtonClasses(choice, index)}
              style={{
                animationDelay: `${index * 150}ms`,
                animation: isVisible ? `slideInUp 0.6s ease-out ${index * 150}ms both` : 'none'
              }}
              disabled={selectedChoice !== null}
            >
              <div className="flex items-center justify-between">
                <span className="text-left flex-1">{choice.text}</span>
                {selectedChoice === choice.id && (
                  <div className="ml-3">
                    <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Enhanced completion indicator */}
        {choices.length === 0 && (
          <div className="text-center text-white">
            <div className="text-2xl mb-3 animate-bounce">🎉</div>
            <div className="text-xl font-semibold mb-2">Story Complete!</div>
            <div className="text-sm opacity-75">Tap anywhere to continue</div>
          </div>
        )}
      </div>

      {/* Add CSS keyframes for animations */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}