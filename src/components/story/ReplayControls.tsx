import React, { useState } from 'react'
import { Story, Choice } from '@/types/story.types'
import { PathExplorationData } from '@/services/path.exploration.service'

interface ReplayControlsProps {
  story: Story
  explorationData: PathExplorationData
  currentPath: string[]
  onRestart: () => void
  onReplayPath: (path: string[]) => void
  onShowExplorer: () => void
  onChoiceHint?: (choice: Choice) => void
  className?: string
}

export function ReplayControls({
  story,
  explorationData,
  currentPath,
  onRestart,
  onReplayPath,
  onShowExplorer,
  onChoiceHint,
  className = ''
}: ReplayControlsProps) {
  const [showQuickActions, setShowQuickActions] = useState(false)

  const hasUnexploredPaths = explorationData.unexploredPaths.length > 0
  const hasMultiplePaths = explorationData.exploredPaths.length > 1
  const completionPercentage = Math.round(explorationData.completionPercentage)

  return (
    <div className={`relative ${className}`}>
      {/* Main Replay Button */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onRestart}
          className="flex items-center space-x-2 px-4 py-2 bg-white/90 backdrop-blur-sm 
                   text-gray-800 rounded-full hover:bg-white transition-all duration-200 
                   shadow-lg border border-white/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">Restart</span>
        </button>

        {/* Explorer Button */}
        <button
          onClick={onShowExplorer}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500/90 backdrop-blur-sm 
                   text-white rounded-full hover:bg-blue-600 transition-all duration-200 
                   shadow-lg border border-blue-400/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
          </svg>
          <span className="text-sm font-medium">Explorer</span>
          {completionPercentage < 100 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {completionPercentage}%
            </span>
          )}
        </button>

        {/* Quick Actions Toggle */}
        {(hasUnexploredPaths || hasMultiplePaths) && (
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex items-center justify-center w-10 h-10 bg-purple-500/90 backdrop-blur-sm 
                     text-white rounded-full hover:bg-purple-600 transition-all duration-200 
                     shadow-lg border border-purple-400/20"
          >
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${showQuickActions ? 'rotate-45' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        )}
      </div>

      {/* Quick Actions Dropdown */}
      {showQuickActions && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 
                      min-w-64 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">Quick Actions</h3>
          </div>

          <div className="py-2">
            {/* Replay Last Path */}
            {explorationData.exploredPaths.length > 0 && (
              <button
                onClick={() => {
                  const lastPath = explorationData.exploredPaths[explorationData.exploredPaths.length - 1]
                  onReplayPath(lastPath)
                  setShowQuickActions(false)
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">Replay Last Path</div>
                  <div className="text-xs text-gray-500">
                    {explorationData.exploredPaths[explorationData.exploredPaths.length - 1]?.length} steps
                  </div>
                </div>
              </button>
            )}

            {/* Random Explored Path */}
            {explorationData.exploredPaths.length > 1 && (
              <button
                onClick={() => {
                  const randomIndex = Math.floor(Math.random() * explorationData.exploredPaths.length)
                  onReplayPath(explorationData.exploredPaths[randomIndex])
                  setShowQuickActions(false)
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">Random Path</div>
                  <div className="text-xs text-gray-500">Replay a random explored path</div>
                </div>
              </button>
            )}

            {/* Exploration Hint */}
            {hasUnexploredPaths && (
              <button
                onClick={() => {
                  // This would trigger a hint for unexplored choices
                  setShowQuickActions(false)
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">Get Exploration Hint</div>
                  <div className="text-xs text-gray-500">
                    {explorationData.unexploredPaths.length} paths remaining
                  </div>
                </div>
              </button>
            )}

            {/* Completion Status */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">{completionPercentage}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showQuickActions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowQuickActions(false)}
        />
      )}
    </div>
  )
}