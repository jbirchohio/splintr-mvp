import { supabase } from '@/lib/supabase'
import { PlaybackAnalytics, ChoiceAnalytics } from '@/types/playback.types'
import { StoryPlaythrough } from '@/types/story.types'

export class PlaybackAnalyticsService {
  /**
   * Track a story playthrough for analytics
   */
  async trackPlaythrough(analytics: PlaybackAnalytics): Promise<void> {
    try {
      // Get current user (optional - can track anonymous users)
      const { data: { user } } = await supabase.auth.getUser()

      const playthroughData = {
        story_id: analytics.storyId,
        viewer_id: user?.id || null,
        session_id: analytics.sessionId,
        path_taken: analytics.pathTaken,
        choices_made: analytics.choicesMade,
        total_duration: analytics.totalDuration,
        completed_at: analytics.completedAt?.toISOString() || null,
        is_completed: analytics.isCompleted
      }

      const { error } = await supabase
        .from('story_playthroughs')
        .insert(playthroughData)

      if (error) {
        console.error('Failed to track playthrough:', error)
        // Don't throw error - analytics shouldn't break user experience
      }

      // Update story view count if completed
      if (analytics.isCompleted) {
        await this.incrementStoryViewCount(analytics.storyId)
        try {
          // Bump challenges + streak and sync achievements server-side
          await fetch('/api/challenges/progress', { method: 'POST' })
          await fetch('/api/achievements/sync', { method: 'POST' })
        } catch {}
      }
    } catch (error) {
      console.error('Error tracking playthrough:', error)
      // Silent fail for analytics
    }
  }

  /**
   * Increment story view count
   */
  private async incrementStoryViewCount(storyId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_story_views', {
        story_id: storyId
      })

      if (error) {
        console.error('Failed to increment view count:', error)
      }
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }

  /**
   * Get playthrough analytics for a story
   */
  async getStoryAnalytics(storyId: string): Promise<{
    totalViews: number
    completionRate: number
    averageDuration: number
    popularPaths: string[][]
    choiceDistribution: Record<string, Record<string, number>>
  }> {
    try {
      // Get all playthroughs for the story
      const { data: playthroughs, error } = await supabase
        .from('story_playthroughs')
        .select('*')
        .eq('story_id', storyId)

      if (error) {
        throw new Error(`Failed to fetch analytics: ${error.message}`)
      }

      const totalViews = playthroughs.length
      const completedPlaythroughs = playthroughs.filter(p => (p as any).is_completed)
      const completionRate = totalViews > 0 ? completedPlaythroughs.length / totalViews : 0

      // Calculate average duration (in milliseconds)
      const durations = playthroughs
        .filter(p => (p as any).total_duration !== null)
        .map(p => (p as any).total_duration!)
      const averageDuration = durations.length > 0 
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0

      // Find popular paths
      const pathCounts = new Map<string, number>()
      playthroughs.forEach(playthrough => {
        const pathKey = (playthrough.path_taken as string[]).join('->')
        pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1)
      })

      const popularPaths = Array.from(pathCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([path]) => path.split('->'))

      // Calculate choice distribution
      const choiceDistribution: Record<string, Record<string, number>> = {}
      playthroughs.forEach(playthrough => {
        if ((playthrough as any).choices_made) {
          ((playthrough as any).choices_made as ChoiceAnalytics[]).forEach((choice: ChoiceAnalytics) => {
            if (!choiceDistribution[choice.nodeId]) {
              choiceDistribution[choice.nodeId] = {}
            }
            const choiceKey = choice.choiceId
            choiceDistribution[choice.nodeId][choiceKey] = 
              (choiceDistribution[choice.nodeId][choiceKey] || 0) + 1
          })
        }
      })

      return {
        totalViews,
        completionRate,
        averageDuration,
        popularPaths,
        choiceDistribution
      }
    } catch (error) {
      console.error('Error getting story analytics:', error)
      throw error
    }
  }

  /**
   * Get user's playthrough history
   */
  async getUserPlaythroughs(userId: string, limit: number = 10): Promise<StoryPlaythrough[]> {
    try {
      const { data, error } = await supabase
        .from('story_playthroughs')
        .select(`
          *,
          stories (
            title,
            creator_id,
            thumbnail_url
          )
        `)
        .eq('viewer_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to fetch user playthroughs: ${error.message}`)
      }

      return data.map(this.mapDatabaseToPlaythrough)
    } catch (error) {
      console.error('Error getting user playthroughs:', error)
      throw error
    }
  }

  /**
   * Track choice timing analytics
   */
  async trackChoiceTiming(analytics: ChoiceAnalytics): Promise<void> {
    try {
      // This could be stored in a separate table for detailed analytics
      // For now, it's included in the playthrough data
      console.log('Choice timing tracked:', analytics)
    } catch (error) {
      console.error('Error tracking choice timing:', error)
    }
  }

  /**
   * Get real-time analytics for a story (for creators)
   */
  async getRealtimeAnalytics(storyId: string): Promise<{
    activeViewers: number
    recentCompletions: number
    topChoices: Array<{ nodeId: string, choiceId: string, count: number }>
  }> {
    try {
      // Get playthroughs from the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { data: recentPlaythroughs, error } = await supabase
        .from('story_playthroughs')
        .select('*')
        .eq('story_id', storyId)
        .gte('created_at', oneHourAgo)

      if (error) {
        throw new Error(`Failed to fetch realtime analytics: ${error.message}`)
      }

      const activeViewers = recentPlaythroughs.filter(p => !p.completed_at).length
      const recentCompletions = recentPlaythroughs.filter(p => p.completed_at).length

      // Calculate top choices from recent playthroughs
      const choiceCounts = new Map<string, number>()
      recentPlaythroughs.forEach(playthrough => {
        if ((playthrough as any).choices_made) {
          ((playthrough as any).choices_made as ChoiceAnalytics[]).forEach((choice: ChoiceAnalytics) => {
            const key = `${choice.nodeId}-${choice.choiceId}`
            choiceCounts.set(key, (choiceCounts.get(key) || 0) + 1)
          })
        }
      })

      const topChoices = Array.from(choiceCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([key, count]) => {
          const [nodeId, choiceId] = key.split('-')
          return { nodeId, choiceId, count }
        })

      return {
        activeViewers,
        recentCompletions,
        topChoices
      }
    } catch (error) {
      console.error('Error getting realtime analytics:', error)
      throw error
    }
  }

  /**
   * Map database record to StoryPlaythrough interface
   */
  private mapDatabaseToPlaythrough(data: any): StoryPlaythrough {
    return {
      id: data.id,
      storyId: data.story_id,
      viewerId: data.viewer_id,
      pathTaken: data.path_taken,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      sessionId: data.session_id,
      createdAt: new Date(data.created_at)
    }
  }
}

// Export singleton instance
export const playbackAnalyticsService = new PlaybackAnalyticsService()
