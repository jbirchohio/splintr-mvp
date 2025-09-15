/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/videos/route'
import { createServerClient } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('@/lib/antivirus', () => ({
  scanBuffer: jest.fn(async () => ({ clean: false, threat: 'EICAR_TEST_SIGNATURE' }))
}))
// Mock redis used by rate-limit to avoid real connections
jest.mock('@/lib/redis', () => ({
  redis: {
    pipeline: () => ({
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 1], [null, 1], [null, '0']])
    })
  }
}))
jest.mock('next/headers', () => ({ cookies: () => ({}) }))
jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(async () => ({ id: 'user-1', email: 't@example.com' }))
}))

const mockSupabase: any = {
  from: jest.fn(),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/videos/x.mp4' } })
    })
  }
}
;(createServerClient as jest.Mock).mockReturnValue(mockSupabase)

describe('/api/videos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns paginated videos for current user', async () => {
    const items = [
      {
        id: 'v1', original_filename: 'a.mp4', duration: 10, file_size: 1000,
        streaming_url: 'https://cdn/a', thumbnail_url: null, processing_status: 'completed', moderation_status: 'approved',
        created_at: 'now', updated_at: 'now', users: { id: 'user-1', name: 'Tester', avatar_url: null }
      }
    ]
    // Builder that resolves to data
    const builder: any = {}
    builder.select = jest.fn(() => builder)
    builder.eq = jest.fn(() => builder)
    builder.range = jest.fn(() => builder)
    builder.order = jest.fn(() => builder)
    builder.then = (resolve: any) => resolve({ data: items, error: null, count: 1 })
    mockSupabase.from.mockReturnValue(builder)

    const req = new NextRequest('http://localhost:3000/api/videos?page=1&limit=1')
    const res = await (GET as any)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.videos).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('POST rejects video when antivirus scan fails', async () => {
    // Build form with EICAR signature content to trigger scan failure
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
    const file = new File([eicar], 'test.mp4', { type: 'video/mp4' })
    const form = new FormData()
    form.append('video', file)
    form.append('title', 'T')
    form.append('description', 'D')

    const req = new NextRequest('http://localhost:3000/api/videos', {
      method: 'POST',
      body: form
    })

    const res = await (POST as any)(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('File failed antivirus scan')
  })
})
