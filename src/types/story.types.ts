export interface Choice {
  id: string
  text: string
  nextNodeId: string | null
}

export interface StoryNode {
  id: string
  videoId: string
  choices: Choice[]
  isStartNode: boolean
  isEndNode: boolean
}

export interface Story {
  id: string
  creatorId: string
  title: string
  description?: string
  nodes: StoryNode[]
  isPublished: boolean
  thumbnailUrl?: string
  viewCount: number
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface CreateStoryRequest {
  title: string
  description?: string
  nodes: Omit<StoryNode, 'id'>[]
}

export interface UpdateStoryRequest {
  title?: string
  description?: string
  nodes?: StoryNode[]
  isPublished?: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface StoryService {
  createStory(story: CreateStoryRequest): Promise<Story>
  updateStory(storyId: string, updates: UpdateStoryRequest): Promise<Story>
  publishStory(storyId: string): Promise<void>
  getStory(storyId: string): Promise<Story>
  validateStoryStructure(story: Story): ValidationResult
}

export interface StoryPlaythrough {
  id: string
  storyId: string
  viewerId?: string
  pathTaken: string[]
  completedAt?: Date
  sessionId: string
  createdAt: Date
}

export interface StoryPreviewData {
  story: Story
  validation: ValidationResult
  moderationStatus?: any // ModerationResult from moderation.types
  isReadyToPublish: boolean
}

export interface StoryMetadata {
  title: string
  description?: string
}

export interface DraftSaveRequest extends Partial<UpdateStoryRequest> {
  // Extends UpdateStoryRequest for draft-specific operations
}

export interface AutoSaveRequest extends Partial<UpdateStoryRequest> {
  // For silent auto-save operations
}