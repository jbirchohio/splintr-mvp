import { createServerClient } from '@/lib/supabase'

export const RECOMMENDATION_EMBEDDING_DIMENSIONS = 384

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
}

export default EmbeddingService
