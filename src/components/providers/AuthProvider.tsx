'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types/auth.types'
import { authService } from '@/services/auth.service'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  initialized: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        if (mounted) {
          setUser(currentUser)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Authentication error')
        }
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      if (mounted) {
        setUser(user)
        setError(null)
        if (!initialized) {
          setLoading(false)
          setInitialized(true)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialized])

  const value: AuthContextType = {
    user,
    loading,
    error,
    initialized
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}