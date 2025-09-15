import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  // E2E bypass to avoid external auth calls and redirects during browser tests
  if (process.env.NEXT_PUBLIC_E2E === 'true') {
    return NextResponse.next()
  }
  const { pathname, protocol, host } = request.nextUrl

  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production' && protocol === 'http:') {
    return NextResponse.redirect(`https://${host}${pathname}${request.nextUrl.search}`)
  }

  // Skip middleware for public routes and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/invite') ||
    pathname.startsWith('/api/referrals') ||
    pathname.startsWith('/auth') ||
    pathname === '/' ||
    pathname.startsWith('/invite') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get session from cookies
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedRoutes = ['/create', '/profile', '/api/stories', '/api/videos', '/api/users']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute && !session) {
    // Redirect to auth page if not authenticated
    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Invite-only gating: allow if invite_ok cookie present
  if (process.env.NEXT_PUBLIC_INVITE_ONLY === 'true' && session && !request.cookies.get('invite_ok') && !pathname.startsWith('/invite')) {
    const url = new URL('/invite', request.url)
    return NextResponse.redirect(url)
  }

  // Add user info to headers for API routes
  if (session && pathname.startsWith('/api')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', session.user.id)
    requestHeaders.set('x-user-email', session.user.email || '')
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
