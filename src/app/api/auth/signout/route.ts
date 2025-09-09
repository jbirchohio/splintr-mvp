import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { RATE_LIMITS } from '@/lib/rate-limit'

export const POST = withSecurity(
  withValidation({
    rateLimit: RATE_LIMITS.AUTH
  })(async (request) => {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error.message)
      return NextResponse.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}))