import { useState, useCallback } from 'react'
import { Story, UpdateStoryRequest } from '@/types/story.types'
import { useAutoSave } from './useAutoSave'

interface UseStoryDraftOptions {
  storyId: string
  autoSaveEnabled?: boolean
  autoSaveDelay?: number
  onError?: (error: Error) => void
}

interface UseStoryDraftReturn {
  isDirty: boolean
  isSaving: boolean
  lastSaved: Date | null
  saveDraft: () => Promise<void>
  autoSaveDraft: (updates: Partial<UpdateStoryRequest>) => void
  updateMetadata: (metadata: { title?: string; description?: string }) => Promise<Story>
  markClean: () => void
}

export const useStoryDraft = ({
  storyId,
  autoSaveEnabled = true,
  autoSaveDelay = 2000,
  onError
}: UseStoryDraftOptions): UseStoryDraftReturn => {
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<Partial<UpdateStoryRequest>>({})

  const performAutoSave = useCallback(async () => {
    if (Object.keys(pendingUpdates).length === 0) return

    try {
      const response = await fetch(`/api/stories/${storyId}/draft`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingUpdates)
      })

      if (response.ok) {
        setLastSaved(new Date())
        setIsDirty(false)
        setPendingUpdates({})
      }
    } catch (error) {
      // Silent fail for auto-save
      console.warn('Auto-save failed:', error)
    }
  }, [storyId, pendingUpdates])

  const { triggerAutoSave, saveNow, isSaving } = useAutoSave({
    delay: autoSaveDelay,
    enabled: autoSaveEnabled && isDirty,
    onSave: performAutoSave,
    onError
  })

  const autoSaveDraft = useCallback((updates: Partial<UpdateStoryRequest>) => {
    setPendingUpdates(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
    triggerAutoSave()
  }, [triggerAutoSave])

  const saveDraft = useCallback(async () => {
    if (Object.keys(pendingUpdates).length === 0) return

    try {
      const response = await fetch(`/api/stories/${storyId}/draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingUpdates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save draft')
      }

      setLastSaved(new Date())
      setIsDirty(false)
      setPendingUpdates({})
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to save draft'))
      throw error
    }
  }, [storyId, pendingUpdates, onError])

  const updateMetadata = useCallback(async (metadata: { title?: string; description?: string }): Promise<Story> => {
    try {
      const response = await fetch(`/api/stories/${storyId}/metadata`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update metadata')
      }

      const updatedStory = await response.json()
      setLastSaved(new Date())
      setIsDirty(false)
      setPendingUpdates({})
      
      return updatedStory
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to update metadata'))
      throw error
    }
  }, [storyId, onError])

  const markClean = useCallback(() => {
    setIsDirty(false)
    setPendingUpdates({})
  }, [])

  return {
    isDirty,
    isSaving,
    lastSaved,
    saveDraft,
    autoSaveDraft,
    updateMetadata,
    markClean
  }
}