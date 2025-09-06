'use client'

import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { authService } from '@/services/auth.service'

interface UseSessionReturn {
  session: Session | null
  loading: boolean
  error: string | null
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      try {
        const currentSession = await authService.getSession()
        if (mounted) {
          setSession(currentSession)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Session error')
          setLoading(false)
        }
      }
    }

    getSession()

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (user) => {
      if (mounted) {
        if (user) {
          const currentSession = await authService.getSession()
          setSession(currentSession)
        } else {
          setSession(null)
        }
        setLoading(false)
        setError(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    session,
    loading,
    error
  }
}