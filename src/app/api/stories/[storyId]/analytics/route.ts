import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withSecurity } from '@/lib/security-middleware'

// Returns node-level analytics: visits, exits, choice CTR, and top paths
export const GET = withSecurity(async (_req, { params, user }) => {
  const { storyId } = params as any
  const supabase = createServerClient()

  // Fetch playthroughs
  const { data: pts, error } = await supabase
    .from('story_playthroughs')
    .select('path_taken, choices_made, is_completed, created_at')
    .eq('story_id', storyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const visits: Record<string, number> = {}
  const exits: Record<string, number> = {}
  const choiceCtr: Record<string, Record<string, number>> = {}
  const pathCounts = new Map<string, number>()

  for (const p of pts || []) {
    const path = (p as any).path_taken as string[]
    path.forEach((nodeId: string, idx: number) => { visits[nodeId] = (visits[nodeId] || 0) + 1; if (idx === path.length - 1) exits[nodeId] = (exits[nodeId] || 0) + 1 })
    const choices = ((p as any).choices_made || []) as Array<{ nodeId: string, choiceId: string }>
    for (const c of choices) {
      choiceCtr[c.nodeId] = choiceCtr[c.nodeId] || {}
      choiceCtr[c.nodeId][c.choiceId] = (choiceCtr[c.nodeId][c.choiceId] || 0) + 1
    }
    const key = path.join('->')
    pathCounts.set(key, (pathCounts.get(key) || 0) + 1)
  }

  const topPaths = Array.from(pathCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 20).map(([p, count]) => ({ path: p.split('->'), count }))
  const nodes = Object.keys(visits).map(nodeId => ({ nodeId, visits: visits[nodeId] || 0, exits: exits[nodeId] || 0, choices: choiceCtr[nodeId] || {} }))
  return NextResponse.json({ nodes, topPaths })
})

