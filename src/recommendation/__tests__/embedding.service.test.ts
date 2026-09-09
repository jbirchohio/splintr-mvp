import { EmbeddingService, RECOMMENDATION_EMBEDDING_DIMENSIONS } from '../embedding.service'

describe('EmbeddingService', () => {
  test('accepts the configured vector size', () => {
    expect(() =>
      EmbeddingService.validateVector(
        Array.from({ length: RECOMMENDATION_EMBEDDING_DIMENSIONS }, () => 0.01)
      )
    ).not.toThrow()
  })

  test('rejects the wrong vector size', () => {
    expect(() => EmbeddingService.validateVector([0.1, 0.2])).toThrow(
      /must have 384 dimensions/
    )
  })

  test('rejects non-finite vector values', () => {
    const vector = Array.from(
      { length: RECOMMENDATION_EMBEDDING_DIMENSIONS },
      () => 0.01
    )
    vector[10] = Number.NaN
    expect(() => EmbeddingService.validateVector(vector)).toThrow(/finite numbers/)
  })

  test('builds embedding text from story metadata', () => {
    expect(
      EmbeddingService.buildStoryEmbeddingText({
        title: 'The Basement Door',
        description: 'Choose whether to open it.',
        category: 'horror',
        hashtags: ['#mystery', '#interactive'],
      })
    ).toContain('Category: horror')
  })

  test('parses pgvector text values', () => {
    const raw = `[${Array.from({ length: RECOMMENDATION_EMBEDDING_DIMENSIONS }, () => '0.5').join(',')}]`
    const parsed = EmbeddingService.parseVector(raw)
    expect(parsed).toHaveLength(RECOMMENDATION_EMBEDDING_DIMENSIONS)
    expect(parsed?.[0]).toBe(0.5)
  })

  test('normalizes behavioral user vectors', () => {
    const vector = Array.from({ length: RECOMMENDATION_EMBEDDING_DIMENSIONS }, (_, index) =>
      index === 0 ? 3 : index === 1 ? 4 : 0
    )
    const normalized = EmbeddingService.normalizeVector(vector)
    expect(normalized[0]).toBeCloseTo(0.6)
    expect(normalized[1]).toBeCloseTo(0.8)
  })
})
