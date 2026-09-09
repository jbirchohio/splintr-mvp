export type RecommendationAction =
  | 'view'
  | 'like'
  | 'share'
  | 'comment'
  | 'complete'
  | 'dwell'
  | 'skip'
  | 'choice'
  | 'continuation'
  | 'replay'
  | 'path_complete'
  | 'alternate_ending'
  | 'not_interested'
  | 'report'

export type RecommendationTelemetryMetadata = Record<string, unknown> & {
  nodeId?: string
  choiceId?: string
  nextNodeId?: string | null
  choiceLatencyMs?: number
  pathDepth?: number
  watchMs?: number
  durationMs?: number
  watchRatio?: number
  completedNode?: boolean
}

export class RecommendationTelemetryService {
  static track(params: {
    storyId: string
    action: RecommendationAction
    sessionId?: string | null
    metadata?: RecommendationTelemetryMetadata
  }): void {
    const { storyId, action, sessionId = null, metadata = {} } = params

    try {
      void fetch('/api/engagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'x-session-id': sessionId } : {}),
        },
        body: JSON.stringify({
          contentType: 'story',
          contentId: storyId,
          action,
          metadata,
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // Recommendation telemetry must never interrupt playback.
    }
  }
}

export default RecommendationTelemetryService
