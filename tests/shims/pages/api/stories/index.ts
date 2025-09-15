import { NextApiRequest, NextApiResponse } from 'next'
import { storyService } from '@/services/story.service'
import { CreateStoryRequest } from '@/types/story.types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const body = req.body as Partial<CreateStoryRequest>

      if (!body?.title || body.title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' })
      }
      if (!Array.isArray(body.nodes) || body.nodes.length === 0) {
        return res.status(400).json({ error: 'Story must have at least one node' })
      }

      const created = await storyService.createStory({
        title: body.title,
        description: body.description,
        nodes: body.nodes,
      })
      return res.status(201).json(created)
    }

    if (req.method === 'GET') {
      const { creatorId } = req.query

      if (!creatorId || typeof creatorId !== 'string') {
        return res.status(400).json({ error: 'creatorId parameter is required' })
      }

      const stories = await storyService.getStoriesByCreator(creatorId)
      return res.status(200).json(stories)
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

