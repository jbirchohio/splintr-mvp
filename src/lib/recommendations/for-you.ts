import { createServerClient } from '@/lib/supabase'

export class RecommendationsService {
  async forUser(userId?: string, limit: number = 20) {
    const sb = createServerClient()
    // For cold start: use trending stories in last 7 days
    const { data, error } = await sb.rpc('get_trending_stories', { days_back: 7, limit_count: limit })
    if (error) throw new Error(error.message)
    return data || []
  }

  async trendingCreators(limit: number = 10) {
    const sb = createServerClient()
    // Approximate trending creators by aggregating published stories views
    const { data, error } = await sb
      .from('stories')
      .select('creator_id, view_count, users:creator_id(id, name, avatar_url)')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    const creatorsMap = new Map<string, { id: string; name: string; avatar_url: string | null; views: number }>()
    for (const s of data || []) {
      const id = (s as any).creator_id
      const u = (s as any).users
      const entry = creatorsMap.get(id) || { id, name: u?.name || 'Unknown', avatar_url: u?.avatar_url || null, views: 0 }
      entry.views += Number((s as any).view_count || 0)
      creatorsMap.set(id, entry)
    }
    return Array.from(creatorsMap.values()).sort((a,b) => b.views - a.views).slice(0, limit)
  }
}

export const recommendationsService = new RecommendationsService()

