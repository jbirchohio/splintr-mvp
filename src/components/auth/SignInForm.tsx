'use client'

import { useAuth } from '@/hooks/useAuth'
import { SignInButton } from './SignInButton'

interface SignInFormProps {
  redirectTo?: string
  className?: string
}

export function SignInForm({ redirectTo, className = '' }: SignInFormProps) {
  const { error, loading } = useAuth()

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Splintr
          </h1>
          <p className="text-gray-600">
            Sign in to create and explore interactive stories
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <SignInButton 
            provider="google" 
            disabled={loading}
          />
          <SignInButton 
            provider="apple" 
            disabled={loading}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}