import { useState, useEffect } from 'react'
import { ModerationResult } from '@/types/moderation.types'
import { clientModerationService } from '@/services/moderation.client.service'

export function useModerationStatus(contentId: string, contentType: 'story' | 'video') {
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contentId) {
      setLoading(false)
      return
    }

    const checkModerationStatus = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await clientModerationService.getModerationStatus(contentId, contentType)
        setModerationResult(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check moderation status')
      } finally {
        setLoading(false)
      }
    }

    checkModerationStatus()
  }, [contentId, contentType])

  const refetch = async () => {
    if (contentId) {
      try {
        setLoading(true)
        setError(null)
        
        const result = await clientModerationService.getModerationStatus(contentId, contentType)
        setModerationResult(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check moderation status')
      } finally {
        setLoading(false)
      }
    }
  }

  return {
    moderationResult,
    loading,
    error,
    refetch
  }
}

export function useContentFlag() {
  const [flagging, setFlagging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const flagContent = async (
    contentId: string,
    contentType: 'story' | 'video' | 'comment',
    reason: string
  ) => {
    try {
      setFlagging(true)
      setError(null)
      
      await clientModerationService.flagContent(contentId, contentType, reason)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag content')
      return false
    } finally {
      setFlagging(false)
    }
  }

  return {
    flagContent,
    flagging,
    error
  }
}