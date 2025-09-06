import { supabaseAdmin } from './supabase'

export interface TokenPayload {
  sub: string // user ID
  email?: string
  aud: string
  exp: number
  iat: number
  iss: string
}

/**
 * Validates a JWT token using Supabase Admin client
 */
export async function validateJWTToken(token: string): Promise<TokenPayload | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      console.error('JWT validation error:', error?.message)
      return null
    }

    return {
      sub: user.id,
      email: user.email,
      aud: user.aud,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
      iss: process.env.NEXT_PUBLIC_SUPABASE_URL!
    }
  } catch (error) {
    console.error('JWT validation error:', error)
    return null
  }
}

/**
 * Refreshes an access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken
    })
    
    if (error || !data.session) {
      console.error('Token refresh error:', error?.message)
      return null
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token
    }
  } catch (error) {
    console.error('Token refresh error:', error)
    return null
  }
}

/**
 * Extracts token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

/**
 * Checks if a token is expired
 */
export function isTokenExpired(payload: TokenPayload): boolean {
  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp <= currentTime
}