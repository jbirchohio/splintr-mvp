import { createServerClient } from '@/lib/supabase'

export class ChallengeService {
  async getToday(userId: string) {
    const sb = createServerClient()
    const today = new Date().toISOString().slice(0, 10)
    const { data: challenges, error } = await sb
      .from('daily_challenges')
      .select('id, code, title, description, active_date, criteria')
      .eq('active_date', today)
    if (error) throw new Error(error.message)
    const ids = (challenges || []).map(c => c.id)
    let progress: any[] = []
    if (ids.length) {
      const { data } = await sb
        .from('user_challenge_progress')
        .select('challenge_id, progress, completed_at')
        .eq('user_id', userId)
        .in('challenge_id', ids)
      progress = data || []
    }
    return { challenges: challenges || [], progress }
  }

  async ensureTodaySeed() {
    // Seed a default simple challenge for today if not present
    const sb = createServerClient()
    const today = new Date().toISOString().slice(0, 10)
    const code = 'watch_two'
    const { data } = await sb.from('daily_challenges').select('id').eq('code', code).eq('active_date', today).maybeSingle()
    if (!data) {
      await sb.from('daily_challenges').insert({
        code,
        title: 'Watch 2 stories',
        description: 'Complete any 2 stories today to earn a reward',
        active_date: today,
        criteria: { type: 'playthroughs_today', count: 2 },
      })
    }
  }

  async recordProgress(userId: string, type: 'playthrough') {
    const sb = createServerClient()
    await this.ensureTodaySeed()
    const today = new Date().toISOString().slice(0, 10)
    const { data: challenge } = await sb
      .from('daily_challenges').select('id, criteria').eq('code', 'watch_two').eq('active_date', today).maybeSingle()
    if (!challenge) return
    const { data: row } = await sb
      .from('user_challenge_progress')
      .select('id, progress, completed_at')
      .eq('user_id', userId)
      .eq('challenge_id', challenge.id)
      .maybeSingle()
    let progress = row?.progress || 0
    let completed_at = row?.completed_at || null
    if (!completed_at) {
      progress += 1
      const goal = Number((challenge.criteria as any)?.count || 2)
      if (progress >= goal) completed_at = new Date().toISOString()
      if (row) {
        await sb.from('user_challenge_progress').update({ progress, completed_at }).eq('id', row.id)
      } else {
        await sb.from('user_challenge_progress').insert({ user_id: userId, challenge_id: challenge.id, progress, completed_at })
      }
    }
  }

  async bumpStreak(userId: string) {
    const sb = createServerClient()
    const today = new Date()
    const todayDate = today.toISOString().slice(0, 10)
    const { data: streak } = await sb.from('user_streaks').select('*').eq('user_id', userId).maybeSingle()
    if (!streak) {
      await sb.from('user_streaks').insert({ user_id: userId, current_streak: 1, longest_streak: 1, last_action_date: todayDate })
      return
    }
    const last = streak.last_action_date ? new Date(streak.last_action_date) : null
    const diff = last ? Math.floor((today.getTime() - last.getTime()) / (1000*60*60*24)) : null
    let current = streak.current_streak
    if (diff === 0) {
      // same day, no change
    } else if (diff === 1 || streak.last_action_date === null) {
      current += 1
    } else {
      current = 1
    }
    const longest = Math.max(current, streak.longest_streak || 0)
    await sb.from('user_streaks').update({ current_streak: current, longest_streak: longest, last_action_date: todayDate, updated_at: new Date().toISOString() }).eq('user_id', userId)
  }
}

export const challengeService = new ChallengeService()

