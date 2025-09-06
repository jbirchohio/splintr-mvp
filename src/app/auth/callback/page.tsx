'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get('redirectTo') || '/'
  const error = searchParams?.get('error')

  useEffect(() => {
    if (error) {
      // Redirect to sign-in with error
      router.push(`/auth/signin?error=${error}`)
      return
    }

    if (!loading && user) {
      // Successfully authenticated, redirect to intended destination
      router.push(redirectTo)
    } else if (!loading && !user) {
      // No user found, redirect to sign-in
      router.push('/auth/signin')
    }
  }, [user, loading, router, redirectTo, error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Completing sign in...
        </h2>
        <p className="text-gray-600">
          Please wait while we finish setting up your account.
        </p>
      </div>
    </div>
  )
}