import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Story } from '@/types/story.types'
import { StoryPublishingWorkflow } from '@/components/story/StoryPublishingWorkflow'

export default function StoryPublishPage() {
  const router = useRouter()
  const { id } = router.query
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || typeof id !== 'string') return

    loadStory(id)
  }, [id])

  const loadStory = async (storyId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/stories/${storyId}`)
      if (!response.ok) {
        throw new Error('Failed to load story')
      }

      const storyData = await response.json()
      setStory({
        ...storyData,
        createdAt: new Date(storyData.createdAt),
        updatedAt: new Date(storyData.updatedAt),
        publishedAt: storyData.publishedAt ? new Date(storyData.publishedAt) : undefined
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load story')
    } finally {
      setLoading(false)
    }
  }

  const handleStoryUpdated = (updatedStory: Story) => {
    setStory(updatedStory)
  }

  const handlePublished = () => {
    // Refresh story data to get published status
    if (id && typeof id === 'string') {
      loadStory(id)
    }
  }

  const handleBack = () => {
    router.push('/create')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading story...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Story</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Story Not Found</h2>
          <p className="text-gray-600 mb-4">The story you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create New Story
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StoryPublishingWorkflow
        story={story}
        onStoryUpdated={handleStoryUpdated}
        onPublished={handlePublished}
        onBack={handleBack}
      />
    </div>
  )
}