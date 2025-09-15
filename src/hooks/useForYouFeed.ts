import { useCallback, useEffect, useState } from 'react'
import { FeedItem } from '@/types/feed.types'

interface UseForYouFeedReturn {
  items: FeedItem[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  variant?: string
}

export function useForYouFeed(limit = 20): UseForYouFeedReturn {
  const [items, setItems] = useState<FeedItem[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const [variant, setVariant] = useState<string | undefined>(undefined)

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    setLoading(true)
    setError(null)
    try {
      let sid = localStorage.getItem('sessionId')
      if (!sid) { sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2); localStorage.setItem('sessionId', sid) }
      const override = localStorage.getItem('variantOverride')
      const qs = new URLSearchParams({ page: String(p), limit: String(limit), ...(override ? { variant: override } : {}) })
      const res = await fetch(`/api/feed/foryou?${qs.toString()}`, { headers: { 'x-session-id': sid } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.assignedVariant) setVariant(data.assignedVariant)
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
      setError(e.message || 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchPage(1, false)
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const next = page + 1
    setPage(next)
    await fetchPage(next, true)
  }, [page, hasMore, loading, fetchPage])

  return { items, loading, error, hasMore, loadMore, variant }
}
