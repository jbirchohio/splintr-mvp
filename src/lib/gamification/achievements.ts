import { createServerClient } from '@/lib/supabase'

export class AchievementService {
  async list() {
    const sb = createServerClient()
    const { data, error } = await sb.from('achievements').select('id, code, name, description, icon, criteria')
    if (error) throw new Error(error.message)
    return data || []
  }

  async userAchievements(userId: string) {
    const sb = createServerClient()
    const { data, error } = await sb
      .from('user_achievements')
      .select('achievement_id, earned_at, achievements:achievement_id(id, code, name, description, icon)')
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return data || []
  }

  async evaluateAndAward(userId: string) {
    const sb = createServerClient()
    // Fetch achievements catalog
    const catalog = await this.list()
    // Fetch current awards
    const awarded = await this.userAchievements(userId)
    const awardedIds = new Set(awarded.map(a => a.achievement_id))

    // Fetch playthrough counts
    const { data: playCountData } = await sb
      .from('story_playthroughs')
      .select('id', { count: 'exact', head: true })
      .eq('viewer_id', userId)
    const playCount = (playCountData as any)?.length || 0 // count from head isn't returned; fallback query
    // Fallback exact count
    const { count: pc } = await sb
      .from('story_playthroughs')
      .select('id', { count: 'exact', head: true })
      .eq('viewer_id', userId)
    const plays = pc || 0

    // Fetch streak
    const { data: streak } = await sb.from('user_streaks').select('current_streak').eq('user_id', userId).maybeSingle()
    const currentStreak = streak?.current_streak || 0

    const toAward: string[] = []
    for (const a of catalog) {
      if (awardedIds.has(a.id)) continue
      const crit = a.criteria as any
      if (crit?.type === 'playthroughs' && plays >= Number(crit.count || 0)) toAward.push(a.id)
      if (crit?.type === 'streak' && currentStreak >= Number(crit.days || 0)) toAward.push(a.id)
    }
    if (toAward.length) {
      const rows = toAward.map(id => ({ user_id: userId, achievement_id: id }))
      const { error } = await sb.from('user_achievements').insert(rows)
      if (error) throw new Error(error.message)
    }
    return { awarded: toAward }
  }
}

export const achievementService = new AchievementService()

