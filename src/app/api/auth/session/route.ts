import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { RATE_LIMITS } from '@/lib/rate-limit'

export const GET = withSecurity(
  withValidation({
    rateLimit: RATE_LIMITS.READ
  })(async (request) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session error:', error.message)
      return NextResponse.json(
        { error: 'Failed to get session' },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json({ session: null })
    }

    // Get user profile from our database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError.message)
    }

    return NextResponse.json({
      session: {
        ...session,
        user: {
          ...session.user,
          profile: profile || null
        }
      }
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}))