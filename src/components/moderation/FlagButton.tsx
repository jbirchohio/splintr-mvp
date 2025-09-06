import React, { useState } from 'react'
import { FlagContentModal } from './FlagContentModal'

interface FlagButtonProps {
  contentId: string
  contentType: 'story' | 'video' | 'comment'
  className?: string
  variant?: 'icon' | 'text' | 'menu-item'
  onFlagSubmitted?: () => void
}

export const FlagButton: React.FC<FlagButtonProps> = ({
  contentId,
  contentType,
  className = '',
  variant = 'icon',
  onFlagSubmitted
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleFlagSubmitted = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
    onFlagSubmitted?.()
  }

  const renderButton = () => {
    const baseClasses = "transition-colors duration-200"
    
    switch (variant) {
      case 'text':
        return (
          <button
            onClick={() => setIsModalOpen(true)}
            className={`${baseClasses} px-3 py-1 text-sm text-gray-600 hover:text-red-600 ${className}`}
          >
            Report
          </button>
        )
      
      case 'menu-item':
        return (
          <button
            onClick={() => setIsModalOpen(true)}
            className={`${baseClasses} w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-red-600 ${className}`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            Report content
          </button>
        )
      
      default: // icon
        return (
          <button
            onClick={() => setIsModalOpen(true)}
            className={`${baseClasses} p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 ${className}`}
            title="Report content"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </button>
        )
    }
  }

  if (showSuccess) {
    return (
      <div className="flex items-center text-green-600 text-sm">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Reported
      </div>
    )
  }

  return (
    <>
      {renderButton()}
      <FlagContentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contentId={contentId}
        contentType={contentType}
        onFlagSubmitted={handleFlagSubmitted}
      />
    </>
  )
}