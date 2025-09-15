'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFeed } from '@/hooks/useFeed'
import { useForYouFeed } from '@/hooks/useForYouFeed'
import { useFollowingFeed } from '@/hooks/useFollowingFeed'
import { useRealtimeStoryEngagement } from '@/hooks/useRealtimeStoryEngagement'
import { FeedType } from '@/types/feed.types'
import dynamic from 'next/dynamic'
const StoryPlayer = dynamic(() => import('@/components/story/StoryPlayer').then(m => m.StoryPlayer), { ssr: false })
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

interface VerticalFeedProps { type?: FeedType | 'foryou' | 'following' }

export function VerticalFeed({ type = 'chronological' }: VerticalFeedProps) {
  const { show } = useToast()
  const chronological = useFeed({ type: (type === 'trending' ? 'trending' : 'chronological'), limit: 10, autoRefresh: false })
  const personalized = useForYouFeed(10)
  const following = useFollowingFeed(10)
  const items = type === 'foryou' ? personalized.items : type === 'following' ? following.items : chronological.items
  const hasMore = type === 'foryou' ? personalized.hasMore : type === 'following' ? following.hasMore : chronological.hasMore
  const loadMore = type === 'foryou' ? personalized.loadMore : type === 'following' ? following.loadMore : chronological.loadMore
  const loading = type === 'foryou' ? personalized.loading : type === 'following' ? following.loading : chronological.loading
  const assignedVariant = type === 'foryou' ? personalized.variant : undefined

  const [currentIndex, setCurrentIndex] = useState(0)
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = window.localStorage.getItem('videoMuted')
    return saved ? saved === '1' : true
  })
  const [likes, setLikes] = useState<Record<string, { count: number; liked: boolean }>>({})
  const [followState, setFollowState] = useState<Record<string, { following: boolean; followerCount: number }>>({})
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Array<{ id: string; content: string; userId: string; parentId?: string | null; createdAt?: string; author?: { name: string; avatarUrl?: string } }>>>({})
  const [commentCursor, setCommentCursor] = useState<Record<string, string | null>>({})
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)
  const touchDeltaY = useRef<number>(0)
  const isAnimating = useRef(false)
  const lastTapRef = useRef<number>(0)
  const holdTimerRef = useRef<number | null>(null)
  const [isHolding, setIsHolding] = useState(false)
  const [hearts, setHearts] = useState<Array<{ id: string, x: number, y: number, storyId: string }>>([])
  const [likePulse, setLikePulse] = useState<Record<string, boolean>>({})
  const [streamingByIndex, setStreamingByIndex] = useState<Record<number, string>>({})
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({})

  // Load more when approaching end
  useEffect(() => {
    if (!loading && hasMore && currentIndex >= items.length - 3) {
      loadMore()
    }
  }, [currentIndex, items.length, hasMore, loadMore, loading])

  // Persist mute state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('videoMuted', muted ? '1' : '0')
    }
  }, [muted])

  // Haptic helper
  function triggerHaptic(intensity: 'light' | 'medium' = 'light') {
    try {
      const pattern = intensity === 'light' ? 10 : 20
      if ('vibrate' in navigator) (navigator as any).vibrate(pattern)
    } catch {}
  }

  // Warm-up next streaming URL if known
  useEffect(() => {
    const nextIdx = currentIndex + 1
    const nextUrl = streamingByIndex[nextIdx]
    if (nextUrl) warmupStreaming(nextUrl)
  }, [currentIndex, streamingByIndex])

  async function warmupStreaming(url: string) {
    try {
      if (typeof window === 'undefined') return
      // Respect Save-Data preference
      const anyNav: any = navigator as any
      if (anyNav?.connection?.saveData) return
      const cachePut = async (req: Request, res: Response) => {
        try { const cache = await caches.open('video-prefetch'); await cache.put(req, res.clone()) } catch {}
      }
      if (url.includes('.m3u8')) {
        const req = new Request(url, { mode: 'cors' })
        const res = await fetch(req)
        if (!res.ok) return
        const text = await res.text()
        cachePut(req, new Response(text))
        const firstSeg = text.split(/\r?\n/).find(l => l && !l.startsWith('#'))
        if (firstSeg) {
          const segUrl = new URL(firstSeg, url).toString()
          const segReq = new Request(segUrl, { mode: 'cors' })
          const segRes = await fetch(segReq)
          if (segRes.ok) cachePut(segReq, segRes)
        }
      } else {
        const req = new Request(url, { mode: 'no-cors' })
        const res = await fetch(req)
        cachePut(req, res)
      }
    } catch {}
  }

  // Prefetch engagement state for current slide
  useEffect(() => {
    const preload = async () => {
      const current = items[currentIndex]
      if (!current) return
      const storyId = current.storyId
      // Likes
      if (!likes[storyId]) {
        try {
          const res = await fetch(`/api/stories/${storyId}/likes`)
          const data = await res.json()
          setLikes(prev => ({ ...prev, [storyId]: { count: data.count || 0, liked: !!data.liked } }))
        } catch {}
      }
      // Follow state
      if (current.creatorId && !followState[current.creatorId]) {
        try {
          const res = await fetch(`/api/users/${current.creatorId}/follow`)
          const data = await res.json()
          setFollowState(prev => ({ ...prev, [current.creatorId!]: { following: !!data.following, followerCount: data.followerCount || 0 } }))
        } catch {}
      }
    }
    preload()
  }, [currentIndex, items, likes, followState])

  // Realtime like/comment updates for current story
  const currentStoryId = items[currentIndex]?.storyId
  useRealtimeStoryEngagement(
    currentStoryId,
    (delta) => {
      if (!currentStoryId) return
      setLikes(prev => ({ ...prev, [currentStoryId]: { count: Math.max(0, (prev[currentStoryId]?.count || 0) + delta), liked: prev[currentStoryId]?.liked || false } }))
    },
    () => {}
  )

  // Impression/dwell/skip tracking
  const viewStartRef = useRef<number | null>(null)
  const lastStoryRef = useRef<string | null>(null)
  useEffect(() => {
    const now = Date.now()
    const prevStory = lastStoryRef.current
    if (prevStory && viewStartRef.current) {
      const dwell = now - viewStartRef.current
      if (dwell < 2000) {
        fetch('/api/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: 'story', contentId: prevStory, action: 'skip', metadata: { value: dwell } }) }).catch(() => {})
      } else {
        fetch('/api/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: 'story', contentId: prevStory, action: 'dwell', metadata: { value: dwell } }) }).catch(() => {})
      }
    }
    const curStory = items[currentIndex]?.storyId
    if (curStory) {
      fetch('/api/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: 'story', contentId: curStory, action: 'view' }) }).catch(() => {})
      lastStoryRef.current = curStory
      viewStartRef.current = now
    }
  }, [currentIndex, items])

  const clampIndex = useCallback((idx: number) => {
    if (idx < 0) return 0
    if (idx >= items.length) return items.length - 1
    return idx
  }, [items.length])

  const goTo = useCallback((next: number) => {
    if (isAnimating.current) return
    const clamped = clampIndex(next)
    if (clamped === currentIndex) return
    isAnimating.current = true
    setCurrentIndex(clamped)
    // Small timeout to avoid rapid double-swipes fighting layout
    setTimeout(() => { isAnimating.current = false }, 250)
  }, [clampIndex, currentIndex])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchDeltaY.current = 0
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = window.setTimeout(() => setIsHolding(true), 250)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return
    const currentY = e.touches[0].clientY
    touchDeltaY.current = currentY - touchStartY.current
    if (Math.abs(touchDeltaY.current) > 8 && isHolding) setIsHolding(false)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return
    const threshold = 50 // px
    const delta = touchDeltaY.current
    touchStartY.current = null
    touchDeltaY.current = 0
    if (holdTimerRef.current) { window.clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    if (isHolding) setIsHolding(false)
    // If it was a tap (no swipe), handle double-tap like
    if (Math.abs(delta) < threshold) {
      const now = Date.now()
      const tappedStoryId = items[currentIndex]?.storyId
      if (tappedStoryId) {
        if (now - lastTapRef.current < 300) {
          // Double tap detected
          const touch = e.changedTouches[0]
          const id = `${now}-${Math.random()}`
          setHearts(prev => [...prev, { id, x: touch.clientX, y: touch.clientY, storyId: tappedStoryId }])
          setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 800)
          fetch(`/api/stories/${tappedStoryId}/likes`, { method: 'POST' })
            .then(r => r.json())
            .then(data => setLikes(prev => ({ ...prev, [tappedStoryId]: { count: data.count || 0, liked: !!data.liked } })))
            .catch(() => {})
          triggerHaptic('light')
          lastTapRef.current = 0
        } else {
          lastTapRef.current = now
        }
      }
      return
    }
    if (Math.abs(delta) < threshold) return
    if (delta < 0) {
      goTo(currentIndex + 1)
    } else {
      goTo(currentIndex - 1)
    }
  }

  const transformStyle = useMemo(() => ({
    transform: `translateY(-${currentIndex * 100}vh)`,
  }), [currentIndex])

  return (
    <div className="fixed inset-0 bg-black" ref={containerRef}>
      {/* Slides wrapper */}
      <div
        className="w-full h-full transition-transform duration-300 ease-out"
        style={transformStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((item, idx) => (
          <div key={item.storyId} className="w-full h-screen overflow-hidden relative"
               onDoubleClick={(ev) => {
                 const id = `${Date.now()}-${Math.random()}`
                 setHearts(prev => [...prev, { id, x: (ev as any).clientX, y: (ev as any).clientY, storyId: item.storyId }])
                 setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 800)
                 fetch(`/api/stories/${item.storyId}/likes`, { method: 'POST' })
                   .then(r => r.json()).then(data => setLikes(prev => ({ ...prev, [item.storyId]: { count: data.count || 0, liked: !!data.liked } })))
                   .catch(() => {})
               }}>
            {/* Only mount nearby slides for perf */}
            {Math.abs(idx - currentIndex) <= 1 ? (
              <StoryPlayer
                storyId={item.storyId}
                autoStart={idx === currentIndex}
                muted={muted}
                paused={isHolding && idx === currentIndex}
                onError={(err) => console.error('VerticalFeed playback error:', err)}
                onComplete={(analytics) => {
                  import('@/services/playback.analytics.service').then(({ playbackAnalyticsService }) => {
                    playbackAnalyticsService.trackPlaythrough(analytics).catch(() => {})
                  })
                  fetch('/api/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: 'story', contentId: item.storyId, action: 'complete' }) }).catch(() => {})
                }}
                onVideoLoaded={({ streamingUrl }) => setStreamingByIndex(prev => ({ ...prev, [idx]: streamingUrl }))}
              />
            ) : null}

            {/* Hearts animation for double-tap */}
            {hearts.filter(h => h.storyId === item.storyId).map(h => (
              <div key={h.id} className="pointer-events-none absolute" style={{ left: h.x - 16, top: h.y - 16 }}>
                <svg className="w-8 h-8 text-red-500 animate-ping" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21s-7-4.534-7-10a4 4 0 018 0 4 4 0 018 0c0 5.466-7 10-7 10z" />
                </svg>
              </div>
            ))}

            {/* Overlay UI: creator + title */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
              <div className="text-white drop-shadow max-w-[70%] pointer-events-auto">
                <div className="text-sm opacity-80">{item.creatorName}</div>
                <div className="text-lg font-semibold leading-tight">{item.title}</div>
              </div>

              {/* Mute/Unmute */}
              <button
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={() => setMuted((m) => !m)}
                className="pointer-events-auto bg-black/50 rounded-full p-2 text-white hover:bg-black/70 transition-colors"
              >
                {muted ? (
                  // volume off icon
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9v6H5l-4 4V5l4 4h4zM15 9l6 6M21 9l-6 6" />
                  </svg>
                ) : (
                  // volume on icon
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5l-6 6h-4v2h4l6 6V5zM16 8a5 5 0 010 8M19 5a9 9 0 010 14" />
                  </svg>
                )}
              </button>
            </div>

            {/* Follow button */}
            {item.creatorId && (
              <div className="absolute top-16 left-4 pointer-events-auto">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/users/${item.creatorId}/follow`, { method: 'POST' })
                      const data = await res.json()
                      setFollowState(prev => ({ ...prev, [item.creatorId!]: { following: data.following, followerCount: data.followerCount || 0 } }))
                    } catch {}
                  }}
                  className="px-3 py-1.5 bg-white/90 text-black rounded-full text-sm font-semibold hover:bg-white transition-colors"
                >
                  {followState[item.creatorId]?.following ? 'Following' : 'Follow'}
                </button>
              </div>
            )}

            {/* Right-side action rail: like, comment, share, tip */}
            <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 text-white">
              <button
                className={`rounded-full p-3 transition-colors ${likes[item.storyId]?.liked ? 'bg-red-600' : 'bg-black/40 hover:bg-black/60'}`}
                aria-label="Like"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/stories/${item.storyId}/likes`, { method: 'POST' })
                    const data = await res.json()
                    setLikes(prev => ({ ...prev, [item.storyId]: { count: data.count || 0, liked: !!data.liked } }))
                    setLikePulse(prev => ({ ...prev, [item.storyId]: true }))
                    setTimeout(() => setLikePulse(prev => ({ ...prev, [item.storyId]: false })), 160)
                  } catch {}
                }}
                style={{ transform: likePulse[item.storyId] ? 'scale(1.2)' : 'scale(1.0)', transition: 'transform 160ms ease-out' }}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21s-7-4.534-7-10a4 4 0 018 0 4 4 0 018 0c0 5.466-7 10-7 10z" />
                </svg>
              </button>
              <div className="text-xs opacity-90">{likes[item.storyId]?.count ?? 0}</div>

              <button
                className="bg-black/40 rounded-full p-3 hover:bg-black/60 transition-colors"
                aria-label="Comment"
                onClick={async () => {
                  setShowCommentsFor(item.storyId)
                  if (!comments[item.storyId]) {
                    try {
                      const res = await fetch(`/api/stories/${item.storyId}/comments?limit=50`)
                      const data = await res.json()
                      setComments(prev => ({ ...prev, [item.storyId]: data.comments || [] }))
                    } catch {}
                  }
                }}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4a2 2 0 00-2 2v14l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
                </svg>
              </button>
              <button
                className="bg-black/40 rounded-full p-3 hover:bg-black/60 transition-colors"
                aria-label="Share"
                onClick={async () => {
                  const url = `${window.location.origin}/story/${item.storyId}/play?wt=1`
                  const title = `${item.title} - via Splintr`
                  try {
                    const { nativeShare } = await import('@/lib/native/share')
                    const usedNative = await nativeShare(title, url)
                    if (!usedNative) {
                      if (navigator.share) { await navigator.share({ title, url }) }
                      else { await navigator.clipboard.writeText(url); show({ message: 'Link copied to clipboard', type: 'success' }) }
                    }
                    // Log share interaction
                    try { await fetch('/api/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: 'story', contentId: item.storyId, action: 'share' }) }) } catch {}
                    triggerHaptic('light')
                  } catch {}
                }}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" />
                </svg>
              </button>
              {item.tipEnabled && (!(typeof window !== 'undefined' && (window as any).Capacitor) || process.env.NEXT_PUBLIC_DISABLE_NATIVE_MONETIZATION !== '1') && (
                <button
                  className="bg-black/40 rounded-full p-3 hover:bg-black/60 transition-colors"
                  aria-label="Tip"
                  onClick={async () => {
                    try {
                      await fetch('/api/tips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId: item.storyId, amount: 1 }) })
                      triggerHaptic('medium')
                    } catch {}
                  }}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zm0 7L2 14l10 5 10-5-10-5z"/></svg>
                </button>
              )}
              <div className="text-xs opacity-80">{idx + 1}/{items.length}</div>
            </div>

            {/* Comments panel */}
            {showCommentsFor === item.storyId && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm text-white p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold">Comments</div>
                  <button className="text-white/80 hover:text-white" onClick={() => setShowCommentsFor(null)}>Close</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {renderThreadedComments(comments[item.storyId] || [], (cid) => setReplyTo(prev => ({ ...prev, [item.storyId]: cid })))}
                  {commentCursor[item.storyId] && (
                    <div className="pt-2">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/stories/${item.storyId}/comments?limit=50&cursor=${encodeURIComponent(commentCursor[item.storyId]!)}`)
                            const data = await res.json()
                            setComments(prev => ({ ...prev, [item.storyId]: [...(prev[item.storyId] || []), ...(data.comments || [])] }))
                            setCommentCursor(prev => ({ ...prev, [item.storyId]: data.nextCursor || null }))
                          } catch {}
                        }}
                        className="text-xs text-white/80 underline"
                      >Load more</button>
                    </div>
                  )}
                </div>
                <CommentComposer storyId={item.storyId} parentId={replyTo[item.storyId] || null} onAdded={async () => {
                  try {
                    const res = await fetch(`/api/stories/${item.storyId}/comments?limit=50`)
                    const data = await res.json()
                    setComments(prev => ({ ...prev, [item.storyId]: data.comments || [] }))
                    setCommentCursor(prev => ({ ...prev, [item.storyId]: data.nextCursor || null }))
                    setReplyTo(prev => ({ ...prev, [item.storyId]: null }))
                  } catch {}
                }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Loading indicator at the end */}
      {loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>Loading more…</span>
        </div>
      )}

      {/* Variant label (dev only) */}
      {assignedVariant && process.env.NODE_ENV !== 'production' && (
        <div className="absolute top-4 left-4 z-20 text-xs text-white/80 bg-white/10 rounded px-2 py-1">FYP {assignedVariant}</div>
      )}

      {/* Premium gate overlay for current slide */}
      {items[currentIndex]?.isPremium && !unlocked[items[currentIndex].storyId] && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl p-6 text-center w-80">
            <div className="text-xl font-semibold mb-2">Premium Story</div>
            <div className="text-gray-600 mb-4">Support the creator or continue to unlock.</div>
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 rounded bg-blue-600 text-white" onClick={async () => {
                try { await fetch('/api/tips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId: items[currentIndex].storyId, amount: 1 }) }) } catch {}
                setUnlocked(prev => ({ ...prev, [items[currentIndex].storyId]: true }))
              }}>Tip $1</button>
              <button className="flex-1 px-4 py-2 rounded bg-gray-200" onClick={() => setUnlocked(prev => ({ ...prev, [items[currentIndex].storyId]: true }))}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Long-press progress ring overlay */}
      {isHolding && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full border-2 border-white/40 relative">
            <div className="absolute inset-0 rounded-full border-2 border-white animate-pulse" />
          </div>
        </div>
      )}
    </div>
  )
}

function renderThreadedComments(list: Array<{ id: string; content: string; userId: string; parentId?: string | null; author?: { name?: string } }>, onReply: (id: string) => void) {
  const byParent: Record<string, any[]> = {}
  list.forEach(c => {
    const pid = c.parentId || 'root'
    byParent[pid] = byParent[pid] || []
    byParent[pid].push(c)
  })
  const render = (pid: string, depth: number) => (
    <div className={depth === 0 ? '' : 'ml-4'}>
      {(byParent[pid] || []).map(c => (
        <div key={c.id} className="bg-white/10 rounded-lg p-3 mb-2">
          <div className="text-sm opacity-90">{c.author?.name || c.userId}</div>
          <div className="text-base mb-1">{c.content}</div>
          <button className="text-xs text-white/80 underline" onClick={() => onReply(c.id)}>Reply</button>
          {byParent[c.id]?.length ? render(c.id, depth + 1) : null}
        </div>
      ))}
    </div>
  )
  return render('root', 0)
}

function CommentComposer({ storyId, onAdded, parentId }: { storyId: string; onAdded: () => void; parentId?: string | null }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await fetch(`/api/stories/${storyId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, parentId: parentId || null }) })
      setText('')
      onAdded()
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="mt-3 flex gap-2">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={parentId ? 'Reply to comment' : 'Add a comment'}
        className="flex-1 px-3 py-2 rounded-lg bg-white/90 text-black placeholder-black/60"
      />
      <button onClick={submit} disabled={submitting || !text.trim()} className="px-3 py-2 bg-white/90 text-black rounded-lg font-semibold disabled:opacity-60">Post</button>
    </div>
  )
}
