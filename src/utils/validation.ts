import { z } from 'zod'
import { VIDEO_CONSTRAINTS, STORY_CONSTRAINTS } from './constants'

// Video validation schemas
export const videoMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  duration: z.number()
    .min(VIDEO_CONSTRAINTS.MIN_DURATION, `Video must be at least ${VIDEO_CONSTRAINTS.MIN_DURATION} seconds`)
    .max(VIDEO_CONSTRAINTS.MAX_DURATION, `Video must be no more than ${VIDEO_CONSTRAINTS.MAX_DURATION} seconds`),
  size: z.number()
    .max(VIDEO_CONSTRAINTS.MAX_FILE_SIZE, `File size must not exceed ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB`),
})

// Story validation schemas
export const choiceSchema = z.object({
  id: z.string(),
  text: z.string()
    .min(1, 'Choice text is required')
    .max(STORY_CONSTRAINTS.MAX_CHOICE_TEXT_LENGTH, `Choice text must not exceed ${STORY_CONSTRAINTS.MAX_CHOICE_TEXT_LENGTH} characters`),
  nextNodeId: z.string().nullable(),
})

export const storyNodeSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  choices: z.array(choiceSchema)
    .length(STORY_CONSTRAINTS.CHOICES_PER_NODE, `Each node must have exactly ${STORY_CONSTRAINTS.CHOICES_PER_NODE} choices`),
  isStartNode: z.boolean(),
  isEndNode: z.boolean(),
})

export const createStorySchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(STORY_CONSTRAINTS.MAX_TITLE_LENGTH, `Title must not exceed ${STORY_CONSTRAINTS.MAX_TITLE_LENGTH} characters`),
  description: z.string()
    .max(STORY_CONSTRAINTS.MAX_DESCRIPTION_LENGTH, `Description must not exceed ${STORY_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`)
    .optional(),
  nodes: z.array(storyNodeSchema.omit({ id: true }))
    .min(1, 'Story must have at least one node'),
})

export const updateStorySchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(STORY_CONSTRAINTS.MAX_TITLE_LENGTH, `Title must not exceed ${STORY_CONSTRAINTS.MAX_TITLE_LENGTH} characters`)
    .optional(),
  description: z.string()
    .max(STORY_CONSTRAINTS.MAX_DESCRIPTION_LENGTH, `Description must not exceed ${STORY_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`)
    .optional(),
  nodes: z.array(storyNodeSchema).optional(),
  isPublished: z.boolean().optional(),
})

// User validation schemas
export const userProfileSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  avatar: z.string().url('Invalid avatar URL').optional(),
})

// Utility functions
export function validateVideoFile(file: File): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!VIDEO_CONSTRAINTS.SUPPORTED_FORMATS.includes(file.type as typeof VIDEO_CONSTRAINTS.SUPPORTED_FORMATS[number])) {
    errors.push(`Unsupported file type. Supported formats: ${VIDEO_CONSTRAINTS.SUPPORTED_FORMATS.join(', ')}`)
  }

  if (file.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB limit`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}