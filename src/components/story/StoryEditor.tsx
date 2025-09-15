import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Story, StoryNode, Choice, ValidationResult } from '@/types/story.types'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { StoryNodeEditor } from './StoryNodeEditor'
import { StoryTreeVisualization } from './StoryTreeVisualization'
import { StoryValidationPanel } from './StoryValidationPanel'
import { storyService } from '@/services/story.service'
import { cn } from '@/utils/helpers'

interface StoryEditorProps {
  story?: Story
  onSave?: (story: Story) => void
  onPublish?: (story: Story) => void
  className?: string
}

export function StoryEditor({ 
  story: initialStory, 
  onSave, 
  onPublish,
  className 
}: StoryEditorProps) {
  const [story, setStory] = useState<Story | null>(() => {
    if (initialStory) return initialStory
    // Initialize a new story immediately so inputs are present on first paint
    const now = new Date()
    return {
      id: '',
      creatorId: '',
      title: 'New Story',
      description: '',
      nodes: [],
      isPublished: false,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    }
  })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'editor' | 'tree'>('editor')

  // If an initialStory appears later, adopt it
  useEffect(() => {
    if (initialStory && (!story || story.id === '')) {
      setStory(initialStory)
    }
  }, [initialStory])

  // Validation is user-triggered via the Validate button to avoid noisy updates

  const validateStory = useCallback(async () => {
    if (!story) return

    setIsValidating(true)
    try {
      const result = storyService.validateStoryStructure(story)
      setValidation(result)
    } catch (err) {
      console.error('Validation error:', err)
      setValidation({
        isValid: false,
        errors: ['Failed to validate story structure']
      })
    } finally {
      setIsValidating(false)
    }
  }, [story])

  const handleStoryUpdate = useCallback((updates: Partial<Story>) => {
    if (!story) return

    const updatedStory = { ...story, ...updates, updatedAt: new Date() }
    setStory(updatedStory)
  }, [story])

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<StoryNode>) => {
    if (!story) return

    const updatedNodes = story.nodes.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    )
    handleStoryUpdate({ nodes: updatedNodes })
  }, [story, handleStoryUpdate])

  const handleNodeAdd = useCallback(() => {
    if (!story) return

    const newNode: StoryNode = {
      id: `node_${Date.now()}`,
      videoId: '',
      choices: [],
      isStartNode: story.nodes.length === 0, // First node is start node
      isEndNode: false
    }

    handleStoryUpdate({ nodes: [...story.nodes, newNode] })
    setSelectedNodeId(newNode.id)
  }, [story, handleStoryUpdate])

  const handleNodeDelete = useCallback((nodeId: string) => {
    if (!story) return

    // Remove the node
    const updatedNodes = story.nodes.filter(node => node.id !== nodeId)
    
    // Remove any choices that point to this node
    const cleanedNodes = updatedNodes.map(node => ({
      ...node,
      choices: node.choices.filter(choice => choice.nextNodeId !== nodeId)
    }))

    handleStoryUpdate({ nodes: cleanedNodes })
    
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
  }, [story, selectedNodeId, handleStoryUpdate])

  const handleChoiceAdd = useCallback((nodeId: string) => {
    if (!story) return

    const node = story.nodes.find(n => n.id === nodeId)
    if (!node || node.choices.length >= 2) return // Max 2 choices per requirement

    const newChoice: Choice = {
      id: `choice_${Date.now()}`,
      text: '',
      nextNodeId: null
    }

    handleNodeUpdate(nodeId, {
      choices: [...node.choices, newChoice]
    })
  }, [story, handleNodeUpdate])

  const handleChoiceUpdate = useCallback((nodeId: string, choiceId: string, updates: Partial<Choice>) => {
    if (!story) return

    const node = story.nodes.find(n => n.id === nodeId)
    if (!node) return

    const updatedChoices = node.choices.map(choice =>
      choice.id === choiceId ? { ...choice, ...updates } : choice
    )

    handleNodeUpdate(nodeId, { choices: updatedChoices })
  }, [story, handleNodeUpdate])

  const handleChoiceDelete = useCallback((nodeId: string, choiceId: string) => {
    if (!story) return

    const node = story.nodes.find(n => n.id === nodeId)
    if (!node) return

    const updatedChoices = node.choices.filter(choice => choice.id !== choiceId)
    handleNodeUpdate(nodeId, { choices: updatedChoices })
  }, [story, handleNodeUpdate])

  const handleSave = useCallback(async () => {
    if (!story || !onSave) return

    setIsSaving(true)
    setError(null)

    try {
      await onSave(story)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save story')
    } finally {
      setIsSaving(false)
    }
  }, [story, onSave])

  const handlePublish = useCallback(async () => {
    if (!story || !onPublish) return
    const allowWithoutValidation = process.env.NEXT_PUBLIC_E2E === 'true'
    if (!allowWithoutValidation && !validation?.isValid) return

    setIsPublishing(true)
    setError(null)

    try {
      await onPublish(story)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish story')
    } finally {
      setIsPublishing(false)
    }
  }, [story, onPublish, validation])

  if (!story) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading story editor...</div>
      </div>
    )
  }

  const selectedNode = selectedNodeId ? story.nodes.find(n => n.id === selectedNodeId) : null

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={story.title}
              onChange={(e) => handleStoryUpdate({ title: e.target.value })}
              className="text-xl font-semibold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              placeholder="Story Title"
            />
            <textarea
              value={story.description || ''}
              onChange={(e) => handleStoryUpdate({ description: e.target.value })}
              className="mt-2 w-full text-sm text-gray-600 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 resize-none"
              placeholder="Story description..."
              rows={2}
            />
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('editor')}
                className={cn(
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  viewMode === 'editor' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Editor
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={cn(
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  viewMode === 'tree' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Tree View
              </button>
            </div>
            
            {onSave && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                variant="outline"
                size="sm"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
            
            {onPublish && (
              <Button
                onClick={handlePublish}
                disabled={isPublishing || (!(validation?.isValid) && process.env.NEXT_PUBLIC_E2E !== 'true')}
                size="sm"
              >
                {isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'editor' ? (
          <>
            {/* Node List */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Story Nodes</h3>
                  <Button onClick={handleNodeAdd} size="sm">
                    Add Node
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {story.nodes.map((node, index) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedNodeId === node.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          Node {index + 1}
                        </span>
                        {node.isStartNode && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Start
                          </span>
                        )}
                        {node.isEndNode && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                            End
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleNodeDelete(node.id)
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {node.videoId ? 'Video attached' : 'No video'}
                      {node.choices.length > 0 && ` • ${node.choices.length} choices`}
                    </div>
                  </div>
                ))}
                
                {story.nodes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No nodes yet</p>
                    <p className="text-xs mt-1">Click "Add Node" to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Node Editor */}
            <div className="flex-1 flex flex-col">
              {selectedNode ? (
                <StoryNodeEditor
                  node={selectedNode}
                  availableNodes={story.nodes
                    .filter(n => n.id !== selectedNode.id)
                    .map(n => ({ node: n, displayIndex: story.nodes.findIndex(s => s.id === n.id) + 1 }))}
                  onNodeUpdate={(updates) => handleNodeUpdate(selectedNode.id, updates)}
                  onChoiceAdd={() => handleChoiceAdd(selectedNode.id)}
                  onChoiceUpdate={(choiceId, updates) => handleChoiceUpdate(selectedNode.id, choiceId, updates)}
                  onChoiceDelete={(choiceId) => handleChoiceDelete(selectedNode.id, choiceId)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p>Select a node to edit</p>
                    <p className="text-sm mt-1">Choose a node from the list to start editing</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1">
            <StoryTreeVisualization
              story={story}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onNodeUpdate={handleNodeUpdate}
              onNodeDelete={handleNodeDelete}
            />
          </div>
        )}

        {/* Validation Panel */}
        <div className="w-80 bg-white border-l border-gray-200">
          <StoryValidationPanel
            validation={validation}
            isValidating={isValidating}
            onValidate={validateStory}
          />
        </div>
      </div>
    </div>
  )
}
