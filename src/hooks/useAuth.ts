'use client'

import { useState, useEffect, useCallback } from 'react'
import { authService } from '@/services/auth.service'
import { User, AuthResult } from '@/types/auth.types'

interface UseAuthReturn {
  user: User | null
  loading: boolean
  error: string | null
  signInWithGoogle: () => Promise<AuthResult>
  signInWithApple: () => Promise<AuthResult>
  signOut: () => Promise<void>
  refreshToken: () => Promise<string>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        if (mounted) {
          setUser(currentUser)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Authentication error')
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      if (mounted) {
        setUser(user)
        setLoading(false)
        setError(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await authService.signInWithGoogle()
      
      if (result.error) {
        setError(result.error)
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google'
      setError(errorMessage)
      return { user: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const signInWithApple = useCallback(async (): Promise<AuthResult> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await authService.signInWithApple()
      
      if (result.error) {
        setError(result.error)
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Apple'
      setError(errorMessage)
      return { user: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      await authService.signOut()
      setUser(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshToken = useCallback(async (): Promise<string> => {
    try {
      return await authService.refreshToken()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh token'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signInWithApple,
    signOut,
    refreshToken
  }
}