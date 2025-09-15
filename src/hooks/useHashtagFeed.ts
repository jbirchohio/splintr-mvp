import { useCallback, useEffect, useState } from 'react'
import { FeedItem } from '@/types/feed.types'

export function useHashtagFeed(tag: string) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/hashtags/${encodeURIComponent(tag)}/stories`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const normalized: FeedItem[] = (data.stories || []).map((s: any) => ({
        storyId: s.id,
        creatorId: s.creator_id,
        creatorName: '',
        title: s.title,
        description: s.description,
        thumbnailUrl: s.thumbnail_url,
        viewCount: s.view_count || 0,
        publishedAt: s.published_at,
      }))
      setItems(normalized)
    } catch (e: any) {
      setError(e.message || 'Failed to load hashtag feed')
    } finally {
      setLoading(false)
    }
  }, [tag])

  useEffect(() => { if (tag) load() }, [tag, load])

  return { items, loading, error }
}

