'use client'

import { useProfile } from '@/hooks/useProfile'

interface ProfileDisplayProps {
  showEmail?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProfileDisplay({ 
  showEmail = false, 
  size = 'md',
  className = '' 
}: ProfileDisplayProps) {
  const { profile, loading } = useProfile()

  if (loading) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className={`rounded-full bg-gray-200 animate-pulse ${
          size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'
        }`} />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
          {showEmail && <div className="h-3 bg-gray-200 rounded animate-pulse w-32" />}
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const avatarSize = size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'
  const textSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Avatar */}
      <div className={`${avatarSize} rounded-full overflow-hidden bg-gray-200 border border-gray-300`}>
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-gray-900 truncate ${textSize}`}>
          {profile.name}
        </p>
        {showEmail && (
          <p className={`text-gray-500 truncate ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {profile.email}
          </p>
        )}
      </div>
    </div>
  )
}