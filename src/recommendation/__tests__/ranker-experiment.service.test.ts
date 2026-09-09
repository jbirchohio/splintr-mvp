import { RankerExperimentService } from '../ranker-experiment.service'

describe('RankerExperimentService', () => {
  const original = process.env.RECOMMENDATION_LEARNED_TRAFFIC_PERCENT

  afterEach(() => {
    if (original === undefined) delete process.env.RECOMMENDATION_LEARNED_TRAFFIC_PERCENT
    else process.env.RECOMMENDATION_LEARNED_TRAFFIC_PERCENT = original
  })

  test('keeps the same identity in a stable arm', () => {
    process.env.RECOMMENDATION_LEARNED_TRAFFIC_PERCENT = '50'
    const first = RankerExperimentService.assign({ userId: 'user-123' })
    const second = RankerExperimentService.assign({ userId: 'user-123' })
    expect(second).toBe(first)
  })

  test('zero percent always assigns control', () => {
    process.env.RECOMMENDATION_LEARNED_TRAFFIC_PERCENT = '0'
    expect(RankerExperimentService.assign({ userId: 'user-123' })).toBe('control')
  })

  test('one hundred percent assigns identified traffic to learned', () => {
    process.env.RECOMMENDATION_LEARNED_TRAFFIC_PERCENT = '100'
    expect(RankerExperimentService.assign({ sessionId: 'session-123' })).toBe('learned')
  })

  test('anonymous traffic without a stable identity stays in control', () => {
    process.env.RECOMMENDATION_LEARNED_TRAFFIC_PERCENT = '100'
    expect(RankerExperimentService.assign({})).toBe('control')
  })
})
