import { NextRequest, NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/jwt-utils'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { RATE_LIMITS } from '@/lib/rate-limit'

export const POST = withSecurity(
  withValidation({
    bodySchema: validationSchemas.auth.refresh,
    rateLimit: RATE_LIMITS.AUTH,
    allowedContentTypes: ['application/json']
  })(async (request, { body }) => {
  try {
    const { refreshToken } = body

    const tokens = await refreshAccessToken(refreshToken)
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}))