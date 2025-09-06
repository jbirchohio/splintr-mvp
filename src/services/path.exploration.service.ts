import { Story, StoryNode, Choice } from '@/types/story.types'
import { PlaybackAnalytics } from '@/types/playback.types'
import { supabase } from '@/lib/supabase'

export interface PathExplorationData {
  storyId: string
  totalPaths: number
  exploredPaths: string[][]
  unexploredPaths: string[][]
  completionPercentage: number
  alternateEndings: StoryNode[]
  discoveredEndings: string[]
  achievements: Achievement[]
}

export interface Achievement {
  id: string
  type: 'first_completion' | 'all_paths' | 'speed_run' | 'explorer' | 'completionist'
  title: string
  description: string
  unlockedAt: Date
  progress: number
  maxProgress: number
}

export interface PathAnalysis {
  nodeId: string
  choices: {
    choiceId: string
    text: string
    explored: boolean
    leadsToNewContent: boolean
  }[]
}

export class PathExplorationService {
  /**
   * Analyze all possible paths in a story
   */
  analyzeStoryPaths(story: Story): string[][] {
    const allPaths: string[][] = []
    
    const findPaths = (currentPath: string[], currentNodeId: string, visited: Set<string>) => {
      // Prevent infinite loops
      if (visited.has(currentNodeId)) {
        return
      }
      
      const currentNode = story.nodes.find(node => node.id === currentNodeId)
      if (!currentNode) return
      
      const newPath = [...currentPath, currentNodeId]
      const newVisited = new Set(visited).add(currentNodeId)
      
      // If this is an end node, we've found a complete path
      if (currentNode.isEndNode) {
        allPaths.push(newPath)
        return
      }
      
      // Explore each choice
      currentNode.choices.forEach(choice => {
        if (choice.nextNodeId) {
          findPaths(newPath, choice.nextNodeId, newVisited)
        }
      })
    }
    
    // Start from the beginning
    const startNode = story.nodes.find(node => node.isStartNode)
    if (startNode) {
      findPaths([], startNode.id, new Set())
    }
    
    return allPaths
  }

  /**
   * Get user's exploration progress for a story
   */
  async getUserExplorationData(storyId: string, userId?: string): Promise<PathExplorationData> {
    try {
      // Get story data
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single()

      if (storyError || !storyData) {
        throw new Error('Story not found')
      }

      const story: Story = {
        id: storyData.id,
        creatorId: storyData.creator_id,
        title: storyData.title,
        description: storyData.description,
        nodes: storyData.story_data?.nodes || [],
        isPublished: storyData.is_published,
        thumbnailUrl: storyData.thumbnail_url,
        viewCount: storyData.view_count || 0,
        createdAt: new Date(storyData.created_at),
        updatedAt: new Date(storyData.updated_at),
        publishedAt: storyData.published_at ? new Date(storyData.published_at) : undefined
      }

      // Get all possible paths
      const allPaths = this.analyzeStoryPaths(story)
      
      // Get user's completed paths
      let exploredPaths: string[][] = []
      if (userId) {
        const { data: playthroughs } = await supabase
          .from('story_playthroughs')
          .select('path_taken')
          .eq('story_id', storyId)
          .eq('viewer_id', userId)
          .eq('is_completed', true)

        exploredPaths = playthroughs?.map(p => p.path_taken) || []
      }

      // Find unexplored paths
      const exploredPathStrings = exploredPaths.map(path => path.join('->'))
      const unexploredPaths = allPaths.filter(path => 
        !exploredPathStrings.includes(path.join('->'))
      )

      // Find alternate endings
      const alternateEndings = story.nodes.filter(node => node.isEndNode)
      const discoveredEndings = exploredPaths
        .map(path => path[path.length - 1])
        .filter((ending, index, arr) => arr.indexOf(ending) === index)

      // Calculate completion percentage
      const completionPercentage = allPaths.length > 0 
        ? (exploredPaths.length / allPaths.length) * 100 
        : 0

      // Generate achievements
      const achievements = await this.generateAchievements(
        storyId, 
        userId, 
        exploredPaths, 
        allPaths, 
        discoveredEndings.length,
        alternateEndings.length
      )

      return {
        storyId,
        totalPaths: allPaths.length,
        exploredPaths,
        unexploredPaths,
        completionPercentage,
        alternateEndings,
        discoveredEndings,
        achievements
      }
    } catch (error) {
      console.error('Error getting exploration data:', error)
      throw error
    }
  }

  /**
   * Generate achievements based on user progress
   */
  private async generateAchievements(
    storyId: string,
    userId: string | undefined,
    exploredPaths: string[][],
    allPaths: string[][],
    discoveredEndings: number,
    totalEndings: number
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = []

    if (!userId) return achievements

    try {
      // Get user's playthrough history for this story
      const { data: playthroughs } = await supabase
        .from('story_playthroughs')
        .select('*')
        .eq('story_id', storyId)
        .eq('viewer_id', userId)
        .order('created_at', { ascending: true })

      const completedPlaythroughs = playthroughs?.filter(p => p.is_completed) || []

      // First Completion Achievement
      if (completedPlaythroughs.length > 0) {
        achievements.push({
          id: 'first_completion',
          type: 'first_completion',
          title: 'Story Complete',
          description: 'Completed your first playthrough of this story',
          unlockedAt: new Date(completedPlaythroughs[0].completed_at),
          progress: 1,
          maxProgress: 1
        })
      }

      // Explorer Achievement (50% of paths)
      const explorerThreshold = Math.ceil(allPaths.length * 0.5)
      if (exploredPaths.length >= explorerThreshold) {
        achievements.push({
          id: 'explorer',
          type: 'explorer',
          title: 'Path Explorer',
          description: 'Explored over half of all possible story paths',
          unlockedAt: new Date(), // Would need to track when this was achieved
          progress: exploredPaths.length,
          maxProgress: explorerThreshold
        })
      }

      // Completionist Achievement (all paths)
      if (exploredPaths.length >= allPaths.length) {
        achievements.push({
          id: 'completionist',
          type: 'completionist',
          title: 'Completionist',
          description: 'Discovered every possible path in this story',
          unlockedAt: new Date(),
          progress: exploredPaths.length,
          maxProgress: allPaths.length
        })
      }

      // All Endings Achievement
      if (discoveredEndings >= totalEndings) {
        achievements.push({
          id: 'all_endings',
          type: 'all_paths',
          title: 'Ending Collector',
          description: 'Discovered all possible endings',
          unlockedAt: new Date(),
          progress: discoveredEndings,
          maxProgress: totalEndings
        })
      }

      // Speed Run Achievement (completed in under 2 minutes)
      const speedRuns = completedPlaythroughs.filter(p => 
        p.total_duration && p.total_duration < 120000 // 2 minutes in milliseconds
      )
      if (speedRuns.length > 0) {
        achievements.push({
          id: 'speed_run',
          type: 'speed_run',
          title: 'Speed Runner',
          description: 'Completed a story path in under 2 minutes',
          unlockedAt: new Date(speedRuns[0].completed_at),
          progress: 1,
          maxProgress: 1
        })
      }

      return achievements
    } catch (error) {
      console.error('Error generating achievements:', error)
      return achievements
    }
  }

  /**
   * Analyze choices at current node for exploration hints
   */
  analyzeNodeChoices(story: Story, currentNodeId: string, exploredPaths: string[][]): PathAnalysis {
    const currentNode = story.nodes.find(node => node.id === currentNodeId)
    if (!currentNode) {
      throw new Error('Node not found')
    }

    const choices = currentNode.choices.map(choice => {
      // Check if this choice has been explored
      const explored = exploredPaths.some(path => {
        const nodeIndex = path.indexOf(currentNodeId)
        return nodeIndex >= 0 && 
               nodeIndex < path.length - 1 && 
               path[nodeIndex + 1] === choice.nextNodeId
      })

      // Check if this choice leads to new content
      const leadsToNewContent = this.checkForNewContent(story, choice.nextNodeId, exploredPaths)

      return {
        choiceId: choice.id,
        text: choice.text,
        explored,
        leadsToNewContent
      }
    })

    return {
      nodeId: currentNodeId,
      choices
    }
  }

  /**
   * Check if a path leads to unexplored content
   */
  private checkForNewContent(story: Story, nodeId: string | null, exploredPaths: string[][]): boolean {
    if (!nodeId) return false

    // Simple heuristic: if this node hasn't been visited in any completed path
    return !exploredPaths.some(path => path.includes(nodeId))
  }

  /**
   * Get suggested next choice for exploration
   */
  getSuggestedChoice(story: Story, currentNodeId: string, exploredPaths: string[][]): Choice | null {
    const analysis = this.analyzeNodeChoices(story, currentNodeId, exploredPaths)
    
    // Prioritize unexplored choices that lead to new content
    const unexploredChoice = analysis.choices.find(choice => 
      !choice.explored && choice.leadsToNewContent
    )
    
    if (unexploredChoice) {
      const currentNode = story.nodes.find(node => node.id === currentNodeId)
      return currentNode?.choices.find(choice => choice.id === unexploredChoice.choiceId) || null
    }

    return null
  }

  /**
   * Track achievement unlock
   */
  async unlockAchievement(userId: string, storyId: string, achievementType: Achievement['type']): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_achievements')
        .upsert({
          user_id: userId,
          story_id: storyId,
          achievement_type: achievementType,
          unlocked_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,story_id,achievement_type'
        })

      if (error) {
        console.error('Failed to unlock achievement:', error)
      }
    } catch (error) {
      console.error('Error unlocking achievement:', error)
    }
  }
}

// Export singleton instance
export const pathExplorationService = new PathExplorationService()