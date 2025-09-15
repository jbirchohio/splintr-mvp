import React, { useState, useEffect } from 'react'
import { Story } from '@/types/story.types'
import { Button } from '@/components/ui/Button'

interface StoryMetadataEditorProps {
  story: Story
  onSave?: (metadata: { title: string; description?: string }) => void
  onCancel?: () => void
  autoSave?: boolean
  autoSaveDelay?: number
}

export const StoryMetadataEditor: React.FC<StoryMetadataEditorProps> = ({
  story,
  onSave,
  onCancel,
  autoSave = true,
  autoSaveDelay = 2000
}) => {
  const [title, setTitle] = useState(story.title)
  const [description, setDescription] = useState(story.description || '')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  // New: hashtags, scheduling, monetization
  const [tags, setTags] = useState<string>('')
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [isPremium, setIsPremium] = useState<boolean>(false)
  const [tipEnabled, setTipEnabled] = useState<boolean>(false)

  // Auto-save timer
  useEffect(() => {
    if (!autoSave || !hasChanges) return

    const timer = setTimeout(() => {
      handleAutoSave()
    }, autoSaveDelay)

    return () => clearTimeout(timer)
  }, [title, description, hasChanges, autoSave, autoSaveDelay])

  // Track changes
  useEffect(() => {
    const titleChanged = title !== story.title
    const descriptionChanged = description !== (story.description || '')
    setHasChanges(titleChanged || descriptionChanged)
    // Best-effort init for new fields when component mounts
  }, [title, description, story.title, story.description])

  useEffect(() => {
    // initialize scheduling/monetization from story if present
    const anyStory: any = story as any
    if (anyStory.scheduled_publish_at) setScheduledAt(new Date(anyStory.scheduled_publish_at).toISOString().slice(0,16))
    if (typeof anyStory.is_premium === 'boolean') setIsPremium(anyStory.is_premium)
    if (typeof anyStory.tip_enabled === 'boolean') setTipEnabled(anyStory.tip_enabled)
  }, [title, description, story.title, story.description])

  const handleAutoSave = async () => {
    if (!hasChanges || saving) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/stories/${story.id}/draft`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined
        })
      })

      if (response.ok) {
        setLastSaved(new Date())
        setHasChanges(false)
      }
    } catch (err) {
      // Silent fail for auto-save
      console.warn('Auto-save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (title.length > 200) {
      setError('Title cannot exceed 200 characters')
      return
    }

    if (description.length > 1000) {
      setError('Description cannot exceed 1000 characters')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/stories/${story.id}/metadata`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save metadata')
      }

      const updatedStory = await response.json()
      setLastSaved(new Date())
      setHasChanges(false)
      onSave?.({ title: title.trim(), description: description.trim() || undefined })

      // Save hashtags (comma-separated)
      try {
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
        if (tagList.length > 0) {
          await fetch(`/api/stories/${story.id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: tagList })
          })
        }
      } catch {}

      // Save scheduling (optional)
      try {
        if (scheduledAt && scheduledAt.length >= 16) {
          const iso = new Date(scheduledAt).toISOString()
          await fetch(`/api/stories/${story.id}/schedule`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: iso })
          })
        } else if (scheduledAt === '') {
          await fetch(`/api/stories/${story.id}/schedule`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: null }) })
        }
      } catch {}

      // Save monetization flags
      try {
        await fetch(`/api/stories/${story.id}/monetization`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPremium, tipEnabled }) })
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save metadata')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setTitle(story.title)
    setDescription(story.description || '')
    setHasChanges(false)
    setError(null)
    onCancel?.()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Story Information</h3>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter story title..."
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">Required field</p>
              <p className="text-xs text-gray-500">{title.length}/200</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your story... (optional)"
              maxLength={1000}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">Optional field</p>
              <p className="text-xs text-gray-500">{description.length}/1000</p>
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <label htmlFor="hashtags" className="block text-sm font-medium text-gray-700 mb-1">Hashtags (comma-separated)</label>
            <input id="hashtags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#mystery, #horror" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <p className="text-xs text-gray-500 mt-1">Use up to ~5 short tags. We normalize them.</p>
          </div>

          {/* Scheduling */}
          <div>
            <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-1">Schedule publish (optional)</label>
            <input id="schedule" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
            <p className="text-xs text-gray-500 mt-1">If set, story will auto-publish at this time (UTC).</p>
          </div>

          {/* Monetization */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
              Premium content
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={tipEnabled} onChange={(e) => setTipEnabled(e.target.checked)} />
              Tips enabled
            </label>
          </div>
        </div>
          {/* Hashtags */}
          <div>
            <label htmlFor="hashtags" className="block text-sm font-medium text-gray-700 mb-1">
              Hashtags (comma-separated)
            </label>
            <input
              id="hashtags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="#mystery, #horror"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Use up to ~5 short tags. We normalize them.</p>
          </div>

        {/* Auto-save status */}
        {autoSave && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            {saving && (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                <span>Saving...</span>
              </>
            )}
            {!saving && lastSaved && (
              <>
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </>
            )}
            {!saving && !lastSaved && hasChanges && (
              <span>Unsaved changes</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          
          {onCancel && (
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Story Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Story Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Nodes:</span>
            <span className="ml-2 font-medium">{story.nodes.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-2 font-medium ${
              story.isPublished ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {story.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-2 font-medium">{story.createdAt.toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>
            <span className="ml-2 font-medium">{story.updatedAt.toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
