/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/users/delete/route'
import { createClient } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('next/headers', () => ({
  cookies: () => ({})
}))

// Mock Cloudinary SDK
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    }
  }
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    admin: {
      deleteUser: jest.fn()
    }
  },
  from: jest.fn()
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('/api/users/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('no auth') })
    const req = new NextRequest('http://localhost:3000/api/users/delete', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('deletes user data and account', async () => {
    // Authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    // Mock table deletions
    const mockEq = jest.fn().mockReturnValue({})
    const mockDelete = jest.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = jest.fn((table: string) => ({ delete: mockDelete, select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [] }) }) }))
    mockSupabase.from = mockFrom
    // Auth delete
    mockSupabase.auth.admin.deleteUser.mockResolvedValue({ error: null })

    const req = new NextRequest('http://localhost:3000/api/users/delete', { method: 'DELETE' })
    const res = await DELETE(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.message).toBe('Account successfully deleted')
  })

  it('handles downstream errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    // Simulate DB error on deleting videos
    const mockDeleteErr = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: new Error('db err') }) })
    const mockFrom = jest.fn((table: string) => {
      if (table === 'videos') return { delete: mockDeleteErr }
      return { delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }
    })
    mockSupabase.from = mockFrom

    const req = new NextRequest('http://localhost:3000/api/users/delete', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(500)
  })
})

