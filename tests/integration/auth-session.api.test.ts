/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/session/route'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('/api/auth/session', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null session when not signed in', async () => {
    mockSupabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session: null }, error: null } as any)

    const req = new NextRequest('http://localhost:3000/api/auth/session')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.session).toBeNull()
  })

  it('returns session with user profile when signed in', async () => {
    const session = {
      user: { id: 'user-1', email: 't@example.com' },
      access_token: 'tok',
      refresh_token: 'ref',
      expires_at: Date.now() / 1000 + 3600
    }
    mockSupabase.auth.getSession = jest.fn().mockResolvedValue({ data: { session }, error: null } as any)
    // Mock profile query
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'user-1', name: 'Test', email: 't@example.com' }, error: null })
        })
      })
    })

    const req = new NextRequest('http://localhost:3000/api/auth/session')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.session.user.id).toBe('user-1')
    expect(body.session.user.profile).toBeTruthy()
  })
})
