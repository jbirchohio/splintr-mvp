'use client'

import { useState, useRef } from 'react'
import { useProfile } from '@/hooks/useProfile'

interface AvatarUploadProps {
  currentAvatar?: string
  onAvatarChange?: (avatarUrl: string) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AvatarUpload({ 
  currentAvatar, 
  onAvatarChange,
  size = 'lg',
  className = '' 
}: AvatarUploadProps) {
  const { uploadAvatar, removeAvatar, isUploadingAvatar, error } = useProfile()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    try {
      await uploadAvatar(file)
      // The hook will update the profile cache, which will trigger onAvatarChange if provided
      if (onAvatarChange) {
        const reader = new FileReader()
        reader.onload = (e) => {
          onAvatarChange(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      }
    } catch (error) {
      setPreviewUrl(null)
      console.error('Avatar upload error:', error)
    }
  }

  const handleRemove = async () => {
    try {
      await removeAvatar()
      setPreviewUrl(null)
      onAvatarChange?.('')
    } catch (error) {
      console.error('Avatar removal error:', error)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const displayAvatar = previewUrl || currentAvatar
  const hasAvatar = Boolean(displayAvatar)

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      {/* Avatar Display */}
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300`}>
        {hasAvatar ? (
          <img
            src={displayAvatar}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        )}

        {/* Loading Overlay */}
        {isUploadingAvatar && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={isUploadingAvatar}
          className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700
                   border border-blue-600 hover:border-blue-700 rounded-md
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors duration-200"
        >
          {hasAvatar ? 'Change' : 'Upload'}
        </button>

        {hasAvatar && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploadingAvatar}
            className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700
                     border border-red-600 hover:border-red-700 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200"
          >
            Remove
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-600 text-center max-w-xs">
          {error}
        </p>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center max-w-xs">
        Upload a photo up to 5MB. JPEG, PNG, WebP, and GIF formats supported.
      </p>
    </div>
  )
}