import React, { useState } from 'react'
import { StoryNode, Choice } from '@/types/story.types'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { VideoSelector } from './VideoSelector'
import { ChoiceEditor } from './ChoiceEditor'
import { cn } from '@/utils/helpers'

interface StoryNodeEditorProps {
  node: StoryNode
  availableNodes: StoryNode[]
  onNodeUpdate: (updates: Partial<StoryNode>) => void
  onChoiceAdd: () => void
  onChoiceUpdate: (choiceId: string, updates: Partial<Choice>) => void
  onChoiceDelete: (choiceId: string) => void
}

export function StoryNodeEditor({
  node,
  availableNodes,
  onNodeUpdate,
  onChoiceAdd,
  onChoiceUpdate,
  onChoiceDelete
}: StoryNodeEditorProps) {
  const [showVideoSelector, setShowVideoSelector] = useState(false)

  const handleVideoSelect = (videoId: string) => {
    onNodeUpdate({ videoId })
    setShowVideoSelector(false)
  }

  const handleNodeTypeChange = (type: 'start' | 'middle' | 'end') => {
    const updates: Partial<StoryNode> = {
      isStartNode: type === 'start',
      isEndNode: type === 'end'
    }

    // If changing to end node, remove all choices
    if (type === 'end') {
      updates.choices = []
    }

    onNodeUpdate(updates)
  }

  const getNodeType = () => {
    if (node.isStartNode) return 'start'
    if (node.isEndNode) return 'end'
    return 'middle'
  }

  const canAddChoice = node.choices.length < 2 && !node.isEndNode

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Edit Node</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure the video and choices for this story node
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Node Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Node Type
          </label>
          <div className="flex space-x-3">
            {[
              { value: 'start', label: 'Start Node', description: 'First node in the story' },
              { value: 'middle', label: 'Middle Node', description: 'Continues the story' },
              { value: 'end', label: 'End Node', description: 'Ends the story path' }
            ].map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => handleNodeTypeChange(value as 'start' | 'middle' | 'end')}
                className={cn(
                  'flex-1 p-3 rounded-lg border text-left transition-colors',
                  getNodeType() === value
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                )}
              >
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs mt-1 opacity-75">{description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Video Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Video Content
          </label>
          
          {node.videoId ? (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Video Selected</p>
                  <p className="text-xs text-gray-500 mt-1">ID: {node.videoId}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setShowVideoSelector(true)}
                    variant="outline"
                    size="sm"
                  >
                    Change Video
                  </Button>
                  <Button
                    onClick={() => onNodeUpdate({ videoId: '' })}
                    variant="ghost"
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-500 mb-3">
                <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 mb-3">No video selected</p>
              <Button
                onClick={() => setShowVideoSelector(true)}
                variant="outline"
                size="sm"
              >
                Select Video
              </Button>
            </div>
          )}
        </div>

        {/* Choices Section */}
        {!node.isEndNode && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Choices ({node.choices.length}/2)
              </label>
              {canAddChoice && (
                <Button
                  onClick={onChoiceAdd}
                  variant="outline"
                  size="sm"
                >
                  Add Choice
                </Button>
              )}
            </div>

            {node.choices.length > 0 ? (
              <div className="space-y-3">
                {node.choices.map((choice, index) => (
                  <ChoiceEditor
                    key={choice.id}
                    choice={choice}
                    index={index}
                    availableNodes={availableNodes}
                    onUpdate={(updates) => onChoiceUpdate(choice.id, updates)}
                    onDelete={() => onChoiceDelete(choice.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">No choices added yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add up to 2 choices for viewers to select from
                </p>
              </div>
            )}

            {node.choices.length >= 2 && (
              <Alert variant="info" className="mt-3">
                Maximum of 2 choices per node (as per requirements)
              </Alert>
            )}
          </div>
        )}

        {/* End Node Info */}
        {node.isEndNode && (
          <Alert variant="success">
            This is an end node. Viewers will reach a conclusion when they arrive here.
          </Alert>
        )}

        {/* Validation Warnings */}
        {!node.videoId && (
          <Alert variant="warning">
            This node needs a video to be complete.
          </Alert>
        )}

        {!node.isEndNode && node.choices.length === 0 && (
          <Alert variant="warning">
            Non-end nodes should have at least one choice.
          </Alert>
        )}

        {!node.isEndNode && node.choices.length === 1 && (
          <Alert variant="info">
            Consider adding a second choice to give viewers more options.
          </Alert>
        )}
      </div>

      {/* Video Selector Modal */}
      {showVideoSelector && (
        <VideoSelector
          onSelect={handleVideoSelect}
          onClose={() => setShowVideoSelector(false)}
        />
      )}
    </div>
  )
}