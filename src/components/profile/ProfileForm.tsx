'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { AvatarUpload } from './AvatarUpload'

interface ProfileFormProps {
  onSuccess?: () => void
  className?: string
}

export function ProfileForm({ onSuccess, className = '' }: ProfileFormProps) {
  const { profile, updateProfile, isUpdating, error } = useProfile()
  const [formData, setFormData] = useState({
    name: '',
    avatar: ''
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        avatar: profile.avatar || ''
      })
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError('Name is required')
      return
    }

    try {
      await updateProfile({
        name: formData.name.trim(),
        avatar: formData.avatar
      })
      onSuccess?.()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update profile')
    }
  }

  const handleAvatarChange = (avatarUrl: string) => {
    setFormData(prev => ({ ...prev, avatar: avatarUrl }))
  }

  const displayError = formError || error

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Profile Setup
          </h2>
          <p className="text-gray-600">
            Complete your profile to get started
          </p>
        </div>

        {displayError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{displayError}</p>
          </div>
        )}

        {/* Avatar Upload */}
        <div className="flex justify-center">
          <AvatarUpload
            currentAvatar={formData.avatar}
            onAvatarChange={handleAvatarChange}
          />
        </div>

        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            id="name"
            autoFocus
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your display name"
            required
            maxLength={100}
          />
          <p className="mt-1 text-xs text-gray-500">
            This is how other users will see your name
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUpdating || !formData.name.trim()}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md
                   shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors duration-200"
        >
          {isUpdating ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
