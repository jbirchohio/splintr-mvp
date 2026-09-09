import { createServerClient } from '@/lib/supabase'

export type RecommendationTrainingRow = {
  exposureId: string
  userId: string | null
  sessionId: string | null
  storyId: string
  position: number
  shownAt: string
  candidateSource: string | null
  servedModelVersion: string | null
  servedScore: number | null
  watchRatio: number
  watchMs: number
  fastSkip: number
  completedNode: number
  selectedChoice: number
  continued: number
  completedPath: number
  replayed: number
  alternateEnding: number
  liked: number
  commented: number
  shared: number
  notInterested: number
  reported: number
  targetUtility: number
}

export class TrainingDataService {
  static async build(params: {
    since: string
    until?: string
    limit?: number
    attributionMinutes?: number
  }): Promise<RecommendationTrainingRow[]> {
    const {
      since,
      until = new Date().toISOString(),
      limit = 5000,
      attributionMinutes = 120,
    } = params
    const supabase = createServerClient() as any

    const { data: exposures, error } = await supabase
      .from('feed_exposures')
      .select('id, user_id, session_id, story_id, position, created_at, candidate_source, model_version, served_score')
      .gte('created_at', since)
      .lte('created_at', until)
      .order('created_at', { ascending: true })
      .limit(Math.min(Math.max(limit, 1), 20000))

    if (error) throw error
    if (!exposures?.length) return []

    const storyIds = Array.from(new Set(exposures.map((row: any) => row.story_id).filter(Boolean)))
    const earliest = new Date(exposures[0].created_at).getTime()
    const latest = new Date(exposures[exposures.length - 1].created_at).getTime()
    const interactionUntil = new Date(latest + attributionMinutes * 60000).toISOString()

    const { data: interactions, error: interactionsError } = await supabase
      .from('user_interactions')
      .select('user_id, story_id, type, value, metadata, created_at')
      .in('story_id', storyIds)
      .gte('created_at', new Date(earliest).toISOString())
      .lte('created_at', interactionUntil)
      .order('created_at', { ascending: true })
      .limit(50000)

    if (interactionsError) throw interactionsError

    return exposures.map((exposure: any) => {
      const shownAt = new Date(exposure.created_at).getTime()
      const cutoff = shownAt + attributionMinutes * 60000
      const attributable = (interactions || []).filter((event: any) => {
        if (event.story_id !== exposure.story_id) return false
        const eventAt = new Date(event.created_at).getTime()
        if (eventAt < shownAt || eventAt > cutoff) return false
        const metadataSessionId = event.metadata?.sessionId || null
        if (exposure.session_id && metadataSessionId) {
          return metadataSessionId === exposure.session_id
        }
        if (exposure.user_id && event.user_id) return exposure.user_id === event.user_id
        return exposure.session_id ? metadataSessionId === exposure.session_id : false
      })

      let watchRatio = 0
      let watchMs = 0
      let fastSkip = 0
      let completedNode = 0
      let selectedChoice = 0
      let continued = 0
      let completedPath = 0
      let replayed = 0
      let alternateEnding = 0
      let liked = 0
      let commented = 0
      let shared = 0
      let notInterested = 0
      let reported = 0

      for (const event of attributable) {
        const metadata = event.metadata || {}
        watchRatio = Math.max(watchRatio, Number(metadata.watchRatio) || 0)
        watchMs = Math.max(watchMs, Number(metadata.watchMs) || 0)
        if (event.type === 'skip' || metadata.fastSkip === true) fastSkip = 1
        if (metadata.completedNode === true || event.type === 'complete') completedNode = 1
        if (event.type === 'choice') selectedChoice = 1
        if (event.type === 'continuation') continued = 1
        if (event.type === 'path_complete') completedPath = 1
        if (event.type === 'replay') replayed = 1
        if (event.type === 'alternate_ending') alternateEnding = 1
        if (event.type === 'like') liked = 1
        if (event.type === 'comment') commented = 1
        if (event.type === 'share') shared = 1
        if (event.type === 'not_interested') notInterested = 1
        if (event.type === 'report') reported = 1
      }

      // Initial utility target. This is an export label, not the production ranker formula.
      // It can later be replaced by multi-task training without changing exposure logging.
      const targetUtility =
        Math.min(1, watchRatio) * 1.5 +
        selectedChoice * 1.0 +
        continued * 1.5 +
        completedPath * 2.0 +
        replayed * 1.5 +
        alternateEnding * 1.5 +
        liked * 0.75 +
        commented * 0.5 +
        shared * 1.25 -
        fastSkip * 1.5 -
        notInterested * 3.0 -
        reported * 5.0

      return {
        exposureId: exposure.id,
        userId: exposure.user_id || null,
        sessionId: exposure.session_id || null,
        storyId: exposure.story_id,
        position: Number(exposure.position) || 0,
        shownAt: exposure.created_at,
        candidateSource: exposure.candidate_source || null,
        servedModelVersion: exposure.model_version || null,
        servedScore: exposure.served_score == null ? null : Number(exposure.served_score),
        watchRatio,
        watchMs,
        fastSkip,
        completedNode,
        selectedChoice,
        continued,
        completedPath,
        replayed,
        alternateEnding,
        liked,
        commented,
        shared,
        notInterested,
        reported,
        targetUtility,
      }
    })
  }
}

export default TrainingDataService
