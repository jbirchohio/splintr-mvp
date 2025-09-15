import React, { useEffect, useState } from 'react'
import { StoryEditor } from '@/components/story'
import { Story } from '@/types/story.types'
import { storyService } from '@/services/story.service'

export default function StoryEditorDemo() {
  const [story, setStory] = useState<Story | undefined>(undefined)
  const [message, setMessage] = useState<string>('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handleSave = async (updatedStory: Story) => {
    try {
      setMessage('Saving story...')
      
      if (updatedStory.id) {
        // Update existing story
        const saved = await storyService.updateStory(updatedStory.id, {
          title: updatedStory.title,
          description: updatedStory.description,
          nodes: updatedStory.nodes
        })
        setStory(saved)
        setMessage('Story saved successfully!')
      } else {
        // Create new story
        const saved = await storyService.createStory({
          title: updatedStory.title,
          description: updatedStory.description,
          nodes: updatedStory.nodes.map(node => ({
            videoId: node.videoId,
            choices: node.choices,
            isStartNode: node.isStartNode,
            isEndNode: node.isEndNode
          }))
        })
        setStory(saved)
        setMessage('Story created successfully!')
      }
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save story'}`)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const handlePublish = async (storyToPublish: Story) => {
    try {
      setMessage('Publishing story...')
      
      if (!storyToPublish.id) {
        throw new Error('Story must be saved before publishing')
      }
      
      await storyService.publishStory(storyToPublish.id)
      
      // Refresh story data
      const updated = await storyService.getStory(storyToPublish.id)
      setStory(updated)
      
      setMessage('Story published successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to publish story'}`)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Story Editor Demo
              </h1>
              <p className="text-sm text-gray-600">
                Interactive branching story editor interface
              </p>
            </div>
            
            {message && (
              <div className={`px-4 py-2 rounded-md text-sm ${
                message.includes('Error') 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Story Editor */}
      <div className="h-[calc(100vh-4rem)]">
        {ready && (
          <StoryEditor
            story={story}
            onSave={handleSave}
            onPublish={handlePublish}
          />
        )}
      </div>
    </div>
  )
}
