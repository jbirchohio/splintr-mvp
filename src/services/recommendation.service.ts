import { createServerClient } from '@/lib/supabase'
import { RecsConfigService, FypWeights } from '@/services/recs-config.service'

type StoryRow = {
  id: string
  creator_id: string
  title: string
  description?: string | null
  thumbnail_url?: string | null
  view_count?: number | null
  published_at: string
  is_premium?: boolean | null
  tip_enabled?: boolean | null
  category?: string | null
}

export class RecommendationService {
  // Public API: get personalized For You page
  static async getForYou(params: {
    userId?: string | null
    sessionId?: string | null
    limit: number
    offset: number
    variant?: string | null
  }): Promise<{ items: StoryRow[]; total: number; debug?: any }>{
    const { userId = null, limit, offset } = params
    const supabase = createServerClient()

    // Pool: recent published stories (cap to 600 for safety)
    const { data: pool, error: poolErr } = await supabase
      .from('stories')
      .select('id, creator_id, title, description, thumbnail_url, view_count, published_at, is_premium, tip_enabled, category')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(600)
    if (poolErr) throw poolErr

    // Signals
    const signals = await this.getUserSignals(userId)

    // Load auxiliary metrics
    const storyIds = (pool || []).map(s => s.id)
    const [metricsByStory, authorityByCreator] = await Promise.all([
      this.fetchStoryMetrics(storyIds),
      this.fetchCreatorAuthority(Array.from(new Set((pool || []).map(s => s.creator_id))))
    ])

    // Load variant weights
    const weights = await RecsConfigService.getFypWeights(params.variant)

    // Collaborative filtering boosts (variant-controlled)
    const enableCF = !!userId && !!weights.cfEnabled
    const cfBoosts = enableCF
      ? await this.computeCFBoosts(userId!, signals.engagedStoryIds)
      : new Map<string, number>()

    // Score pool using weights
    const scored = this.scoreStories(pool || [], signals, cfBoosts, weights, metricsByStory, authorityByCreator)

    // Diversity injection
    const diversified = this.reRankWithDiversity(scored, weights.diversity)

    const total = diversified.length
    const pageItems = diversified.slice(offset, offset + limit).map(s => s.story)

    // Sorted CF sample for debugging
    const cfSorted = Array.from(cfBoosts.entries()).sort((a, b) => b[1] - a[1])

    const debug = {
      poolCount: pool?.length || 0,
      signals: {
        followedCreators: Array.from(signals.followedCreators).slice(0, 10),
        categoryAffinities: Array.from(signals.categoryAffinities.entries()).slice(0, 10),
        engagedCount: signals.engagedStoryIds.size,
      },
      cfSample: cfSorted.slice(0, 10),
      topSample: diversified.slice(0, 10).map(d => ({ id: d.story.id, score: d.score, reasons: d.reasons }))
      ,weights
    }

    return { items: pageItems, total, debug }
  }

  static async logFeedExposures(params: {
    userId?: string | null
    sessionId?: string | null
    variant?: string | null
    storyIds: string[]
    startPosition?: number
  }): Promise<void> {
    try {
      const { userId = null, sessionId = null, variant = null, storyIds, startPosition = 0 } = params
      if (!storyIds.length) return
      const supabase = createServerClient()
      const rows = storyIds.map((id, idx) => ({
        user_id: userId,
        session_id: sessionId,
        variant: variant || undefined,
        story_id: id,
        position: startPosition + idx,
      }))
      await supabase.from('feed_exposures').insert(rows)
    } catch (e) {
      // best effort
      console.warn('logFeedExposures failed', e)
    }
  }

  // Aggregate user signals for personalization
  private static async getUserSignals(userId?: string | null): Promise<{
    followedCreators: Set<string>
    categoryAffinities: Map<string, number>
    hasHistory: boolean
    engagedStoryIds: Set<string>
  }> {
    const supabase = createServerClient()
    let followedCreators = new Set<string>()
    const categoryAffinities = new Map<string, number>()
    let hasHistory = false
    const engagedStoryIds = new Set<string>()

    if (!userId) return { followedCreators, categoryAffinities, hasHistory, engagedStoryIds }

    const [{ data: f }, { data: evs }] = await Promise.all([
      supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId),
      supabase
        .from('user_interactions')
        .select('story_id, type')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
        .limit(2000)
    ])

    followedCreators = new Set((f || []).map((r: any) => r.following_id))
    const storyIds = Array.from(new Set((evs || []).map((e: any) => e.story_id).filter(Boolean)))
    storyIds.forEach(id => engagedStoryIds.add(id))
    hasHistory = (evs || []).length > 0
    if (storyIds.length) {
      const { data: engagedStories } = await supabase
        .from('stories')
        .select('id, category')
        .in('id', storyIds)
      for (const s of engagedStories || []) {
        const c = (s as any).category as string | null
        if (!c) continue
        categoryAffinities.set(c, (categoryAffinities.get(c) || 0) + 1)
      }
    }
    return { followedCreators, categoryAffinities, hasHistory, engagedStoryIds }
  }

  // Score stories combining freshness, social proof, creator and category signals
  private static scoreStories(
    pool: StoryRow[],
    signals: { followedCreators: Set<string>; categoryAffinities: Map<string, number>; hasHistory: boolean },
    cfBoosts: Map<string, number>,
    weights: FypWeights,
    metricsByStory: Map<string, { completionRate: number; velocity: { views: number; likes: number; completes: number } }>,
    authorityByCreator: Map<string, { followerCount: number; avgCompletionRate: number }>
  ) {
    const now = Date.now()
    return pool.map(s => {
      let score = 0
      const reasons: string[] = []
      // Freshness: within 72h decreasing
      const ageH = (now - new Date(s.published_at).getTime()) / 3600000
      const freshness = Math.max(0, (weights.freshnessHours ?? 72) - ageH) * (weights.freshnessFactor ?? 0.25)
      score += freshness
      if (freshness > 0) reasons.push(`fresh+${freshness.toFixed(2)}`)
      // Social proof
      const sp = Math.min(weights.socialProofCap ?? 50, (s.view_count || 0) * (weights.socialProofFactor ?? 0.001))
      if (sp) { score += sp; reasons.push(`social+${sp.toFixed(2)}`) }
      // Followed creator boost
      if (signals.followedCreators.has(s.creator_id)) { score += (weights.followedBoost ?? 10); reasons.push(`followed+${weights.followedBoost ?? 10}`) }
      // Category affinity
      if (s.category && signals.categoryAffinities.has(s.category)) {
        const aff = (signals.categoryAffinities.get(s.category) || 0) * (weights.categoryAffinityFactor ?? 0.5)
        score += aff
        reasons.push(`cat+${s.category}+${aff.toFixed(2)}`)
      }
      // Collaborative filtering boost
      const cf = Math.min(weights.cfMaxBoost ?? 6, cfBoosts.get(s.id) || 0)
      if (cf) { score += cf; reasons.push(`cf+${cf.toFixed(2)}`) }

      // Completion rate boost
      const m = metricsByStory.get(s.id)
      if (m && m.completionRate && (weights.completionBoostFactor || 0) > 0) {
        const cboost = (weights.completionBoostFactor || 0) * m.completionRate
        score += cboost
        reasons.push(`comp+${cboost.toFixed(2)}`)
      }

      // Velocity boosts
      if (m && m.velocity) {
        const vb = (m.velocity.views * (weights.velocityViewFactor || 0))
          + (m.velocity.likes * (weights.velocityLikeFactor || 0))
          + (m.velocity.completes * (weights.velocityCompleteFactor || 0))
        if (vb) { score += vb; reasons.push(`vel+${vb.toFixed(2)}`) }
      }

      // Creator authority
      const a = authorityByCreator.get(s.creator_id)
      if (a) {
        const ab = (a.followerCount * (weights.authorityFollowerFactor || 0))
          + (a.avgCompletionRate * (weights.authorityCompletionFactor || 0))
        if (ab) { score += ab; reasons.push(`auth+${ab.toFixed(2)}`) }
      }

      // Cold start: if no history, small randomization
      if (!signals.hasHistory) {
        const jitter = (Math.random() - 0.5) * (weights.coldStartJitter ?? 0.5)
        score += jitter
        reasons.push('coldstart')
      }
      return { story: s, score, reasons }
    }).sort((a, b) => b.score - a.score)
  }

  // Simple diversity re-ranker to avoid repetition of same creator/category
  private static reRankWithDiversity(
    ranked: Array<{ story: StoryRow; score: number; reasons: string[] }>,
    opts: { perCreatorMax: number; perCategoryWindow: number; perCategoryMaxInWindow: number }
  ) {
    const { perCreatorMax, perCategoryWindow, perCategoryMaxInWindow } = opts
    const byCreator: Record<string, number> = {}
    const categoryWindow: string[] = []
    const out: typeof ranked = []
    for (const item of ranked) {
      const c = item.story.creator_id
      const cat = item.story.category || ''
      const creatorCount = byCreator[c] || 0
      const recentCatCount = categoryWindow.slice(-perCategoryWindow).filter(x => x === cat).length
      const creatorOk = creatorCount < perCreatorMax
      const categoryOk = !cat || recentCatCount < perCategoryMaxInWindow
      if (creatorOk && categoryOk) {
        out.push(item)
        byCreator[c] = (byCreator[c] || 0) + 1
        if (cat) categoryWindow.push(cat)
      }
    }
    // If we filtered too aggressively, append remaining
    for (const item of ranked) {
      if (!out.includes(item)) out.push(item)
    }
    return out
  }

  // Compute collaborative filtering boosts based on overlapping users
  private static async computeCFBoosts(userId: string, engagedStoryIds: Set<string>): Promise<Map<string, number>> {
    const boosts = new Map<string, number>()
    if (!userId || engagedStoryIds.size === 0) return boosts
    const supabase = createServerClient()
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

    // Find similar users by overlap on engaged stories
    const engagedList = Array.from(engagedStoryIds)
    // Limit IN clause size if necessary
    const batch = engagedList.slice(0, 200)
    const { data: overlaps } = await supabase
      .from('user_interactions')
      .select('user_id, story_id')
      .neq('user_id', userId)
      .in('story_id', batch)
      .gte('created_at', since)
      .limit(5000)

    const overlapCounts: Record<string, number> = {}
    for (const r of overlaps || []) {
      const uid = (r as any).user_id as string
      if (!uid) continue
      overlapCounts[uid] = (overlapCounts[uid] || 0) + 1
    }
    const similarUsers = Object.entries(overlapCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)

    if (similarUsers.length === 0) return boosts

    const similarIds = similarUsers.map(([uid]) => uid)
    const weights = new Map(similarUsers.map(([uid, ov]) => [uid, Math.min(ov, 10)]))

    // Fetch their interactions for candidate stories
    const { data: candidates } = await supabase
      .from('user_interactions')
      .select('user_id, story_id, type')
      .in('user_id', similarIds)
      .gte('created_at', since)
      .limit(10000)

    const actionWeight: Record<string, number> = { like: 3, complete: 4, share: 4, view: 1, time_spent: 2 }
    const scores: Record<string, number> = {}
    for (const r of candidates || []) {
      const sid = (r as any).story_id as string
      const uid = (r as any).user_id as string
      if (!sid || engagedStoryIds.has(sid)) continue
      const base = actionWeight[(r as any).type as string] || 0.5
      const w = (weights.get(uid) || 1)
      scores[sid] = (scores[sid] || 0) + base * (1 + w * 0.1)
    }

    // Normalize and cap boosts
    const entries = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200)
    const max = entries[0]?.[1] || 1
    for (const [sid, val] of entries) {
      const boost = Math.min(8, (val / max) * 6) // cap boost
      boosts.set(sid, boost)
    }
    return boosts
  }

  private static async fetchStoryMetrics(storyIds: string[]): Promise<Map<string, { completionRate: number; velocity: { views: number; likes: number; completes: number } }>> {
    const map = new Map<string, { completionRate: number; velocity: { views: number; likes: number; completes: number } }>()
    if (!storyIds.length) return map
    const supabase = createServerClient()
    // Engagement metrics (completion rate) from view
    const { data: em } = await supabase
      .from('story_engagement_metrics')
      .select('story_id, total_views, completions')
      .in('story_id', storyIds)
    const cr: Record<string, number> = {}
    for (const r of em || []) {
      const sid = (r as any).story_id
      const tv = Number((r as any).total_views) || 0
      const comp = Number((r as any).completions) || 0
      cr[sid] = tv > 0 ? comp / tv : 0
    }

    // Velocity over recent window
    const { data: vel } = await supabase
      .from('story_velocity')
      .select('story_id, views_48h, likes_48h, completes_48h')
      .in('story_id', storyIds)
    const vrec: Record<string, { views: number; likes: number; completes: number }> = {}
    for (const r of vel || []) {
      const sid = (r as any).story_id
      vrec[sid] = {
        views: Number((r as any).views_48h) || 0,
        likes: Number((r as any).likes_48h) || 0,
        completes: Number((r as any).completes_48h) || 0,
      }
    }

    for (const id of storyIds) {
      map.set(id, { completionRate: cr[id] || 0, velocity: vrec[id] || { views: 0, likes: 0, completes: 0 } })
    }
    return map
  }

  private static async fetchCreatorAuthority(creatorIds: string[]): Promise<Map<string, { followerCount: number; avgCompletionRate: number }>> {
    const map = new Map<string, { followerCount: number; avgCompletionRate: number }>()
    if (!creatorIds.length) return map
    const supabase = createServerClient()
    const { data } = await supabase
      .from('creator_authority')
      .select('creator_id, follower_count, avg_completion_rate')
      .in('creator_id', creatorIds)
    for (const r of data || []) {
      map.set((r as any).creator_id, {
        followerCount: Number((r as any).follower_count) || 0,
        avgCompletionRate: Number((r as any).avg_completion_rate) || 0,
      })
    }
    return map
  }
}

export default RecommendationService
