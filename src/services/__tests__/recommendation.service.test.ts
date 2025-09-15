import { RecommendationService } from '@/services/recommendation.service'
import { RecsConfigService } from '@/services/recs-config.service'
import { createServerClient } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('@/services/recs-config.service')

type Query = { table: string, filters: Record<string, any>, select: string, limit?: number, order?: any, in?: any, gte?: any, not?: any }

function makeClient(fixtures: Record<string, any[]>) {
  function newBuilder(table: string) {
    const state: Query = { table, filters: {}, select: '', limit: undefined, order: undefined, in: undefined, gte: undefined, not: undefined }
    return {
      _q: state,
      select(sel: string) { this._q.select = sel; return this },
      eq(col: string, val: any) { this._q.filters[col] = val; return this },
      neq(col: string, val: any) { this._q.filters[col] = { neq: val }; return this },
      in(col: string, list: any[]) { this._q.in = { col, list }; return this },
      gte(col: string, val: any) { this._q.gte = { col, val }; return this },
      not(col: string, op: string, val: any) { this._q.not = { col, op, val }; return this },
      order(col: string, opts?: any) { this._q.order = { col, opts }; return this },
      limit(n: number) { this._q.limit = n; return this._resolve() },
      range() { return this._resolve() },
      _resolve() {
        const q = this._q as Query
        let rows = (fixtures[q.table] || []).slice()
        // eq/neq filters
        for (const [col, val] of Object.entries(q.filters || {})) {
          if ((val as any)?.neq !== undefined) {
            rows = rows.filter((r: any) => r[col] !== (val as any).neq)
          } else {
            rows = rows.filter((r: any) => r[col] === val)
          }
        }
        // in filter
        if (q.in) {
          rows = rows.filter((r: any) => q.in!.list.includes(r[q.in!.col]))
        }
        // gte filter (assume ISO date strings)
        if (q.gte) {
          const cutoff = new Date(q.gte.val).getTime()
          rows = rows.filter((r: any) => new Date(r[q.gte!.col]).getTime() >= cutoff)
        }
        // order desc/asc by col if present
        if (q.order) {
          const { col, opts } = q.order as any
          const asc = !!(opts && opts.ascending)
          rows.sort((a: any, b: any) => {
            const av = a[col]; const bv = b[col]
            return asc ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0)
          })
        }
        // limit
        if (typeof q.limit === 'number') {
          rows = rows.slice(0, q.limit)
        }
        return Promise.resolve({ data: rows, error: null })
      },
      then(res: any) { return this._resolve().then(res) },
    }
  }
  return {
    from(table: string) { return newBuilder(table) },
  } as any
}

describe('RecommendationService.getForYou', () => {
  beforeEach(() => {
    (RecsConfigService.getFypWeights as jest.Mock).mockResolvedValue({
      freshnessFactor: 0.25,
      freshnessHours: 72,
      socialProofFactor: 0.001,
      socialProofCap: 50,
      followedBoost: 10,
      categoryAffinityFactor: 0.5,
      coldStartJitter: 0.0,
      cfEnabled: false,
      cfMaxBoost: 0,
      diversity: { perCreatorMax: 2, perCategoryWindow: 10, perCategoryMaxInWindow: 5 },
      completionBoostFactor: 4,
      velocityViewFactor: 0.01,
      velocityLikeFactor: 0.2,
      velocityCompleteFactor: 0.3,
      authorityFollowerFactor: 0.001,
      authorityCompletionFactor: 2,
    })
  })

  it('ranks by freshness and social proof with boosts', async () => {
    const now = new Date()
    const fixtures = {
      stories: [
        { id: 's1', creator_id: 'c1', title: 'A', view_count: 1000, published_at: new Date(now.getTime() - 2*3600*1000).toISOString(), category: 'cat1', is_published: true },
        { id: 's2', creator_id: 'c2', title: 'B', view_count: 50, published_at: new Date(now.getTime() - 70*3600*1000).toISOString(), category: 'cat1', is_published: true },
      ],
      story_engagement_metrics: [ { story_id: 's1', total_views: 100, completions: 50 }, { story_id: 's2', total_views: 50, completions: 5 } ],
      story_velocity: [ { story_id: 's1', views_48h: 500, likes_48h: 50, completes_48h: 20 }, { story_id: 's2', views_48h: 5, likes_48h: 1, completes_48h: 0 } ],
      creator_authority: [ { creator_id: 'c1', follower_count: 10000, avg_completion_rate: 0.5 }, { creator_id: 'c2', follower_count: 100, avg_completion_rate: 0.1 } ],
      user_follows: [],
      user_interactions: [],
      recs_config: [],
      feed_exposures: [],
    }
    ;(createServerClient as jest.Mock).mockReturnValue(makeClient(fixtures))
    const res = await RecommendationService.getForYou({ userId: null, sessionId: null, limit: 10, offset: 0, variant: 'A' })
    expect(res.items[0].id).toBe('s1')
    expect(res.items[1].id).toBe('s2')
  })

  it('adds CF boost in variant B to lift similar-user favorites', async () => {
    const now = new Date()
    const fixtures = {
      stories: [
        { id: 's1', creator_id: 'c1', title: 'A', view_count: 10, published_at: new Date(now.getTime() - 50*3600*1000).toISOString(), category: 'cat1', is_published: true },
        { id: 's3', creator_id: 'c3', title: 'C', view_count: 5, published_at: new Date(now.getTime() - 60*3600*1000).toISOString(), category: 'cat2', is_published: true },
      ],
      story_engagement_metrics: [ { story_id: 's1', total_views: 10, completions: 5 }, { story_id: 's3', total_views: 10, completions: 1 } ],
      story_velocity: [ { story_id: 's1', views_48h: 10, likes_48h: 1, completes_48h: 1 }, { story_id: 's3', views_48h: 10, likes_48h: 2, completes_48h: 0 } ],
      creator_authority: [ { creator_id: 'c1', follower_count: 100, avg_completion_rate: 0.3 }, { creator_id: 'c3', follower_count: 100, avg_completion_rate: 0.2 } ],
      // Target user interactions: engaged with s1
      user_interactions: [ { user_id: 'u0', story_id: 's1', type: 'view', created_at: now.toISOString() },
        // Similar users: overlap on s1 and engagement with s3
        { user_id: 'u1', story_id: 's1', type: 'view', created_at: now.toISOString() },
        { user_id: 'u1', story_id: 's3', type: 'like', created_at: now.toISOString() },
        { user_id: 'u2', story_id: 's1', type: 'view', created_at: now.toISOString() },
        { user_id: 'u2', story_id: 's3', type: 'complete', created_at: now.toISOString() },
      ],
      user_follows: [],
      recs_config: [],
      feed_exposures: [],
    }
    ;(createServerClient as jest.Mock).mockReturnValue(makeClient(fixtures))
    ;(RecsConfigService.getFypWeights as jest.Mock).mockResolvedValue({
      freshnessFactor: 0,
      freshnessHours: 72,
      socialProofFactor: 0,
      socialProofCap: 0,
      followedBoost: 0,
      categoryAffinityFactor: 0,
      coldStartJitter: 0.0,
      cfEnabled: true,
      cfMaxBoost: 6,
      diversity: { perCreatorMax: 10, perCategoryWindow: 10, perCategoryMaxInWindow: 10 },
      completionBoostFactor: 0,
      velocityViewFactor: 0,
      velocityLikeFactor: 0,
      velocityCompleteFactor: 0,
      authorityFollowerFactor: 0,
      authorityCompletionFactor: 0,
    })
    const res: any = await RecommendationService.getForYou({ userId: 'u0', sessionId: 's', limit: 10, offset: 0, variant: 'B' })
    // CF sample should include s3 as top boosted candidate
    const cfIds = (res.debug?.cfSample || []).map((e: any) => e[0])
    expect(cfIds[0]).toBe('s3')
    // And s3 should rank ahead of s1 with CF-only weights
    const ids = res.items.map((s: any) => s.id)
    expect(ids.indexOf('s3')).toBeLessThan(ids.indexOf('s1'))
  })

  it('applies diversity to avoid too many from one creator', async () => {
    const now = new Date()
    const fixtures = {
      stories: [
        { id: 'x1', creator_id: 'cx', title: 'X1', view_count: 1000, published_at: now.toISOString(), category: 'cat1', is_published: true },
        { id: 'x2', creator_id: 'cx', title: 'X2', view_count: 900, published_at: now.toISOString(), category: 'cat1', is_published: true },
        { id: 'x3', creator_id: 'cx', title: 'X3', view_count: 800, published_at: now.toISOString(), category: 'cat1', is_published: true },
        { id: 'y1', creator_id: 'cy', title: 'Y1', view_count: 10, published_at: now.toISOString(), category: 'cat2', is_published: true },
      ],
      story_engagement_metrics: [ { story_id: 'x1', total_views: 100, completions: 50 }, { story_id: 'x2', total_views: 100, completions: 50 }, { story_id: 'x3', total_views: 100, completions: 50 }, { story_id: 'y1', total_views: 10, completions: 1 } ],
      story_velocity: [ { story_id: 'x1', views_48h: 100, likes_48h: 10, completes_48h: 5 }, { story_id: 'x2', views_48h: 90, likes_48h: 9, completes_48h: 4 }, { story_id: 'x3', views_48h: 80, likes_48h: 8, completes_48h: 4 }, { story_id: 'y1', views_48h: 5, likes_48h: 1, completes_48h: 0 } ],
      creator_authority: [ { creator_id: 'cx', follower_count: 10000, avg_completion_rate: 0.5 }, { creator_id: 'cy', follower_count: 100, avg_completion_rate: 0.1 } ],
      user_follows: [],
      user_interactions: [],
      recs_config: [],
      feed_exposures: [],
    }
    ;(createServerClient as jest.Mock).mockReturnValue(makeClient(fixtures))
    const res = await RecommendationService.getForYou({ userId: null, sessionId: null, limit: 4, offset: 0, variant: 'A' })
    const creators = res.items.map(s => s.creator_id)
    // Ensure we didn't get all from 'cx'; diversity should inject 'cy'
    expect(creators.filter(c => c === 'cx').length).toBeLessThan(4)
    expect(creators).toContain('cy')
  })
})
