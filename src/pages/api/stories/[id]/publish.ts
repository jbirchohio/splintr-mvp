import { NextApiRequest, NextApiResponse } from 'next'
import { storyService } from '@/services/story.service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID is required' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await storyService.publishStory(id)
    return res.status(200).json({ message: 'Story published successfully' })
  } catch (error) {
    console.error('Error publishing story:', error)
    
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
      if (error.message.includes('Cannot publish story')) {
        return res.status(400).json({ error: error.message })
      }
    }
    
    return res.status(500).json({ 
      error: 'Failed to publish story',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}