import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { createServerClient } from '@/lib/supabase'

function assignVariant(userId?: string, explicit?: string) {
  if (explicit) return explicit
  if (userId) {
    // simple hash for stable bucketing
    let h = 0
    for (let i = 0; i < userId.length; i++) { h = ((h << 5) - h) + userId.charCodeAt(i); h |= 0 }
    return (Math.abs(h) % 2) === 0 ? 'A' : 'B'
  }
  return Math.random() < 0.5 ? 'A' : 'B'
}

export const GET = withSecurity(
  withValidation({ querySchema: validationSchemas.feed.publicFeed })(async (req, { query, user }) => {
    const supabase = createServerClient()
    const page = Number((query as any)?.page || 1)
    const limit = Number((query as any)?.limit || 20)
    const variant = assignVariant(user?.id, (query as any)?.variant as any)

    // Fetch a candidate pool (oversample) for personalization
    const poolSize = Math.max(limit * 3, 60)
    const { data: stories, error } = await supabase
      .from('stories')
      .select('id, creator_id, title, description, thumbnail_url, view_count, published_at, is_premium, tip_enabled, category')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(poolSize)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
    }

    const storyIds = (stories || []).map(s => s.id)

    // Load engagement metrics and like counts for scoring
    const [likesRes, engageRes, velRes, authRes] = await Promise.all([
      supabase.from('story_like_counts').select('story_id, like_count').in('story_id', storyIds),
      supabase.from('story_engagement_metrics').select('story_id, total_views, completions, replay_users').in('story_id', storyIds),
      supabase.from('story_velocity').select('story_id, views_48h, likes_48h, comments_48h, shares_48h, completes_48h').in('story_id', storyIds),
      supabase.from('creator_authority').select('creator_id, follower_count, avg_completion_rate').in('creator_id', (stories || []).map(s => s.creator_id as any))
    ])

    const likeMap = new Map<string, number>((likesRes.data || []).map(r => [r.story_id as any, r.like_count as any]))
    const engMap = new Map<string, { total_views: number; completions: number; replay_users: number }>(
      (engageRes.data || []).map(r => [r.story_id as any, { total_views: r.total_views as any, completions: r.completions as any, replay_users: r.replay_users as any }])
    )

    // Followed creators for user boost
    let followed = new Set<string>()
    if (user) {
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
      followed = new Set((follows || []).map(f => f.following_id as string))
    }

    // Exclude recently exposed stories for user/session (last 24h)
    const sessionId = req.headers.get('x-session-id') || undefined
    let exclude = new Set<string>()
    if (user?.id || sessionId) {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const q = supabase.from('feed_exposures').select('story_id')
      if (user?.id) q.eq('user_id', user.id)
      if (!user?.id && sessionId) q.eq('session_id', sessionId)
      const { data: exp } = await q.gte('created_at', since)
      exclude = new Set((exp || []).map(e => e.story_id as string))
    }
    // Creator cooldown penalty (last 4h)
    const creatorSeen: Record<string, number> = {}
    if (user?.id || sessionId) {
      const since4h = new Date(Date.now() - 4 * 3600 * 1000).toISOString()
      const q2 = supabase.from('feed_exposures').select('story_id, stories!inner(creator_id)').gte('created_at', since4h)
      if (user?.id) q2.eq('user_id', user.id)
      if (!user?.id && sessionId) q2.eq('session_id', sessionId)
      const { data: exp2 } = await q2
      for (const e of exp2 || []) {
        const cid = (e as any).stories.creator_id as string
        creatorSeen[cid] = (creatorSeen[cid] || 0) + 1
      }
    }

    // CF-lite: user-topic affinity + co-engagement
    let topicBoost: Map<string, number> = new Map()
    let coengBoost: Map<string, number> = new Map()
    if (user?.id) {
      try {
        // User recent interactions → top tags
        const since = new Date(Date.now() - 30*24*3600*1000).toISOString()
        const { data: myInts } = await supabase.from('user_interactions').select('story_id').eq('user_id', user.id).gte('created_at', since).limit(50)
        const myStoryIds = (myInts || []).map((i:any)=>i.story_id)
        if (myStoryIds.length) {
          const { data: myTags } = await supabase.from('story_hashtags').select('story_id, tag').in('story_id', myStoryIds)
          const tagCounts = new Map<string, number>()
          for (const t of myTags || []) tagCounts.set((t as any).tag, (tagCounts.get((t as any).tag)||0)+1)
          // candidate story tags
          const { data: candTags } = await supabase.from('story_hashtags').select('story_id, tag').in('story_id', storyIds)
          for (const ct of candTags || []) {
            const sid = (ct as any).story_id as string; const tg = (ct as any).tag as string
            const w = (tagCounts.get(tg)||0)
            if (w>0) topicBoost.set(sid, (topicBoost.get(sid)||0) + Math.min(0.2, 0.02*w))
          }
          // co-engagement: users who interacted with my stories and their interactions on candidate stories
          const { data: others } = await supabase.from('user_interactions').select('user_id, story_id').in('story_id', myStoryIds).neq('user_id', user.id).limit(500)
          const otherIds = Array.from(new Set((others||[]).map((o:any)=>o.user_id).filter(Boolean)))
          if (otherIds.length) {
            const { data: otherInts } = await supabase.from('user_interactions').select('story_id').in('user_id', otherIds).in('story_id', storyIds)
            for (const oi of otherInts || []) {
              const sid = (oi as any).story_id as string
              coengBoost.set(sid, (coengBoost.get(sid)||0)+0.02)
            }
          }
        }
      } catch {}
    }

    // Scoring
    const veMap = new Map<string, any>((velRes.data || []).map(r => [r.story_id as any, r]))
    const authMap = new Map<string, any>((authRes.data || []).map(r => [r.creator_id as any, r]))
    const scored = (stories || []).filter(s => !exclude.has(s.id as any)).map(s => {
      const likes = likeMap.get(s.id as any) || 0
      const eng = engMap.get(s.id as any)
      const totalViews = eng?.total_views || (s.view_count || 0)
      const completions = eng?.completions || 0
      const completionRate = totalViews > 0 ? completions / totalViews : 0
      const replayUsers = eng?.replay_users || 0
      const replayWeight = Math.tanh(replayUsers / 20)
      const followBoost = user && followed.has(s.creator_id as any) ? 0.5 : 0
      // recency decay in hours
      const hours = s.published_at ? (Date.now() - new Date(s.published_at as any).getTime()) / 3600000 : 0
      const recency = Math.max(0, 1 - hours / 72) // within 3 days
      const diversity = Math.random() * 0.05 // small diversity injection
      // velocity and authority
      const vel = veMap.get(s.id as any)
      const vScore = vel ? (vel.likes_48h * 0.4 + vel.comments_48h * 0.6 + vel.shares_48h * 0.8 + vel.completes_48h * 1.0) / 10 : 0
      const auth = authMap.get(s.creator_id as any)
      const aScore = auth ? (Math.tanh((auth.follower_count || 0) / 1000) * 0.3 + (auth.avg_completion_rate || 0) * 0.7) : 0
      // A/B parameterization
      const weights = variant === 'B'
        ? { comp: 0.28, likes: 0.22, recency: 0.12, replay: 0.1, follow: followBoost, vel: 0.18, auth: 0.1 }
        : { comp: 0.32, likes: 0.22, recency: 0.12, replay: 0.1, follow: followBoost, vel: 0.14, auth: 0.1 }
      let score = weights.comp * completionRate
        + weights.likes * Math.tanh(likes / 50)
        + weights.recency * recency
        + weights.replay * replayWeight
        + weights.vel * vScore
        + weights.auth * aScore
        + weights.follow
        + diversity
      score += (topicBoost.get(s.id as any) || 0) + (coengBoost.get(s.id as any) || 0)
      const seen = creatorSeen[s.creator_id as any] || 0
      if (seen > 0) score -= Math.min(0.2, 0.05 * seen) // cooldown penalty
      return { story: s, score }
    })

    scored.sort((a, b) => b.score - a.score)
    const start = (page - 1) * limit
    // Enforce per-creator max to improve diversity
    const maxPerCreator = 2
    const perCreator: Record<string, number> = {}
    const selected: typeof scored = []
    for (const item of scored) {
      const cid = item.story.creator_id as any as string
      if ((perCreator[cid] || 0) >= maxPerCreator) continue
      perCreator[cid] = (perCreator[cid] || 0) + 1
      selected.push(item)
      if (selected.length >= start + limit) break
    }
    const pageItems = selected.slice(start, start + limit).map(r => r.story)

    // Log exposures for analytics/experiments
    try {
      const rows = pageItems.map((s, idx) => ({
        user_id: user?.id || null,
        session_id: sessionId || null,
        variant,
        story_id: s.id,
        position: start + idx + 1
      }))
      if (rows.length) await supabase.from('feed_exposures').insert(rows as any)
    } catch {}

    return NextResponse.json({
      stories: pageItems,
      pagination: {
        page,
        limit,
        total: scored.length,
        totalPages: Math.ceil(scored.length / limit)
      },
      assignedVariant: variant
    })
  })
)
