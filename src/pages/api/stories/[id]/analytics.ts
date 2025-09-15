import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { id } = req.query as { id?: string }
  if (!id) return res.status(400).json({ error: 'Story ID required' })
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('story_playthroughs')
      .select('path_taken, choices_made, completed_at, created_at')
      .eq('story_id', id)
      .limit(5000)
    if (error) throw error

    const nodeStats: Record<string, { visits: number; exits: number; choices: Record<string, number> }> = {}
    const pathCounts = new Map<string, number>()

    for (const r of data || []) {
      const path = (r as any).path_taken as string[]
      if (Array.isArray(path)) {
        path.forEach((nodeId, idx) => {
          const ns = (nodeStats[nodeId] = nodeStats[nodeId] || { visits: 0, exits: 0, choices: {} })
          ns.visits += 1
          if (idx === path.length - 1) ns.exits += 1
        })
        const key = path.join('>')
        pathCounts.set(key, (pathCounts.get(key) || 0) + 1)
      }
      const choices = (r as any).choices_made as Array<{ nodeId: string; choiceId: string }>
      if (Array.isArray(choices)) {
        for (const c of choices) {
          const ns = (nodeStats[c.nodeId] = nodeStats[c.nodeId] || { visits: 0, exits: 0, choices: {} })
          ns.choices[c.choiceId] = (ns.choices[c.choiceId] || 0) + 1
        }
      }
    }

    const nodes = Object.entries(nodeStats).map(([nodeId, s]) => ({ nodeId, visits: s.visits, exits: s.exits, choices: s.choices }))
    nodes.sort((a, b) => b.visits - a.visits)
    const topPaths = Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([key, count]) => ({ path: key.split('>'), count }))

    return res.status(200).json({ nodes, topPaths })
  } catch (e) {
    console.error('Story analytics error', e)
    return res.status(500).json({ error: 'Failed to compute analytics' })
  }
}

