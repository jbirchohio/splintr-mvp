import { NextApiRequest, NextApiResponse } from 'next'
import { storyService } from '@/services/story.service'
import { UpdateStoryRequest } from '@/types/story.types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID is required' })
  }

  try {
    switch (req.method) {
      case 'PUT':
        return await saveDraft(req, res, id)
      case 'PATCH':
        return await autoSaveDraft(req, res, id)
      default:
        res.setHeader('Allow', ['PUT', 'PATCH'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Draft API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function saveDraft(req: NextApiRequest, res: NextApiResponse, storyId: string) {
  try {
    const updateRequest: UpdateStoryRequest = req.body

    const story = await storyService.saveDraft(storyId, updateRequest)
    return res.status(200).json(story)
  } catch (error) {
    console.error('Error saving draft:', error)
    
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
      error: 'Failed to save draft',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function autoSaveDraft(req: NextApiRequest, res: NextApiResponse, storyId: string) {
  try {
    const updateRequest: Partial<UpdateStoryRequest> = req.body

    await storyService.autoSaveDraft(storyId, updateRequest)
    return res.status(200).json({ message: 'Auto-save completed' })
  } catch (error) {
    // Auto-save should be silent - log but don't return errors
    console.warn('Auto-save failed:', error)
    return res.status(200).json({ message: 'Auto-save attempted' })
  }
}