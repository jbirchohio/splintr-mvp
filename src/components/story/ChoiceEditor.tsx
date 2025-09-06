import React from 'react'
import { Choice, StoryNode } from '@/types/story.types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'

interface ChoiceEditorProps {
  choice: Choice
  index: number
  availableNodes: StoryNode[]
  onUpdate: (updates: Partial<Choice>) => void
  onDelete: () => void
}

export function ChoiceEditor({
  choice,
  index,
  availableNodes,
  onUpdate,
  onDelete
}: ChoiceEditorProps) {
  const linkedNode = availableNodes.find(node => node.id === choice.nextNodeId)

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">
          Choice {index + 1}
        </h4>
        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>

      {/* Choice Text */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Choice Text
        </label>
        <input
          type="text"
          value={choice.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Enter choice text..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Next Node Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Links to Node
        </label>
        
        {availableNodes.length > 0 ? (
          <select
            value={choice.nextNodeId || ''}
            onChange={(e) => onUpdate({ nextNodeId: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a node...</option>
            {availableNodes.map((node, nodeIndex) => (
              <option key={node.id} value={node.id}>
                Node {nodeIndex + 1}
                {node.isStartNode && ' (Start)'}
                {node.isEndNode && ' (End)'}
                {node.videoId ? ' - Has Video' : ' - No Video'}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-xs text-gray-500 italic">
            No other nodes available. Create more nodes to link to.
          </div>
        )}

        {/* Link Status */}
        {choice.nextNodeId && linkedNode && (
          <div className="mt-2 flex items-center text-xs text-green-600">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Linked to {linkedNode.isStartNode ? 'Start' : linkedNode.isEndNode ? 'End' : 'Middle'} Node
          </div>
        )}

        {choice.nextNodeId && !linkedNode && (
          <div className="mt-2 flex items-center text-xs text-red-600">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Linked node not found
          </div>
        )}

        {!choice.nextNodeId && (
          <div className="mt-2 flex items-center text-xs text-yellow-600">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            No destination selected
          </div>
        )}
      </div>
    </div>
  )
}