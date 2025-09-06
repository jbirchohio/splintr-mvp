import { NextApiRequest, NextApiResponse } from 'next'
import { storyService } from '@/services/story.service'

interface MetadataUpdateRequest {
  title?: string
  description?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID is required' })
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title, description }: MetadataUpdateRequest = req.body

    // Validate input
    if (title !== undefined && (!title || title.trim().length === 0)) {
      return res.status(400).json({ error: 'Title cannot be empty' })
    }

    if (title && title.length > 200) {
      return res.status(400).json({ error: 'Title cannot exceed 200 characters' })
    }

    if (description && description.length > 1000) {
      return res.status(400).json({ error: 'Description cannot exceed 1000 characters' })
    }

    const updateData: { title?: string; description?: string } = {}
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description.trim()

    const story = await storyService.updateStory(id, updateData)
    return res.status(200).json(story)
  } catch (error) {
    console.error('Error updating story metadata:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Story not found' })
      }
      if (error.message.includes('not authenticated')) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: 'Unauthorized' })
      }
    }
    
    return res.status(500).json({ 
      error: 'Failed to update story metadata',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}