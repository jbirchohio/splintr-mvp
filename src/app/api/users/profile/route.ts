import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { z } from 'zod'

type UserRow = Database['public']['Tables']['users']['Row']

// Validation schema for profile updates
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  avatar_url: z.string().url('Invalid avatar URL').optional().or(z.literal(''))
})

// GET /api/users/profile - Get current user profile
export const GET = withAuth(async (request, user) => {
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
})

// PUT /api/users/profile - Update user profile
export const PUT = withAuth(async (request, user) => {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = updateProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { name, avatar_url } = validation.data

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
})