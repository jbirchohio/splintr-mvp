/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/users/avatar/route'
import { createServerClient } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('next/headers', () => ({ cookies: () => ({}) }))
jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(async () => ({ id: 'user-1', email: 't@example.com' }))
}))

const mockSupabase: any = {
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'avatars/user-1.png' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/avatars/user-1.png' } }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null })
    })
  },
  from: jest.fn()
}
;(createServerClient as jest.Mock).mockReturnValue(mockSupabase)

describe('/api/users/avatar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('POST uploads avatar and updates profile', async () => {
    // Mock DB update chain for setting avatar_url
    const mockEq = jest.fn().mockResolvedValue({ data: [{ id: 'user-1' }], error: null })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ update: mockUpdate })

    const file = new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' })
    const form = new FormData()
    form.append('avatar', file)

    const req = new NextRequest('http://localhost:3000/api/users/avatar', { method: 'POST', body: form })
    const res = await (POST as any)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.avatarUrl).toContain('https://cdn/avatars')
  })

  it('DELETE removes avatar and clears profile avatar_url', async () => {
    // First profile fetch to return existing avatar_url
    const mockSingle = jest.fn().mockResolvedValue({ data: { avatar_url: 'https://cdn/storage/v1/object/public/user-avatars/avatars/user-1.png' }, error: null })
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    // Update call
    const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: mockSelect, update: mockUpdate }
      }
      return {}
    })

    const req = new NextRequest('http://localhost:3000/api/users/avatar', { method: 'DELETE' })
    const res = await (DELETE as any)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toBe('Avatar removed successfully')
  })
})

