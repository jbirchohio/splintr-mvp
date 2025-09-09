import { z } from 'zod'
import { commonSchemas } from './validation-middleware'
import { VIDEO_CONSTRAINTS, STORY_CONSTRAINTS } from '@/utils/constants'

// Authentication schemas
export const authSchemas = {
  // OAuth callback
  callback: z.object({
    code: z.string().min(1, 'Authorization code is required'),
    state: z.string().optional()
  }),
  
  // Token refresh
  refresh: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
}

// User schemas
export const userSchemas = {
  // Profile update
  updateProfile: z.object({
    name: commonSchemas.name,
    avatar_url: commonSchemas.url.optional().or(z.literal(''))
  }),
  
  // Avatar upload
  avatarUpload: z.object({
    avatar: z.instanceof(File)
      .refine(
        (file) => file.size <= 5 * 1024 * 1024,
        'File size must be less than 5MB'
      )
      .refine(
        (file) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
        'File must be JPEG, PNG, WebP, or GIF'
      )
  }),
  
  // Path parameters
  userParams: z.object({
    userId: commonSchemas.uuid
  })
}

// Video schemas
export const videoSchemas = {
  // Video upload
  upload: z.object({
    video: z.instanceof(File)
      .refine(
        (file) => file.size <= VIDEO_CONSTRAINTS.MAX_FILE_SIZE,
        `File size must be less than ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB`
      )
      .refine(
        (file) => VIDEO_CONSTRAINTS.SUPPORTED_FORMATS.includes(file.type as any),
        `File must be one of: ${VIDEO_CONSTRAINTS.SUPPORTED_FORMATS.join(', ')}`
      ),
    title: commonSchemas.title.optional(),
    description: commonSchemas.description.optional()
  }),
  
  // Video metadata update
  updateMetadata: z.object({
    title: commonSchemas.title.optional(),
    description: commonSchemas.description.optional()
  }),
  
  // Video processing
  process: z.object({
    videoId: commonSchemas.uuid,
    options: z.object({
      generateThumbnail: z.boolean().default(true),
      optimizeForStreaming: z.boolean().default(true)
    }).optional()
  }),
  
  // Path parameters
  videoParams: z.object({
    videoId: commonSchemas.uuid
  }),
  
  // Query parameters
  videoQuery: z.object({
    creatorId: commonSchemas.uuid.optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    ...commonSchemas.pagination.shape
  })
}

// Story schemas
export const storySchemas = {
  // Choice validation
  choice: z.object({
    id: commonSchemas.uuid,
    text: commonSchemas.choiceText,
    nextNodeId: commonSchemas.uuid.nullable()
  }),
  
  // Story node validation
  node: z.object({
    id: commonSchemas.uuid,
    videoId: commonSchemas.uuid,
    choices: z.array(z.lazy(() => storySchemas.choice))
      .length(STORY_CONSTRAINTS.CHOICES_PER_NODE, 
        `Each node must have exactly ${STORY_CONSTRAINTS.CHOICES_PER_NODE} choices`),
    isStartNode: z.boolean(),
    isEndNode: z.boolean()
  }),
  
  // Create story
  create: z.object({
    title: commonSchemas.title,
    description: commonSchemas.description.optional(),
    nodes: z.array(z.object({
      videoId: commonSchemas.uuid,
      choices: z.array(z.object({
        text: commonSchemas.choiceText,
        nextNodeId: commonSchemas.uuid.nullable()
      })).length(STORY_CONSTRAINTS.CHOICES_PER_NODE),
      isStartNode: z.boolean(),
      isEndNode: z.boolean()
    })).min(1, 'Story must have at least one node')
  }),
  
  // Update story
  update: z.object({
    title: commonSchemas.title.optional(),
    description: commonSchemas.description.optional(),
    nodes: z.array(z.lazy(() => storySchemas.node)).optional(),
    isPublished: z.boolean().optional()
  }),
  
  // Publish story
  publish: z.object({
    storyId: commonSchemas.uuid
  }),
  
  // Path parameters
  storyParams: z.object({
    storyId: commonSchemas.uuid
  }),
  
  // Query parameters
  storyQuery: z.object({
    creatorId: commonSchemas.uuid.optional(),
    isPublished: z.coerce.boolean().optional(),
    ...commonSchemas.pagination.shape
  })
}

// Feed schemas
export const feedSchemas = {
  // Public feed query
  publicFeed: z.object({
    ...commonSchemas.pagination.shape,
    category: z.string().optional(),
    sortBy: z.enum(['newest', 'popular', 'trending']).default('newest')
  }),
  
  // Creator feed query
  creatorFeed: z.object({
    creatorId: commonSchemas.uuid,
    ...commonSchemas.pagination.shape
  }),
  
  // Path parameters
  feedParams: z.object({
    creatorId: commonSchemas.uuid
  })
}

// Moderation schemas
export const moderationSchemas = {
  // Content scan request
  scan: z.object({
    contentType: z.enum(['video', 'text', 'image']),
    contentId: commonSchemas.uuid,
    content: z.string().optional(), // For text content
    priority: z.enum(['low', 'normal', 'high']).default('normal')
  }),
  
  // Flag content
  flag: z.object({
    contentType: z.enum(['story', 'video', 'comment']),
    contentId: commonSchemas.uuid,
    reason: z.enum([
      'spam',
      'harassment',
      'hate_speech',
      'violence',
      'sexual_content',
      'copyright',
      'misinformation',
      'other'
    ]),
    description: z.string()
      .max(500, 'Description must be less than 500 characters')
      .optional()
  }),
  
  // Review flagged content
  review: z.object({
    flagId: commonSchemas.uuid,
    decision: z.enum(['approve', 'reject', 'remove']),
    notes: z.string()
      .max(1000, 'Notes must be less than 1000 characters')
      .optional()
  }),
  
  // Path parameters
  moderationParams: z.object({
    contentId: commonSchemas.uuid,
    flagId: commonSchemas.uuid.optional()
  }),
  
  // Query parameters
  moderationQuery: z.object({
    status: z.enum(['pending', 'reviewed', 'dismissed']).optional(),
    contentType: z.enum(['story', 'video', 'comment']).optional(),
    ...commonSchemas.pagination.shape
  })
}

// Analytics schemas
export const analyticsSchemas = {
  // Track story playthrough
  playthrough: z.object({
    storyId: commonSchemas.uuid,
    pathTaken: z.array(commonSchemas.uuid),
    completed: z.boolean(),
    duration: z.number().int().min(0), // seconds
    choices: z.array(z.object({
      nodeId: commonSchemas.uuid,
      choiceId: commonSchemas.uuid,
      timestamp: z.number().int().min(0)
    }))
  }),
  
  // Track engagement
  engagement: z.object({
    contentType: z.enum(['story', 'video']),
    contentId: commonSchemas.uuid,
    action: z.enum(['view', 'like', 'share', 'comment', 'complete']),
    metadata: z.record(z.any()).optional()
  })
}

// Search schemas
export const searchSchemas = {
  // Search query
  search: z.object({
    q: z.string()
      .min(1, 'Search query is required')
      .max(100, 'Search query must be less than 100 characters')
      .transform(val => val.trim()),
    type: z.enum(['stories', 'creators', 'all']).default('all'),
    ...commonSchemas.pagination.shape
  })
}

// Admin schemas
export const adminSchemas = {
  // User management
  updateUser: z.object({
    userId: commonSchemas.uuid,
    status: z.enum(['active', 'suspended', 'banned']).optional(),
    role: z.enum(['user', 'creator', 'moderator', 'admin']).optional(),
    notes: z.string().max(1000).optional()
  }),
  
  // Content management
  updateContent: z.object({
    contentId: commonSchemas.uuid,
    status: z.enum(['active', 'hidden', 'removed']).optional(),
    moderationNotes: z.string().max(1000).optional()
  }),
  
  // System settings
  updateSettings: z.object({
    key: z.string().min(1).max(100),
    value: z.any(),
    description: z.string().max(500).optional()
  })
}

// Export all schemas
export const validationSchemas = {
  auth: authSchemas,
  user: userSchemas,
  video: videoSchemas,
  story: storySchemas,
  feed: feedSchemas,
  moderation: moderationSchemas,
  analytics: analyticsSchemas,
  search: searchSchemas,
  admin: adminSchemas,
  common: commonSchemas
}