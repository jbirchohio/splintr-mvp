import { NextRequest, NextResponse } from 'next/server'
import { validateJWTToken, extractTokenFromHeader } from './jwt-utils'
import { createServerClient } from './supabase'
import { Database } from '@/types/database.types'
import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from './rate-limit'
import { cacheService, CacheTTL } from './redis'

type UserRow = Database['public']['Tables']['users']['Row']

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  avatar?: string
}

/**
 * Authenticates a request and returns user information
 * Used in API routes to verify authentication
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Try to get user from middleware headers first (more efficient)
    const userId = request.headers.get('x-user-id')
    const userEmail = request.headers.get('x-user-email')
    
    if (userId && userEmail) {
      // Get full user profile from database
      const supabase = createServerClient()
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && profile) {
        const userProfile = profile as UserRow
        return {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          avatar: userProfile.avatar_url || undefined
        }
      }
    }

    // Fallback to token validation
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return null
    }

    const payload = await validateJWTToken(token)
    
    if (!payload) {
      return null
    }

    // Get user profile from database
    const supabase = createServerClient()
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .single()
    
    if (error || !profile) {
      return null
    }

    const userProfile = profile as UserRow

    return {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      avatar: userProfile.avatar_url || undefined
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

/**
 * Wrapper for API routes that require authentication
 */
export function withAuth<T extends unknown[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    // Apply basic rate limiting by method (READ for GET, GENERAL otherwise)
    try {
      const cfg = request.method === 'GET' ? RATE_LIMITS.READ : RATE_LIMITS.GENERAL
      const rl = await rateLimit(request, cfg.windowMs, cfg.maxRequests)
      if (!rl.success) {
        return addRateLimitHeaders(
          NextResponse.json({ error: 'Rate limit exceeded', retryAfter: rl.retryAfter }, { status: 429 }),
          rl
        )
      }
    } catch {}

    const user = await authenticateRequest(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = await handler(request, user, ...args)
    return res
  }
}

/**
 * Simple admin check using env allowlist (comma-separated user IDs)
 */
export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false
  const allow = (process.env.RECS_ADMIN_USER_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return allow.includes(userId)
}

/**
 * Check admin role from Supabase auth user metadata, with Redis caching.
 */
export async function isAdminBySupabase(userId: string | null | undefined): Promise<boolean> {
  try {
    if (!userId) return false
    const cacheKey = `admin:user:${userId}`
    const cached = await cacheService.get<boolean>(cacheKey)
    if (typeof cached === 'boolean') return cached

    const sb = createServerClient()
    // @ts-ignore: admin API available with service role key
    const { data, error } = await (sb.auth.admin as any).getUserById(userId)
    if (error) return false
    const role = (data?.user as any)?.app_metadata?.role
    const isAdmin = role === 'admin'
    await cacheService.set(cacheKey, isAdmin, CacheTTL.SHORT)
    return isAdmin
  } catch {
    return false
  }
}
