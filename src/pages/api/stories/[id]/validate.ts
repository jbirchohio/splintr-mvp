import { NextApiRequest, NextApiResponse } from 'next'
import { storyService } from '@/services/story.service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID is required' })
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const story = await storyService.getStory(id)
    const validation = storyService.validateStoryStructure(story)
    
    return res.status(200).json(validation)
  } catch (error) {
    console.error('Error validating story:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Story not found' })
      }
    }
    
    return res.status(500).json({ 
      error: 'Failed to validate story',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}