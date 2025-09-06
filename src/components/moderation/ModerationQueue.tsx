import React, { useState, useEffect } from 'react'
import { ModerationQueueItem, ContentFlag } from '@/types/moderation.types'
import { clientModerationService } from '@/services/moderation.client.service'

interface ModerationQueueProps {
  className?: string
}

export const ModerationQueue: React.FC<ModerationQueueProps> = ({ className = '' }) => {
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null)

  useEffect(() => {
    loadQueue()
  }, [])

  const loadQueue = async () => {
    try {
      setLoading(true)
      const items = await clientModerationService.getModerationQueue(50)
      setQueueItems(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load moderation queue')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (flagId: string, decision: 'approve' | 'reject', notes?: string) => {
    try {
      await clientModerationService.reviewFlaggedContent(flagId, decision, notes)
      // Refresh the queue
      await loadQueue()
      setSelectedItem(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review content')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600'
      case 'flagged': return 'text-red-600'
      case 'rejected': return 'text-red-800'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className={`flex justify-center items-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-md ${className}`}>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadQueue}
          className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Moderation Queue ({queueItems.length})
            </h2>
            <button
              onClick={loadQueue}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {queueItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No items in moderation queue
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {queueItems.map((item) => (
              <div key={item.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {item.contentType.toUpperCase()} - {item.contentId}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                        {item.priority} priority
                      </span>
                      {item.moderationResult && (
                        <span className={`text-sm font-medium ${getStatusColor(item.moderationResult.status)}`}>
                          {item.moderationResult.status}
                        </span>
                      )}
                    </div>

                    {item.moderationResult && (
                      <div className="mb-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>AI Scan:</strong> {item.moderationResult.provider} 
                          (confidence: {(item.moderationResult.confidence * 100).toFixed(1)}%)
                        </p>
                        {item.moderationResult.categories.length > 0 && (
                          <p className="text-sm text-gray-600">
                            <strong>Categories:</strong> {item.moderationResult.categories.join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      {item.flags.map((flag) => (
                        <div key={flag.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-gray-800">
                            <strong>Reason:</strong> {flag.reason}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Reported {new Date(flag.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ml-4 flex space-x-2">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedItem && (
        <ReviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onReview={handleReview}
        />
      )}
    </div>
  )
}

interface ReviewModalProps {
  item: ModerationQueueItem
  onClose: () => void
  onReview: (flagId: string, decision: 'approve' | 'reject', notes?: string) => Promise<void>
}

const ReviewModal: React.FC<ReviewModalProps> = ({ item, onClose, onReview }) => {
  const [decision, setDecision] = useState<'approve' | 'reject' | ''>('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!decision) return

    setIsSubmitting(true)
    try {
      // Review all flags for this item
      for (const flag of item.flags) {
        await onReview(flag.id, decision, notes)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Review Content
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Content ID:</strong> {item.contentId}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Type:</strong> {item.contentType}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            <strong>Priority:</strong> {item.priority}
          </p>

          {item.moderationResult && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <h3 className="font-medium text-gray-900 mb-2">AI Moderation Result</h3>
              <p className="text-sm text-gray-600">
                Status: <span className={item.moderationResult?.status === 'approved' ? 'text-green-600' : 
                  item.moderationResult?.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}>
                  {item.moderationResult?.status || 'pending'}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Confidence: {(item.moderationResult.confidence * 100).toFixed(1)}%
              </p>
              {item.moderationResult.categories.length > 0 && (
                <p className="text-sm text-gray-600">
                  Categories: {item.moderationResult.categories.join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">User Reports</h3>
            {item.flags.map((flag) => (
              <div key={flag.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-gray-800">{flag.reason}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(flag.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decision
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="decision"
                  value="approve"
                  checked={decision === 'approve'}
                  onChange={(e) => setDecision(e.target.value as 'approve')}
                  disabled={isSubmitting}
                  className="mr-2 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Approve (content is acceptable)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="decision"
                  value="reject"
                  checked={decision === 'reject'}
                  onChange={(e) => setDecision(e.target.value as 'reject')}
                  disabled={isSubmitting}
                  className="mr-2 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Reject (content violates policies)</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder="Add any notes about this decision..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !decision}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}