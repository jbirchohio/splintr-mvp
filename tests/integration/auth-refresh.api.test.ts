/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/refresh/route'

jest.mock('@/lib/jwt-utils', () => ({
  // Only mock what this route uses
  refreshAccessToken: jest.fn(),
}))

describe('/api/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns new tokens for valid refresh token', async () => {
    const { refreshAccessToken } = require('@/lib/jwt-utils')
    refreshAccessToken.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' })

    const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'valid' }),
    })
    const res = await POST(req as any, {} as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.accessToken).toBe('new-access')
    expect(body.refreshToken).toBe('new-refresh')
    expect(refreshAccessToken).toHaveBeenCalledWith('valid')
  })

  it('returns 401 for invalid refresh token', async () => {
    const { refreshAccessToken } = require('@/lib/jwt-utils')
    refreshAccessToken.mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'invalid' }),
    })
    const res = await POST(req as any, {} as any)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Invalid refresh token')
  })

  it('validates body and returns 400 when missing refreshToken', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req as any, {} as any)
    expect(res.status).toBe(400)
  })
})

