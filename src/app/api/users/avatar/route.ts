import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

// POST /api/users/avatar - Upload user avatar
export const POST = withAuth(async (request, user) => {
  try {
    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const supabase = createServerClient()
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError.message)
      return NextResponse.json(
        { error: 'Failed to upload avatar' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filePath)

    // Update user profile with new avatar URL
    const updateData: Database['public']['Tables']['users']['Update'] = {
      avatar_url: publicUrl,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError.message)
      // Try to clean up uploaded file
      await supabase.storage.from('user-avatars').remove([filePath])
      
      return NextResponse.json(
        { error: 'Failed to update profile with new avatar' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      avatarUrl: publicUrl,
      message: 'Avatar uploaded successfully'
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// DELETE /api/users/avatar - Remove user avatar
export const DELETE = withAuth(async (request, user) => {
  try {
    const supabase = createServerClient()
    
    // Get current avatar URL to delete from storage
    const { data: profile, error: fetchError } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      console.error('Profile fetch error:', fetchError.message)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    const userProfile = profile as UserRow

    // Update profile to remove avatar URL
    const updateData: Database['public']['Tables']['users']['Update'] = {
      avatar_url: null,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError.message)
      return NextResponse.json(
        { error: 'Failed to remove avatar' },
        { status: 500 }
      )
    }

    // Try to delete file from storage if it exists
    if (userProfile.avatar_url) {
      try {
        const url = new URL(userProfile.avatar_url)
        const filePath = url.pathname.split('/').slice(-2).join('/') // Get 'avatars/filename.ext'
        
        await supabase.storage
          .from('user-avatars')
          .remove([filePath])
      } catch (storageError) {
        // Log but don't fail the request if storage cleanup fails
        console.error('Storage cleanup error:', storageError)
      }
    }

    return NextResponse.json({
      message: 'Avatar removed successfully'
    })
  } catch (error) {
    console.error('Avatar removal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})