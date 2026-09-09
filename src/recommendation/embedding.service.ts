import { createHash } from 'crypto'
import { createServerClient } from '@/lib/supabase'

export const RECOMMENDATION_EMBEDDING_DIMENSIONS = 384
export const STORY_EMBEDDING_MODEL = 'text-embedding-3-small'
export const USER_EMBEDDING_MODEL = 'behavioral-average-v1'

export class EmbeddingService {
  static validateVector(vector: number[]): void {
    if (vector.length !== RECOMMENDATION_EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Recommendation embeddings must have ${RECOMMENDATION_EMBEDDING_DIMENSIONS} dimensions`
      )
    }
    if (vector.some(value => !Number.isFinite(value))) {
      throw new Error('Recommendation embeddings must contain only finite numbers')
    }
  }

  static async generateTextEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is required to generate recommendation embeddings')

    const input = text.trim()
    if (!input) throw new Error('Cannot generate an embedding for empty text')

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: STORY_EMBEDDING_MODEL,
        input,
        encoding_format: 'float',
        dimensions: RECOMMENDATION_EMBEDDING_DIMENSIONS,
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Embedding request failed (${response.status}): ${detail.slice(0, 300)}`)
    }

    const payload = await response.json() as {
      data?: Array<{ embedding?: number[] }>
    }
    const vector = payload.data?.[0]?.embedding
    if (!vector) throw new Error('Embedding response did not contain a vector')
    this.validateVector(vector)
    return vector
  }

  static async upsertStoryEmbedding(params: {
    storyId: string
    embedding: number[]
    model: string
    contentHash?: string | null
  }): Promise<void> {
    this.validateVector(params.embedding)
    const supabase = createServerClient() as any
    const { error } = await supabase.from('story_embeddings').upsert(
      {
        story_id: params.storyId,
        embedding: params.embedding,
        model: params.model,
        content_hash: params.contentHash || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'story_id' }
    )
    if (error) throw error
  }

  static async upsertUserEmbedding(params: {
    userId: string
    embedding: number[]
    model: string
  }): Promise<void> {
    this.validateVector(params.embedding)
    const supabase = createServerClient() as any
    const { error } = await supabase.from('user_embeddings').upsert(
      {
        user_id: params.userId,
        embedding: params.embedding,
        model: params.model,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (error) throw error
  }

  static async refreshStoryEmbedding(storyId: string): Promise<{ updated: boolean }> {
    const supabase = createServerClient() as any
    const [{ data: story, error: storyError }, { data: hashtagRows }] = await Promise.all([
      supabase
        .from('stories')
        .select('id, title, description, category')
        .eq('id', storyId)
        .eq('is_published', true)
        .single(),
      supabase
        .from('story_hashtags')
        .select('tag')
        .eq('story_id', storyId),
    ])

    if (storyError || !story) throw storyError || new Error('Story not found')

    const text = this.buildStoryEmbeddingText({
      title: story.title,
      description: story.description,
      category: story.category,
      hashtags: (hashtagRows || []).map((row: any) => String(row.tag)).filter(Boolean),
    })
    const contentHash = createHash('sha256').update(text).digest('hex')

    const { data: existing } = await supabase
      .from('story_embeddings')
      .select('content_hash, model')
      .eq('story_id', storyId)
      .maybeSingle()

    if (existing?.content_hash === contentHash && existing?.model === STORY_EMBEDDING_MODEL) {
      return { updated: false }
    }

    const embedding = await this.generateTextEmbedding(text)
    await this.upsertStoryEmbedding({
      storyId,
      embedding,
      model: STORY_EMBEDDING_MODEL,
      contentHash,
    })
    return { updated: true }
  }

  static async refreshRecentStoryEmbeddings(limit = 25): Promise<{
    processed: number
    updated: number
    failed: string[]
  }> {
    const supabase = createServerClient() as any
    const { data: stories, error } = await supabase
      .from('stories')
      .select('id')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 100)))
    if (error) throw error

    let updated = 0
    const failed: string[] = []
    for (const story of stories || []) {
      try {
        const result = await this.refreshStoryEmbedding(String(story.id))
        if (result.updated) updated += 1
      } catch {
        failed.push(String(story.id))
      }
    }

    return { processed: (stories || []).length, updated, failed }
  }

  static async refreshUserEmbedding(userId: string): Promise<boolean> {
    const supabase = createServerClient() as any
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const { data: interactions, error } = await supabase
      .from('user_interactions')
      .select('story_id, type, value, metadata, created_at')
      .eq('user_id', userId)
      .not('story_id', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error || !interactions?.length) return false

    const actionWeight: Record<string, number> = {
      view: 0.25,
      time_spent: 1,
      like: 2,
      comment: 2,
      share: 4,
      complete: 3,
      choice: 2,
      continuation: 4,
      path_complete: 5,
      replay: 5,
      alternate_ending: 6,
      skip: -2,
      not_interested: -6,
      report: -10,
    }

    const storyWeights = new Map<string, number>()
    const now = Date.now()
    for (const event of interactions) {
      const storyId = event.story_id ? String(event.story_id) : null
      if (!storyId) continue
      const base = actionWeight[String(event.type)] ?? 0
      if (base === 0) continue

      const ageHours = Math.max(0, (now - new Date(event.created_at).getTime()) / 3600000)
      const recency = Math.exp(-ageHours / (24 * 7))
      const watchRatio = Number((event.metadata as any)?.watchRatio)
      const watchQuality = Number.isFinite(watchRatio) && event.type === 'time_spent'
        ? Math.max(0.25, Math.min(1.5, watchRatio + 0.5))
        : 1
      const weight = base * recency * watchQuality
      storyWeights.set(storyId, (storyWeights.get(storyId) || 0) + weight)
    }

    const positiveStoryIds = Array.from(storyWeights.entries())
      .filter(([, weight]) => weight > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([storyId]) => storyId)
    if (!positiveStoryIds.length) return false

    const { data: rows, error: embeddingError } = await supabase
      .from('story_embeddings')
      .select('story_id, embedding')
      .in('story_id', positiveStoryIds)
    if (embeddingError || !rows?.length) return false

    const sum = new Array<number>(RECOMMENDATION_EMBEDDING_DIMENSIONS).fill(0)
    let totalWeight = 0
    for (const row of rows) {
      const vector = this.parseVector(row.embedding)
      if (!vector) continue
      const weight = Math.max(0, storyWeights.get(String(row.story_id)) || 0)
      if (!weight) continue
      for (let i = 0; i < vector.length; i += 1) sum[i] += vector[i] * weight
      totalWeight += weight
    }
    if (totalWeight <= 0) return false

    const averaged = sum.map(value => value / totalWeight)
    const normalized = this.normalizeVector(averaged)
    await this.upsertUserEmbedding({
      userId,
      embedding: normalized,
      model: USER_EMBEDDING_MODEL,
    })
    return true
  }

  static buildStoryEmbeddingText(story: {
    title?: string | null
    description?: string | null
    category?: string | null
    hashtags?: string[] | null
  }): string {
    return [
      story.title,
      story.description,
      story.category ? `Category: ${story.category}` : null,
      story.hashtags?.length ? `Hashtags: ${story.hashtags.join(' ')}` : null,
    ]
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  static normalizeVector(vector: number[]): number[] {
    this.validateVector(vector)
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
    if (!norm) return vector
    return vector.map(value => value / norm)
  }

  static parseVector(value: unknown): number[] | null {
    if (Array.isArray(value)) {
      const vector = value.map(Number)
      try { this.validateVector(vector); return vector } catch { return null }
    }
    if (typeof value === 'string') {
      const trimmed = value.trim().replace(/^\[/, '').replace(/\]$/, '')
      if (!trimmed) return null
      const vector = trimmed.split(',').map(Number)
      try { this.validateVector(vector); return vector } catch { return null }
    }
    return null
  }
}

export default EmbeddingService
