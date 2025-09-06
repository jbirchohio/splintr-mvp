'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/auth/signin',
  fallback 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      // Add current path as redirect parameter
      const currentPath = window.location.pathname
      const redirectUrl = `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
    }
  }, [user, loading, router, redirectTo])

  // Show loading state
  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  // User is authenticated, render children
  return <>{children}</>
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string
    fallback?: React.ReactNode
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute 
        redirectTo={options?.redirectTo}
        fallback={options?.fallback}
      >
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}