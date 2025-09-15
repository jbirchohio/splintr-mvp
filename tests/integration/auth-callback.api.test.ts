/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/callback/route'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('/api/auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to next on successful session exchange and profile upsert', async () => {
    const session = {
      user: {
        id: 'user-1',
        email: 't@example.com',
        user_metadata: { full_name: 'Test User', avatar_url: 'http://img', provider_id: 'p1' },
        app_metadata: { provider: 'google' },
      },
    } as any

    mockSupabase.auth.exchangeCodeForSession = jest.fn().mockResolvedValue({ data: { session }, error: null } as any)
    mockSupabase.from = jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    } as any)

    const req = new NextRequest('http://localhost:3000/api/auth/callback?code=abc&next=%2Fdashboard')
    const res = await GET(req as any)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('returns 400 when code is missing due to query validation', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/callback')
    const res = await GET(req as any)
    expect(res.status).toBe(400)
    // Body shape depends on validation middleware; status code is primary signal
  })

  it('redirects with error when exchange fails', async () => {
    mockSupabase.auth.exchangeCodeForSession = jest.fn().mockResolvedValue({ data: {}, error: { message: 'bad' } } as any)
    const req = new NextRequest('http://localhost:3000/api/auth/callback?code=abc')
    const res = await GET(req as any)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/auth/signin?error=callback_error')
  })

  it('still redirects success when profile upsert fails', async () => {
    const session = {
      user: { id: 'user-1', email: 't@example.com', user_metadata: {}, app_metadata: {} },
    } as any
    mockSupabase.auth.exchangeCodeForSession = jest.fn().mockResolvedValue({ data: { session }, error: null } as any)
    mockSupabase.from = jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: { message: 'db error' } }),
    } as any)

    const req = new NextRequest('http://localhost:3000/api/auth/callback?code=abc&next=%2F')
    const res = await GET(req as any)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })
})
