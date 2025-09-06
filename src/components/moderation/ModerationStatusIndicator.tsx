import React from 'react'
import { ModerationResult } from '@/types/moderation.types'

interface ModerationStatusIndicatorProps {
  moderationResult?: ModerationResult | null
  className?: string
  showDetails?: boolean
}

export const ModerationStatusIndicator: React.FC<ModerationStatusIndicatorProps> = ({
  moderationResult,
  className = '',
  showDetails = false
}) => {
  if (!moderationResult) {
    return (
      <div className={`flex items-center text-gray-500 text-sm ${className}`}>
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Pending review
      </div>
    )
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          label: 'Approved'
        }
      case 'flagged':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          label: moderationResult.reviewRequired ? 'Under Review' : 'Flagged'
        }
      case 'rejected':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          label: 'Rejected'
        }
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Unknown'
        }
    }
  }

  const config = getStatusConfig(moderationResult.status)

  if (!showDetails) {
    return (
      <div className={`flex items-center ${config.color} text-sm ${className}`}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </div>
    )
  }

  return (
    <div className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className={`flex items-center ${config.color} text-sm font-medium mb-2`}>
        {config.icon}
        <span className="ml-1">Moderation Status: {config.label}</span>
      </div>
      
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          <strong>Confidence:</strong> {(moderationResult.confidence * 100).toFixed(1)}%
        </p>
        <p>
          <strong>Scanned:</strong> {moderationResult.scanTimestamp.toLocaleString()}
        </p>
        <p>
          <strong>Provider:</strong> {moderationResult.provider}
        </p>
        
        {moderationResult.categories.length > 0 && (
          <p>
            <strong>Categories:</strong> {moderationResult.categories.join(', ')}
          </p>
        )}
        
        {moderationResult.reviewRequired && (
          <p className="text-yellow-600 font-medium">
            Manual review required
          </p>
        )}
      </div>
    </div>
  )
}