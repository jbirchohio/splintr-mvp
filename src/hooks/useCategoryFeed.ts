import { useCallback, useEffect, useState } from 'react'
import { FeedItem } from '@/types/feed.types'

export function useCategoryFeed(category: string, limit = 20) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/feed?category=${encodeURIComponent(category)}&page=${p}&limit=${limit}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const normalized: FeedItem[] = (data.stories || []).map((s: any) => ({
        storyId: s.id,
        creatorId: s.creator?.id || '',
        creatorName: s.creator?.name || '',
        creatorAvatar: s.creator?.avatar,
        title: s.title,
        description: s.description,
        thumbnailUrl: s.thumbnailUrl,
        viewCount: s.viewCount || 0,
        publishedAt: s.publishedAt,
        isPremium: s.isPremium || false,
        tipEnabled: s.tipEnabled || false,
        category: s.category || null,
      }))
      setItems(prev => append ? [...prev, ...normalized] : normalized)
      setHasMore((data.pagination?.page || 1) < (data.pagination?.totalPages || 1))
    } catch (e: any) {
      setError(e.message || 'Failed to load category feed')
    } finally {
      setLoading(false)
    }
  }, [category, limit])

  useEffect(() => { if (category) fetchPage(1, false) }, [category, fetchPage])
  const loadMore = useCallback(async () => { if (!loading && hasMore) { const next = page + 1; setPage(next); fetchPage(next, true) } }, [page, hasMore, loading, fetchPage])
  return { items, loading, error, hasMore, loadMore }
}

