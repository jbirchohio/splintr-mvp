import { NextApiRequest, NextApiResponse } from 'next'
import { storyService } from '@/services/story.service'
import { CreateStoryRequest } from '@/types/story.types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'POST':
        return await createStory(req, res)
      case 'GET':
        return await getStories(req, res)
      default:
        res.setHeader('Allow', ['POST', 'GET'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Stories API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function createStory(req: NextApiRequest, res: NextApiResponse) {
  try {
    const createRequest: CreateStoryRequest = req.body

    // Validate required fields
    if (!createRequest.title || createRequest.title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' })
    }

    if (!createRequest.nodes || createRequest.nodes.length === 0) {
      return res.status(400).json({ error: 'Story must have at least one node' })
    }

    const story = await storyService.createStory(createRequest)
    return res.status(201).json(story)
  } catch (error) {
    console.error('Error creating story:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return res.status(401).json({ error: 'Authentication required' })
      }
    }
    
    return res.status(500).json({ 
      error: 'Failed to create story',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function getStories(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { creatorId } = req.query

    if (creatorId && typeof creatorId === 'string') {
      const stories = await storyService.getStoriesByCreator(creatorId)
      return res.status(200).json(stories)
    }

    // If no creatorId provided, return error for now
    // In the future, this could return public stories
    return res.status(400).json({ error: 'creatorId parameter is required' })
  } catch (error) {
    console.error('Error fetching stories:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch stories',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}