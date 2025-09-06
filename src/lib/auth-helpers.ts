import { NextRequest } from 'next/server'
import { validateJWTToken, extractTokenFromHeader } from './jwt-utils'
import { createServerClient } from './supabase'
import { Database } from '@/types/database.types'

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
    const user = await authenticateRequest(request)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return handler(request, user, ...args)
  }
}