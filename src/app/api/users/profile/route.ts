import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { RATE_LIMITS } from '@/lib/rate-limit'

type UserRow = Database['public']['Tables']['users']['Row']

// GET /api/users/profile - Get current user profile
export const GET = withSecurity(
  withValidation({
    requireAuth: true,
    rateLimit: RATE_LIMITS.READ
  })(async (request, { user }) => {
  try {
    const supabase = createServerClient()
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Profile fetch error:', error.message)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    const userProfile = profile as UserRow

    return NextResponse.json({
      profile: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        avatar: userProfile.avatar_url,
        createdAt: userProfile.created_at,
        updatedAt: userProfile.updated_at
      }
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}))

// PUT /api/users/profile - Update user profile
export const PUT = withSecurity(
  withValidation({
    bodySchema: validationSchemas.user.updateProfile,
    requireAuth: true,
    rateLimit: RATE_LIMITS.GENERAL
  })(async (request, { body, user }) => {
  try {
    const { name, avatar_url } = body

    // Update profile in database
    const supabase = createServerClient()
    
    const updateData: Database['public']['Tables']['users']['Update'] = {
      name,
      avatar_url: avatar_url || null,
      updated_at: new Date().toISOString()
    }

    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error.message)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    const userProfile = updatedProfile as UserRow

    return NextResponse.json({
      profile: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        avatar: userProfile.avatar_url,
        createdAt: userProfile.created_at,
        updatedAt: userProfile.updated_at
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}))