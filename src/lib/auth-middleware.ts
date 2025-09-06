import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function createAuthMiddleware() {
  return async function authMiddleware(request: NextRequest) {
    const response = NextResponse.next()
    
    // Create a Supabase client configured to use cookies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'pkce',
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      }
    )

    // Get the session from the request
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    // If there's an error or no session, the user is not authenticated
    if (error || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', session.user.id)
    requestHeaders.set('x-user-email', session.user.email || '')

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
}

// Helper function to verify JWT token
export async function verifyAuthToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }

    return {
      userId: user.id,
      email: user.email || ''
    }
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

// Helper to extract user from request headers (set by middleware)
export function getUserFromRequest(request: NextRequest): { userId: string; email: string } | null {
  const userId = request.headers.get('x-user-id')
  const email = request.headers.get('x-user-email')
  
  if (!userId || !email) {
    return null
  }
  
  return { userId, email }
}