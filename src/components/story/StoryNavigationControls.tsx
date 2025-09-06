import React, { useState } from 'react'
import { StoryNavigation } from '@/types/playback.types'
import { Story } from '@/types/story.types'

interface StoryNavigationControlsProps {
  story: Story
  navigation: StoryNavigation
  onGoBack: () => void
  onRestart: () => void
  onToggleInfo: () => void
  className?: string
}

export function StoryNavigationControls({
  story,
  navigation,
  onGoBack,
  onRestart,
  onToggleInfo,
  className = ''
}: StoryNavigationControlsProps) {
  const [showPathDetails, setShowPathDetails] = useState(false)

  const progressPercentage = (navigation.currentPath.length / story.nodes.length) * 100

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between">
        {/* Story Info */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleInfo}
            className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 
                     hover:bg-black/80 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium text-sm truncate max-w-32 sm:max-w-48">
                {story.title}
              </span>
              <svg 
                className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </button>

          {/* Progress Indicator */}
          <div className="bg-black/60 backdrop-blur-sm px-3 py-2 rounded-full border border-white/20">
            <div className="flex items-center space-x-2">
              <span className="text-white text-xs font-medium">
                {navigation.currentPath.length} / {story.nodes.length}
              </span>
              <div className="w-8 h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex space-x-2">
          {navigation.canGoBack && (
            <button
              onClick={onGoBack}
              className="p-3 bg-black/60 backdrop-blur-sm text-white rounded-full border border-white/20 
                       hover:bg-black/80 hover:scale-110 transition-all duration-200 group"
              title="Go back to previous choice"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          <button
            onClick={onRestart}
            className="p-3 bg-black/60 backdrop-blur-sm text-white rounded-full border border-white/20 
                     hover:bg-black/80 hover:scale-110 transition-all duration-200 group"
            title="Restart story from beginning"
          >
            <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Path Details Toggle */}
          <button
            onClick={() => setShowPathDetails(!showPathDetails)}
            className="p-3 bg-black/60 backdrop-blur-sm text-white rounded-full border border-white/20 
                     hover:bg-black/80 hover:scale-110 transition-all duration-200"
            title="Show path details"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Story Path Visualization */}
      <div className="px-1">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1">
          {navigation.currentPath.map((nodeId, index) => {
            const isCurrentNode = index === navigation.currentPath.length - 1
            const isStartNode = index === 0
            
            return (
              <div key={nodeId} className="flex items-center flex-shrink-0">
                <div 
                  className={`relative transition-all duration-300 ${
                    isCurrentNode 
                      ? 'w-3 h-3 bg-blue-400 scale-125 shadow-lg shadow-blue-400/50' 
                      : isStartNode
                      ? 'w-2.5 h-2.5 bg-green-400'
                      : 'w-2 h-2 bg-white/60'
                  } rounded-full`}
                >
                  {isCurrentNode && (
                    <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75" />
                  )}
                </div>
                {index < navigation.currentPath.length - 1 && (
                  <div className="w-3 h-0.5 bg-gradient-to-r from-white/60 to-white/30 mx-1" />
                )}
              </div>
            )
          })}
          
          {/* Remaining nodes indicator */}
          {navigation.currentPath.length < story.nodes.length && (
            <>
              <div className="w-3 h-0.5 bg-white/20 mx-1" />
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(3, story.nodes.length - navigation.currentPath.length) }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                ))}
                {story.nodes.length - navigation.currentPath.length > 3 && (
                  <span className="text-white/40 text-xs ml-1">+{story.nodes.length - navigation.currentPath.length - 3}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded Path Details */}
      {showPathDetails && (
        <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-white/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium text-sm">Your Journey</h4>
            <button
              onClick={() => setShowPathDetails(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {navigation.currentPath.map((nodeId, index) => {
              const node = story.nodes.find(n => n.id === nodeId)
              return (
                <div key={nodeId} className="flex items-center space-x-3 text-xs">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    index === 0 ? 'bg-green-400' : 
                    index === navigation.currentPath.length - 1 ? 'bg-blue-400' : 'bg-white/60'
                  }`} />
                  <span className="text-white/80">
                    {index === 0 ? 'Started story' : 
                     index === navigation.currentPath.length - 1 ? 'Current position' : 
                     `Step ${index + 1}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}