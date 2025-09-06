'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function SignOutButton({ className = '', children }: SignOutButtonProps) {
  const { signOut, loading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (loading || isSigningOut) return

    setIsSigningOut(true)
    
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  const isLoading = loading || isSigningOut

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={`
        px-4 py-2 text-sm font-medium
        text-gray-700 hover:text-gray-900
        border border-gray-300 rounded-md
        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
    >
      {children || (isLoading ? 'Signing out...' : 'Sign out')}
    </button>
  )
}