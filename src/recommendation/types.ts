export type CandidateSource =
  | 'recent'
  | 'trending'
  | 'following'
  | 'collaborative'
  | 'exploration'

export type StoryRow = {
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

export type RecommendationCandidate = {
  story: StoryRow
  sources: CandidateSource[]
}

export type UserSignals = {
  followedCreators: Set<string>
  categoryAffinities: Map<string, number>
  hasHistory: boolean
  engagedStoryIds: Set<string>
  recentActions: string[]
}

export type StoryMetrics = {
  completionRate: number
  velocity: {
    views: number
    likes: number
    completes: number
  }
}

export type CreatorAuthority = {
  followerCount: number
  avgCompletionRate: number
}

export type RankedCandidate = RecommendationCandidate & {
  score: number
  reasons: string[]
}

export type RecommendationTrace = {
  modelVersion: string
  candidateSources: CandidateSource[]
  score: number
}

export const HEURISTIC_MODEL_VERSION = 'heuristic-phase-a-v1'
