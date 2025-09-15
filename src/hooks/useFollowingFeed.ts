import { useCallback, useEffect, useState } from 'react'
import { FeedItem } from '@/types/feed.types'

export function useFollowingFeed(limit = 20) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/feed/following?page=${p}&limit=${limit}`)
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
        isPremium: s.is_premium || false,
        tipEnabled: s.tip_enabled || false,
        category: s.category || null,
      }))
      setItems(prev => append ? [...prev, ...normalized] : normalized)
      const total = data.pagination?.total || 0
      const totalPages = Math.ceil(total / limit)
      setHasMore(p < totalPages)
    } catch (e: any) {
      setError(e.message || 'Failed to load following feed')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { fetchPage(1, false) }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const next = page + 1
    setPage(next)
    await fetchPage(next, true)
  }, [page, hasMore, loading, fetchPage])

  return { items, loading, error, hasMore, loadMore }
}
