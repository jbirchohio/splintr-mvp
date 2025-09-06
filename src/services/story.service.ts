import { supabase } from '@/lib/supabase'
import { 
  Story, 
  CreateStoryRequest, 
  UpdateStoryRequest, 
  ValidationResult,
  StoryNode,
  Choice
} from '@/types/story.types'
import { moderationService } from '@/services/moderation.service'
import { ModerationResult } from '@/types/moderation.types'
import { randomUUID } from 'crypto'

export class StoryService {
  /**
   * Create a new story
   */
  async createStory(request: CreateStoryRequest): Promise<Story> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }

      // Generate IDs for nodes and choices
      const nodesWithIds = request.nodes.map(node => ({
        ...node,
        id: randomUUID(),
        choices: node.choices.map(choice => ({
          ...choice,
          id: randomUUID()
        }))
      }))

      const storyData = {
        creator_id: user.id,
        title: request.title,
        description: request.description,
        story_data: { nodes: nodesWithIds },
        is_published: false,
        view_count: 0
      }

      const { data, error } = await supabase
        .from('stories')
        .insert(storyData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create story: ${error.message}`)
      }

      return this.mapDatabaseToStory(data)
    } catch (error) {
      console.error('Error creating story:', error)
      throw error
    }
  }

  /**
   * Save story as draft with auto-save functionality
   */
  async saveDraft(storyId: string, updates: UpdateStoryRequest): Promise<Story> {
    try {
      // Ensure the story remains unpublished when saving as draft
      const draftUpdates = {
        ...updates,
        isPublished: false
      }
      
      return await this.updateStory(storyId, draftUpdates)
    } catch (error) {
      console.error('Error saving draft:', error)
      throw error
    }
  }

  /**
   * Auto-save story draft (silent save without validation)
   */
  async autoSaveDraft(storyId: string, updates: Partial<UpdateStoryRequest>): Promise<void> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }

      // Check if user owns the story
      const { data: existingStory, error: fetchError } = await supabase
        .from('stories')
        .select('creator_id, is_published')
        .eq('id', storyId)
        .single()

      if (fetchError) {
        throw new Error(`Story not found: ${fetchError.message}`)
      }

      if (existingStory.creator_id !== user.id) {
        throw new Error('Unauthorized: You can only update your own stories')
      }

      // Don't auto-save published stories
      if (existingStory.is_published) {
        return
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.nodes !== undefined) {
        updateData.story_data = { nodes: updates.nodes }
      }

      await supabase
        .from('stories')
        .update(updateData)
        .eq('id', storyId)

      // Silent save - don't throw errors or return data
    } catch (error) {
      // Log error but don't throw for auto-save
      console.warn('Auto-save failed:', error)
    }
  }

  /**
   * Update an existing story
   */
  async updateStory(storyId: string, updates: UpdateStoryRequest): Promise<Story> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }

      // Check if user owns the story
      const { data: existingStory, error: fetchError } = await supabase
        .from('stories')
        .select('creator_id')
        .eq('id', storyId)
        .single()

      if (fetchError) {
        throw new Error(`Story not found: ${fetchError.message}`)
      }

      if (existingStory.creator_id !== user.id) {
        throw new Error('Unauthorized: You can only update your own stories')
      }

      const updateData: any = {}
      
      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.isPublished !== undefined) {
        updateData.is_published = updates.isPublished
        if (updates.isPublished) {
          updateData.published_at = new Date().toISOString()
        }
      }
      if (updates.nodes !== undefined) {
        updateData.story_data = { nodes: updates.nodes }
      }

      const { data, error } = await supabase
        .from('stories')
        .update(updateData)
        .eq('id', storyId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update story: ${error.message}`)
      }

      return this.mapDatabaseToStory(data)
    } catch (error) {
      console.error('Error updating story:', error)
      throw error
    }
  }

  /**
   * Publish a story after validation and moderation
   */
  async publishStory(storyId: string): Promise<void> {
    try {
      // Get the story first
      const story = await this.getStory(storyId)
      
      // Validate story structure
      const validation = this.validateStoryStructure(story)
      if (!validation.isValid) {
        throw new Error(`Cannot publish story: ${validation.errors.join(', ')}`)
      }

      // Run moderation checks
      const moderationResult = await this.moderateStoryContent(story)
      
      // Check if moderation passed
      if (moderationResult.status === 'rejected') {
        throw new Error(`Story cannot be published: Content violates community guidelines (${moderationResult.categories.join(', ')})`)
      }

      if (moderationResult.status === 'flagged' && moderationResult.reviewRequired) {
        throw new Error('Story requires manual review before publishing. Please try again later.')
      }

      // Update story to published
      await this.updateStory(storyId, { isPublished: true })
    } catch (error) {
      console.error('Error publishing story:', error)
      throw error
    }
  }

  /**
   * Get a story by ID
   */
  async getStory(storyId: string): Promise<Story> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single()

      if (error) {
        throw new Error(`Story not found: ${error.message}`)
      }

      return this.mapDatabaseToStory(data)
    } catch (error) {
      console.error('Error fetching story:', error)
      throw error
    }
  }

  /**
   * Get stories by creator
   */
  async getStoriesByCreator(creatorId: string): Promise<Story[]> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch stories: ${error.message}`)
      }

      return data.map(this.mapDatabaseToStory)
    } catch (error) {
      console.error('Error fetching creator stories:', error)
      throw error
    }
  }

  /**
   * Validate story structure for completeness and correctness
   */
  validateStoryStructure(story: Story): ValidationResult {
    const errors: string[] = []

    // Check if story has nodes
    if (!story.nodes || story.nodes.length === 0) {
      errors.push('Story must have at least one node')
      return { isValid: false, errors }
    }

    // Check for exactly one start node
    const startNodes = story.nodes.filter(node => node.isStartNode)
    if (startNodes.length === 0) {
      errors.push('Story must have exactly one start node')
    } else if (startNodes.length > 1) {
      errors.push('Story can only have one start node')
    }

    // Check for at least one end node
    const endNodes = story.nodes.filter(node => node.isEndNode)
    if (endNodes.length === 0) {
      errors.push('Story must have at least one end node')
    }

    // Validate each node
    story.nodes.forEach((node, index) => {
      // Check if node has video
      if (!node.videoId) {
        errors.push(`Node ${index + 1} must have a video`)
      }

      // End nodes should not have choices
      if (node.isEndNode && node.choices.length > 0) {
        errors.push(`End node ${index + 1} should not have choices`)
      }

      // Non-end nodes should have exactly 2 choices (as per requirements)
      if (!node.isEndNode && node.choices.length !== 2) {
        errors.push(`Non-end node ${index + 1} must have exactly 2 choices`)
      }

      // Validate choices
      node.choices.forEach((choice, choiceIndex) => {
        if (!choice.text || choice.text.trim().length === 0) {
          errors.push(`Node ${index + 1}, choice ${choiceIndex + 1} must have text`)
        }

        // Check if nextNodeId points to a valid node
        if (choice.nextNodeId) {
          const targetNode = story.nodes.find(n => n.id === choice.nextNodeId)
          if (!targetNode) {
            errors.push(`Node ${index + 1}, choice ${choiceIndex + 1} points to non-existent node`)
          }
        }
      })
    })

    // Check for orphaned nodes (nodes that can't be reached from start)
    const reachableNodes = this.findReachableNodes(story)
    const orphanedNodes = story.nodes.filter(node => !reachableNodes.has(node.id))
    if (orphanedNodes.length > 0) {
      errors.push(`Found ${orphanedNodes.length} unreachable nodes`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Find all nodes reachable from the start node
   */
  private findReachableNodes(story: Story): Set<string> {
    const startNode = story.nodes.find(node => node.isStartNode)
    if (!startNode) return new Set()

    const visited = new Set<string>()
    const queue = [startNode.id]

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!
      if (visited.has(currentNodeId)) continue

      visited.add(currentNodeId)
      const currentNode = story.nodes.find(node => node.id === currentNodeId)
      
      if (currentNode) {
        currentNode.choices.forEach(choice => {
          if (choice.nextNodeId && !visited.has(choice.nextNodeId)) {
            queue.push(choice.nextNodeId)
          }
        })
      }
    }

    return visited
  }

  /**
   * Moderate story content (title, description, and choice text)
   */
  private async moderateStoryContent(story: Story): Promise<ModerationResult> {
    try {
      // Combine all text content for moderation
      const textContent = [
        story.title,
        story.description || '',
        ...story.nodes.flatMap(node => 
          node.choices.map(choice => choice.text)
        )
      ].filter(text => text && text.trim().length > 0).join(' ')

      if (!textContent.trim()) {
        // If no text content, consider it approved
        return {
          contentId: story.id,
          contentType: 'text',
          status: 'approved',
          confidence: 0,
          categories: [],
          reviewRequired: false,
          scanTimestamp: new Date(),
          provider: 'openai'
        }
      }

      const moderationResult = await moderationService.scanText({
        text: textContent,
        contentId: story.id,
        userId: story.creatorId
      })

      return moderationResult
    } catch (error) {
      console.error('Story moderation failed:', error)
      // If moderation fails, err on the side of caution and require review
      return {
        contentId: story.id,
        contentType: 'text',
        status: 'flagged',
        confidence: 1,
        categories: ['moderation-error'],
        reviewRequired: true,
        scanTimestamp: new Date(),
        provider: 'openai'
      }
    }
  }

  /**
   * Get story preview data for creators
   */
  async getStoryPreview(storyId: string): Promise<{
    story: Story
    validation: ValidationResult
    moderationStatus?: ModerationResult
    isReadyToPublish: boolean
  }> {
    try {
      const story = await this.getStory(storyId)
      const validation = this.validateStoryStructure(story)
      
      let moderationStatus: ModerationResult | undefined
      let isReadyToPublish = false

      if (validation.isValid) {
        try {
          moderationStatus = await this.moderateStoryContent(story)
          isReadyToPublish = moderationStatus.status === 'approved'
        } catch (error) {
          console.warn('Moderation check failed during preview:', error)
          isReadyToPublish = false
        }
      }

      return {
        story,
        validation,
        moderationStatus,
        isReadyToPublish
      }
    } catch (error) {
      console.error('Error getting story preview:', error)
      throw error
    }
  }

  /**
   * Check moderation status for a story
   */
  async checkStoryModerationStatus(storyId: string): Promise<ModerationResult | null> {
    try {
      // For now, return null since we don't have a separate moderation_results table
      // Moderation results are stored in the stories table or handled differently
      return null
    } catch (error) {
      console.error('Failed to check story moderation status:', error)
      return null
    }
  }

  /**
   * Map database record to Story interface
   */
  private mapDatabaseToStory(data: any): Story {
    return {
      id: data.id,
      creatorId: data.creator_id,
      title: data.title,
      description: data.description,
      nodes: data.story_data?.nodes || [],
      isPublished: data.is_published,
      thumbnailUrl: data.thumbnail_url,
      viewCount: data.view_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      publishedAt: data.published_at ? new Date(data.published_at) : undefined
    }
  }
}

// Export singleton instance
export const storyService = new StoryService()