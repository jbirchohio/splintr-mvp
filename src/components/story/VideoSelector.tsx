import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/utils/helpers'

interface Video {
  id: string
  originalFilename: string
  duration: number
  thumbnailUrl?: string
  processingStatus: string
  createdAt: Date
}

interface VideoSelectorProps {
  onSelect: (videoId: string) => void
  onClose: () => void
}

export function VideoSelector({ onSelect, onClose }: VideoSelectorProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/videos')
      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }

      const data = await response.json()
      setVideos(data.videos || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = () => {
    if (selectedVideoId) {
      onSelect(selectedVideoId)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Filter to only show completed videos
  const availableVideos = videos.filter(video => video.processingStatus === 'completed')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Select Video</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading videos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="error">
                {error}
              </Alert>
              <Button
                onClick={fetchVideos}
                variant="outline"
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : availableVideos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 mt-4">No videos available</p>
                <p className="text-sm text-gray-500 mt-1">
                  Upload and process some videos first
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideoId(video.id)}
                    className={cn(
                      'border rounded-lg p-4 cursor-pointer transition-all',
                      selectedVideoId === video.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.originalFilename}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    {/* Video Info */}
                    <div>
                      <h3 className="font-medium text-sm text-gray-900 truncate">
                        {video.originalFilename}
                      </h3>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{formatDuration(video.duration)}</span>
                        <span>{formatDate(video.createdAt)}</span>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {selectedVideoId === video.id && (
                      <div className="mt-3 flex items-center text-blue-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium">Selected</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedVideoId}
          >
            Select Video
          </Button>
        </div>
      </div>
    </div>
  )
}