'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { SignInForm } from '@/components/auth/SignInForm'

export default function SignInPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get('redirectTo') || '/'
  const error = searchParams?.get('error')

  useEffect(() => {
    // Redirect if already authenticated
    if (!loading && user) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        {error && (
          <div className="mb-4 max-w-md mx-auto p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              {error === 'callback_error' && 'Authentication failed. Please try again.'}
              {error === 'no_code' && 'Authentication was cancelled or failed.'}
              {!['callback_error', 'no_code'].includes(error) && 'An error occurred during authentication.'}
            </p>
          </div>
        )}
        
        <SignInForm redirectTo={redirectTo} />
      </div>
    </div>
  )
}