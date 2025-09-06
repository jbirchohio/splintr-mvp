import React, { useState } from 'react'
import { clientModerationService } from '@/services/moderation.client.service'

interface FlagContentModalProps {
  isOpen: boolean
  onClose: () => void
  contentId: string
  contentType: 'story' | 'video' | 'comment'
  onFlagSubmitted?: () => void
}

const flagReasons = [
  'Inappropriate content',
  'Spam or misleading',
  'Harassment or bullying',
  'Violence or dangerous content',
  'Hate speech',
  'Copyright violation',
  'Other'
]

export const FlagContentModal: React.FC<FlagContentModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentType,
  onFlagSubmitted
}) => {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedReason) {
      setError('Please select a reason for flagging this content')
      return
    }

    const reason = selectedReason === 'Other' ? customReason : selectedReason
    
    if (!reason.trim()) {
      setError('Please provide a reason for flagging this content')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await clientModerationService.flagContent(contentId, contentType, reason)
      onFlagSubmitted?.()
      onClose()
      // Reset form
      setSelectedReason('')
      setCustomReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit flag')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setSelectedReason('')
      setCustomReason('')
      setError('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Report Content
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why are you reporting this {contentType}?
            </label>
            <div className="space-y-2">
              {flagReasons.map((reason) => (
                <label key={reason} className="flex items-center">
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    disabled={isSubmitting}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason === 'Other' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please specify:
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={isSubmitting}
                placeholder="Describe the issue..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                rows={3}
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                {customReason.length}/100 characters
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedReason}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}