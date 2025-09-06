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
      case 'GET':
        return await getStory(req, res, id)
      case 'PUT':
        return await updateStory(req, res, id)
      case 'DELETE':
        return await deleteStory(req, res, id)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Story API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function getStory(req: NextApiRequest, res: NextApiResponse, storyId: string) {
  try {
    const story = await storyService.getStory(storyId)
    return res.status(200).json(story)
  } catch (error) {
    console.error('Error fetching story:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Story not found' })
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch story',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function updateStory(req: NextApiRequest, res: NextApiResponse, storyId: string) {
  try {
    const updateRequest: UpdateStoryRequest = req.body

    const story = await storyService.updateStory(storyId, updateRequest)
    return res.status(200).json(story)
  } catch (error) {
    console.error('Error updating story:', error)
    
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
      error: 'Failed to update story',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function deleteStory(req: NextApiRequest, res: NextApiResponse, storyId: string) {
  // TODO: Implement delete functionality
  // For MVP, we might not need delete functionality
  return res.status(501).json({ error: 'Delete functionality not implemented' })
}