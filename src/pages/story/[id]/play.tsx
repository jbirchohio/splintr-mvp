import React from 'react'
import { useRouter } from 'next/router'
import { StoryPlayer } from '@/components/story/StoryPlayer'
import { PlaybackAnalytics } from '@/types/playback.types'
import { playbackAnalyticsService } from '@/services/playback.analytics.service'

export default function StoryPlayPage() {
  const router = useRouter()
  const { id } = router.query

  const handleStoryComplete = async (analytics: PlaybackAnalytics) => {
    try {
      // Track the playthrough analytics
      await playbackAnalyticsService.trackPlaythrough(analytics)
      
      console.log('Story completed:', {
        storyId: analytics.storyId,
        pathTaken: analytics.pathTaken,
        totalDuration: analytics.totalDuration,
        choicesMade: analytics.choicesMade.length
      })
    } catch (error) {
      console.error('Failed to track story completion:', error)
    }
  }

  const handleStoryError = (error: Error) => {
    console.error('Story playback error:', error)
    
    // Could show error toast or redirect to error page
    // For now, just log the error
  }

  const handleGoBack = () => {
    router.back()
  }

  if (!id || typeof id !== 'string') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-xl mb-4">⚠️</div>
          <div className="text-lg">Invalid story ID</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Back Button */}
      <button
        onClick={handleGoBack}
        className="absolute top-4 left-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
        title="Go back"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Story Player */}
      <div className="w-full h-screen">
        <StoryPlayer
          storyId={id}
          onComplete={handleStoryComplete}
          onError={handleStoryError}
          autoStart={true}
        />
      </div>
    </div>
  )
}

// Optional: Add getServerSideProps for SEO and initial data loading
export async function getServerSideProps(context: { params: { id: string } }) {
  const { id } = context.params

  // Could pre-fetch story data here for better performance
  // For now, just pass the id
  
  return {
    props: {
      storyId: id
    }
  }
}