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
})
