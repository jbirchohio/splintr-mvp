/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/users/profile/route'
import { createServerClient } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('next/headers', () => ({ cookies: () => ({}) }))
jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(async () => ({ id: 'user-1', email: 't@example.com' }))
}))

const mockSupabase: any = {
  from: jest.fn()
}
;(createServerClient as jest.Mock).mockReturnValue(mockSupabase)

describe('/api/users/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns the current user profile', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-1', email: 't@example.com', name: 'Tester', avatar_url: null, created_at: 'x', updated_at: 'y' },
            error: null
          })
        })
      })
    })

    const req = new NextRequest('http://localhost:3000/api/users/profile')
    const res = await (GET as any)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.profile.id).toBe('user-1')
    expect(body.profile.name).toBe('Tester')
  })

  it('PUT updates the user profile', async () => {
    const updateChain = {
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-1', email: 't@example.com', name: 'Updated', avatar_url: 'https://a', created_at: 'x', updated_at: 'y' },
            error: null
          })
        })
      })
    }
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue(updateChain)
    })

    const req = new NextRequest('http://localhost:3000/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated', avatar_url: 'https://a' })
    })
    const res = await (PUT as any)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.profile.name).toBe('Updated')
  })
})

