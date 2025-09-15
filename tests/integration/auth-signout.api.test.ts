/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/signout/route'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')

describe('/api/auth/signout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('signs out and returns 200', async () => {
    ;(supabase.auth.signOut as any) = jest.fn().mockResolvedValue({ error: null })
    const req = new NextRequest('http://localhost:3000/api/auth/signout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })
})
