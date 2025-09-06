import React, { useState, useEffect } from 'react'
import { Story } from '@/types/story.types'
import { PlaybackAnalytics } from '@/types/playback.types'

interface StoryInfoOverlayProps {
  story: Story
  analytics?: PlaybackAnalytics
  isVisible: boolean
  onClose: () => void
  onShare?: () => void
}

export function StoryInfoOverlay({
  story,
  analytics,
  isVisible,
  onClose,
  onShare
}: StoryInfoOverlayProps) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowDetails(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShowDetails(false)
    }
  }, [isVisible])

  if (!isVisible) return null

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
  }

  const getStoryStats = () => {
    const totalNodes = story.nodes.length
    const endNodes = story.nodes.filter(node => node.isEndNode).length
    const choiceNodes = story.nodes.filter(node => node.choices.length > 0).length
    
    return { totalNodes, endNodes, choiceNodes }
  }

  const stats = getStoryStats()

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl transform transition-all duration-300 ${
        showDetails ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{story.title}</h2>
              {story.description && (
                <p className="text-blue-100 text-sm opacity-90">{story.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors ml-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-96">
          
          {/* Story Statistics */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Story Structure</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalNodes}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Total Scenes</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.choiceNodes}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Choices</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.endNodes}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Endings</div>
              </div>
            </div>
          </div>

          {/* Current Session Analytics */}
          {analytics && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Your Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-700">Time Spent</span>
                  <span className="font-medium text-blue-600">
                    {formatDuration(analytics.totalDuration)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-gray-700">Choices Made</span>
                  <span className="font-medium text-purple-600">
                    {analytics.choicesMade.length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-700">Progress</span>
                  <span className="font-medium text-green-600">
                    {Math.round((analytics.pathTaken.length / stats.totalNodes) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Story Metadata */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900">
                  {new Date(story.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="text-gray-900">
                  {new Date(story.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {story.isPublished && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Published
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Elements Preview */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Story Map</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center text-gray-500 text-sm mb-3">
                Explore {stats.endNodes} different ending{stats.endNodes !== 1 ? 's' : ''}
              </div>
              
              {/* Simple story tree visualization */}
              <div className="flex justify-center">
                <div className="space-y-2">
                  {/* Start node */}
                  <div className="flex justify-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  
                  {/* Choice branches */}
                  {stats.choiceNodes > 0 && (
                    <>
                      <div className="flex justify-center">
                        <div className="w-px h-4 bg-gray-300"></div>
                      </div>
                      <div className="flex justify-center space-x-8">
                        {Array.from({ length: Math.min(3, stats.choiceNodes) }).map((_, i) => (
                          <div key={i} className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {/* End nodes */}
                  {stats.endNodes > 0 && (
                    <>
                      <div className="flex justify-center space-x-8">
                        {Array.from({ length: Math.min(3, stats.choiceNodes) }).map((_, i) => (
                          <div key={i} className="w-px h-4 bg-gray-300"></div>
                        ))}
                      </div>
                      <div className="flex justify-center space-x-8">
                        {Array.from({ length: Math.min(3, stats.endNodes) }).map((_, i) => (
                          <div key={i} className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex space-x-3">
            {onShare && (
              <button
                onClick={onShare}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium 
                         hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>Share</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium 
                       hover:bg-gray-300 transition-colors"
            >
              Continue Story
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}