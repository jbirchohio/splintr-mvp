import { useEffect, useRef, useCallback } from 'react'

interface UseAutoSaveOptions {
  delay?: number
  enabled?: boolean
  onSave: () => Promise<void> | void
  onError?: (error: Error) => void
}

export const useAutoSave = ({
  delay = 2000,
  enabled = true,
  onSave,
  onError
}: UseAutoSaveOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = useRef(false)

  const triggerAutoSave = useCallback(() => {
    if (!enabled || isSavingRef.current) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        isSavingRef.current = true
        await onSave()
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Auto-save failed'))
      } finally {
        isSavingRef.current = false
      }
    }, delay)
  }, [delay, enabled, onSave, onError])

  const cancelAutoSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const saveNow = useCallback(async () => {
    cancelAutoSave()
    
    if (isSavingRef.current) return

    try {
      isSavingRef.current = true
      await onSave()
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Save failed'))
      throw error
    } finally {
      isSavingRef.current = false
    }
  }, [onSave, onError, cancelAutoSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    triggerAutoSave,
    cancelAutoSave,
    saveNow,
    isSaving: isSavingRef.current
  }
}