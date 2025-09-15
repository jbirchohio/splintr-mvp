import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeStoryEngagement(
  storyId: string | undefined,
  onLikeChange?: (delta: number) => void,
  onCommentChange?: (delta: number) => void
) {
  useEffect(() => {
    if (!storyId) return
    const channel = supabase.channel(`story-${storyId}-engagement`)

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'story_likes', filter: `story_id=eq.${storyId}` }, () => {
        onLikeChange?.(1)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'story_likes', filter: `story_id=eq.${storyId}` }, () => {
        onLikeChange?.(-1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'story_comments', filter: `story_id=eq.${storyId}` }, () => {
        onCommentChange?.(1)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'story_comments', filter: `story_id=eq.${storyId}` }, () => {
        onCommentChange?.(-1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storyId, onLikeChange, onCommentChange])
}

