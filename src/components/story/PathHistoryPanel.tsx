import React, { useState, useEffect } from 'react'
import { PathExplorationData, PathAnalysis, Achievement } from '@/services/path.exploration.service'
import { Story, Choice } from '@/types/story.types'

interface PathHistoryPanelProps {
  story: Story
  explorationData: PathExplorationData
  currentNodeId: string
  currentPath: string[]
  onChoiceSuggestion?: (choice: Choice) => void
  onPathSelect?: (path: string[]) => void
  isVisible: boolean
  onClose: () => void
}

export function PathHistoryPanel({
  story,
  explorationData,
  currentNodeId,
  currentPath,
  onChoiceSuggestion,
  onPathSelect,
  isVisible,
  onClose
}: PathHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'progress' | 'paths' | 'achievements'>('progress')
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null)

  if (!isVisible) return null

  const renderProgressTab = () => (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Exploration Progress</h3>
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(explorationData.completionPercentage)}%
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${explorationData.completionPercentage}%` }}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-blue-600">
              {explorationData.exploredPaths.length}
            </div>
            <div className="text-sm text-gray-600">Paths Explored</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-600">
              {explorationData.discoveredEndings.length}
            </div>
            <div className="text-sm text-gray-600">Endings Found</div>
          </div>
          <div>
            <div className="text-xl font-bold text-orange-600">
              {explorationData.unexploredPaths.length}
            </div>
            <div className="text-sm text-gray-600">Paths Remaining</div>
          </div>
        </div>
      </div>

      {/* Current Path */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-3">Current Journey</h4>
        <div className="flex flex-wrap gap-2">
          {currentPath.map((nodeId, index) => {
            const node = story.nodes.find(n => n.id === nodeId)
            const isCurrentNode = nodeId === currentNodeId
            
            return (
              <div key={nodeId} className="flex items-center">
                <div className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${isCurrentNode 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                  }
                `}>
                  Step {index + 1}
                  {node?.isEndNode && ' 🏁'}
                </div>
                {index < currentPath.length - 1 && (
                  <div className="mx-2 text-gray-400">→</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Exploration Hints */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <h4 className="font-semibold text-amber-900 mb-3 flex items-center">
          <span className="mr-2">💡</span>
          Exploration Hints
        </h4>
        {explorationData.unexploredPaths.length > 0 ? (
          <div className="space-y-2">
            <p className="text-amber-800 text-sm">
              You have {explorationData.unexploredPaths.length} unexplored paths remaining.
            </p>
            {explorationData.alternateEndings.length > explorationData.discoveredEndings.length && (
              <p className="text-amber-800 text-sm">
                🎯 Try different choices to discover {explorationData.alternateEndings.length - explorationData.discoveredEndings.length} more ending(s).
              </p>
            )}
          </div>
        ) : (
          <p className="text-green-800 text-sm">
            🎉 Congratulations! You've explored every possible path in this story.
          </p>
        )}
      </div>
    </div>
  )

  const renderPathsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">All Paths</h3>
        <div className="text-sm text-gray-500">
          {explorationData.exploredPaths.length} of {explorationData.totalPaths} explored
        </div>
      </div>

      {/* Explored Paths */}
      {explorationData.exploredPaths.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-green-700 flex items-center">
            <span className="mr-2">✅</span>
            Completed Paths
          </h4>
          {explorationData.exploredPaths.map((path, index) => (
            <div 
              key={index}
              className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => setSelectedPath(path)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-green-700">
                    Path {index + 1}
                  </span>
                  <span className="text-xs text-green-600">
                    {path.length} steps
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onPathSelect?.(path)
                  }}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                >
                  Replay
                </button>
              </div>
              
              {selectedPath === path && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="flex flex-wrap gap-1">
                    {path.map((nodeId, stepIndex) => {
                      const node = story.nodes.find(n => n.id === nodeId)
                      return (
                        <span 
                          key={stepIndex}
                          className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded"
                        >
                          {stepIndex + 1}
                          {node?.isEndNode && ' 🏁'}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Unexplored Paths */}
      {explorationData.unexploredPaths.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 flex items-center">
            <span className="mr-2">🔍</span>
            Unexplored Paths
          </h4>
          {explorationData.unexploredPaths.slice(0, 5).map((path, index) => (
            <div 
              key={index}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    Hidden Path {index + 1}
                  </span>
                  <span className="text-xs text-gray-500">
                    {path.length} steps
                  </span>
                </div>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                  Undiscovered
                </span>
              </div>
            </div>
          ))}
          
          {explorationData.unexploredPaths.length > 5 && (
            <div className="text-center text-sm text-gray-500">
              + {explorationData.unexploredPaths.length - 5} more paths to discover
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderAchievementsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
      
      {explorationData.achievements.length > 0 ? (
        <div className="space-y-3">
          {explorationData.achievements.map((achievement) => (
            <div 
              key={achievement.id}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">🏆</span>
                    <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                  
                  {achievement.progress < achievement.maxProgress && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {achievement.progress >= achievement.maxProgress ? 'Unlocked' : 'In Progress'}
                  </div>
                  {achievement.progress < achievement.maxProgress && (
                    <div className="text-xs text-gray-600">
                      {achievement.progress}/{achievement.maxProgress}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🏆</div>
          <p>Complete the story to unlock achievements!</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Story Explorer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'progress', label: 'Progress', icon: '📊' },
            { id: 'paths', label: 'Paths', icon: '🗺️' },
            { id: 'achievements', label: 'Achievements', icon: '🏆' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'progress' && renderProgressTab()}
          {activeTab === 'paths' && renderPathsTab()}
          {activeTab === 'achievements' && renderAchievementsTab()}
        </div>
      </div>
    </div>
  )
}