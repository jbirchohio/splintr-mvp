import React, { useState } from 'react'
import { Story } from '@/types/story.types'
import { Button } from '@/components/ui/Button'
import { StoryPreview } from './StoryPreview'
import { StoryMetadataEditor } from './StoryMetadataEditor'

interface StoryPublishingWorkflowProps {
  story: Story
  onStoryUpdated?: (story: Story) => void
  onPublished?: () => void
  onBack?: () => void
}

type WorkflowStep = 'metadata' | 'preview' | 'published'

export const StoryPublishingWorkflow: React.FC<StoryPublishingWorkflowProps> = ({
  story: initialStory,
  onStoryUpdated,
  onPublished,
  onBack
}) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('metadata')
  const [story, setStory] = useState(initialStory)

  const handleMetadataSave = (metadata: { title: string; description?: string }) => {
    const updatedStory = {
      ...story,
      title: metadata.title,
      description: metadata.description,
      updatedAt: new Date()
    }
    setStory(updatedStory)
    onStoryUpdated?.(updatedStory)
  }

  const handlePublish = () => {
    setCurrentStep('published')
    onPublished?.()
  }

  const handleEditFromPreview = () => {
    setCurrentStep('metadata')
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {/* Step 1: Metadata */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'metadata' 
              ? 'bg-blue-600 text-white' 
              : 'bg-green-600 text-white'
          }`}>
            {currentStep === 'metadata' ? '1' : '✓'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Story Info</span>
        </div>

        {/* Connector */}
        <div className={`w-12 h-0.5 ${
          currentStep === 'preview' || currentStep === 'published' 
            ? 'bg-green-600' 
            : 'bg-gray-300'
        }`} />

        {/* Step 2: Preview */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'preview' 
              ? 'bg-blue-600 text-white'
              : currentStep === 'published'
              ? 'bg-green-600 text-white'
              : 'bg-gray-300 text-gray-600'
          }`}>
            {currentStep === 'published' ? '✓' : '2'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Preview & Publish</span>
        </div>

        {/* Connector */}
        <div className={`w-12 h-0.5 ${
          currentStep === 'published' ? 'bg-green-600' : 'bg-gray-300'
        }`} />

        {/* Step 3: Published */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'published' 
              ? 'bg-green-600 text-white'
              : 'bg-gray-300 text-gray-600'
          }`}>
            {currentStep === 'published' ? '✓' : '3'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Published</span>
        </div>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'metadata':
        return (
          <div className="space-y-6">
            <StoryMetadataEditor
              story={story}
              onSave={handleMetadataSave}
              autoSave={true}
            />
            
            <div className="flex gap-4">
              {onBack && (
                <Button onClick={onBack} variant="outline">
                  Back to Editor
                </Button>
              )}
              
              <Button 
                onClick={() => setCurrentStep('preview')}
                className="flex-1"
              >
                Continue to Preview
              </Button>
            </div>
          </div>
        )

      case 'preview':
        return (
          <StoryPreview
            storyId={story.id}
            onPublish={handlePublish}
            onEdit={handleEditFromPreview}
          />
        )

      case 'published':
        return (
          <div className="text-center space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                Story Published Successfully!
              </h2>
              
              <p className="text-green-700 mb-6">
                "{story.title}" is now live and available for viewers to discover and play.
              </p>

              <div className="bg-white rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Story ID:</span>
                    <span className="ml-2 font-mono text-xs">{story.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Published:</span>
                    <span className="ml-2">{new Date().toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Nodes:</span>
                    <span className="ml-2">{story.nodes.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Views:</span>
                    <span className="ml-2">{story.viewCount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => window.open(`/story/${story.id}`, '_blank')}
                variant="outline"
              >
                View Story
              </Button>
              
              <Button onClick={onBack}>
                Create Another Story
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {currentStep === 'published' ? 'Story Published' : 'Publish Your Story'}
        </h1>
        <p className="text-gray-600">
          {currentStep === 'metadata' && 'Add story information and metadata'}
          {currentStep === 'preview' && 'Preview your story and publish when ready'}
          {currentStep === 'published' && 'Your interactive story is now live'}
        </p>
      </div>

      {renderStepIndicator()}
      {renderCurrentStep()}
    </div>
  )
}