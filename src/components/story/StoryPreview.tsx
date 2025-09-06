import React, { useState, useEffect } from 'react'
import { Story, ValidationResult } from '@/types/story.types'
import { ModerationResult } from '@/types/moderation.types'
import { Button } from '@/components/ui/Button'
import { VideoPreview } from '@/components/video/VideoPreview'

interface StoryPreviewData {
  story: Story
  validation: ValidationResult
  moderationStatus?: ModerationResult
  isReadyToPublish: boolean
}

interface StoryPreviewProps {
  storyId: string
  onPublish?: () => void
  onEdit?: () => void
}

export const StoryPreview: React.FC<StoryPreviewProps> = ({
  storyId,
  onPublish,
  onEdit
}) => {
  const [previewData, setPreviewData] = useState<StoryPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0)

  useEffect(() => {
    loadPreview()
  }, [storyId])

  const loadPreview = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/stories/${storyId}/preview`)
      if (!response.ok) {
        throw new Error('Failed to load story preview')
      }

      const data = await response.json()
      setPreviewData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!previewData?.isReadyToPublish) return

    try {
      setPublishing(true)
      setError(null)

      const response = await fetch(`/api/stories/${storyId}/publish`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish story')
      }

      onPublish?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish story')
    } finally {
      setPublishing(false)
    }
  }

  const handleChoiceSelect = (choiceIndex: number) => {
    if (!previewData) return

    const currentNode = previewData.story.nodes[currentNodeIndex]
    const choice = currentNode.choices[choiceIndex]
    
    if (choice.nextNodeId) {
      const nextNodeIndex = previewData.story.nodes.findIndex(
        node => node.id === choice.nextNodeId
      )
      if (nextNodeIndex !== -1) {
        setCurrentNodeIndex(nextNodeIndex)
      }
    }
  }

  const resetPreview = () => {
    const startNodeIndex = previewData?.story.nodes.findIndex(node => node.isStartNode) ?? 0
    setCurrentNodeIndex(startNodeIndex)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button 
          onClick={loadPreview}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!previewData) {
    return (
      <div className="text-center p-8 text-gray-500">
        No preview data available
      </div>
    )
  }

  const { story, validation, moderationStatus, isReadyToPublish } = previewData
  const currentNode = story.nodes[currentNodeIndex]

  return (
    <div className="space-y-6">
      {/* Story Info */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-2xl font-bold mb-2">{story.title}</h2>
        {story.description && (
          <p className="text-gray-600 mb-4">{story.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{story.nodes.length} nodes</span>
          <span>Created {story.createdAt.toLocaleDateString()}</span>
          {story.isPublished && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              Published
            </span>
          )}
        </div>
      </div>

      {/* Validation Status */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-3">Validation Status</h3>
        
        {validation.isValid ? (
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Story structure is valid</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Story has validation errors</span>
            </div>
            <ul className="list-disc list-inside text-sm text-red-600 ml-7">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Moderation Status */}
      {moderationStatus && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-3">Content Moderation</h3>
          
          <div className={`flex items-center gap-2 ${
            moderationStatus.status === 'approved' ? 'text-green-600' :
            moderationStatus.status === 'flagged' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              {moderationStatus.status === 'approved' ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              )}
            </svg>
            <span>
              {moderationStatus.status === 'approved' && 'Content approved'}
              {moderationStatus.status === 'flagged' && 'Content flagged for review'}
              {moderationStatus.status === 'rejected' && 'Content rejected'}
            </span>
          </div>

          {moderationStatus.categories.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              Categories: {moderationStatus.categories.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Interactive Preview */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Interactive Preview</h3>
          <Button onClick={resetPreview} variant="outline" size="sm">
            Reset to Start
          </Button>
        </div>

        {currentNode && (
          <div className="space-y-4">
            {/* Video Preview */}
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Video: {currentNode.videoId}</p>
                </div>
              </div>
            </div>

            {/* Node Info */}
            <div className="text-sm text-gray-600">
              Node {currentNodeIndex + 1} of {story.nodes.length}
              {currentNode.isStartNode && ' (Start)'}
              {currentNode.isEndNode && ' (End)'}
            </div>

            {/* Choices */}
            {!currentNode.isEndNode && currentNode.choices.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Choose your path:</p>
                {currentNode.choices.map((choice, index) => (
                  <Button
                    key={choice.id}
                    onClick={() => handleChoiceSelect(index)}
                    variant="outline"
                    className="w-full text-left justify-start"
                    disabled={!choice.nextNodeId}
                  >
                    {choice.text}
                  </Button>
                ))}
              </div>
            )}

            {currentNode.isEndNode && (
              <div className="text-center py-4">
                <p className="text-lg font-medium text-gray-600">The End</p>
                <Button onClick={resetPreview} className="mt-2">
                  Play Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={onEdit}
          variant="outline"
        >
          Edit Story
        </Button>
        
        <Button
          onClick={handlePublish}
          disabled={!isReadyToPublish || publishing || story.isPublished}
          className="flex-1"
        >
          {publishing ? 'Publishing...' : 
           story.isPublished ? 'Already Published' :
           isReadyToPublish ? 'Publish Story' : 'Cannot Publish'}
        </Button>
      </div>

      {!isReadyToPublish && !story.isPublished && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Your story needs to pass validation and content moderation before it can be published.
          </p>
        </div>
      )}
    </div>
  )
}