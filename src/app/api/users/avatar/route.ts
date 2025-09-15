import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeFileUpload } from '@/lib/sanitization'
import { logger } from '@/lib/logger'

type UserRow = Database['public']['Tables']['users']['Row']

// POST /api/users/avatar - Upload user avatar
export const POST = withSecurity(
  withValidation({
  formSchema: validationSchemas.user.avatarUpload,
  requireAuth: true,
  rateLimit: RATE_LIMITS.UPLOAD
})(async (request, { form, user }) => {
  try {
    const { avatar: file } = form

    // Additional file validation and sanitization
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    const fileValidation = sanitizeFileUpload(file, allowedTypes, maxSize)
    if (!fileValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'File validation failed',
          details: fileValidation.errors
        },
        { status: 400 }
      )
    }

    // Generate unique filename using sanitized name
    const fileExt = fileValidation.sanitizedName?.split('.').pop() || 'jpg'
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
      logger.error({ err: uploadError }, 'Avatar upload error')
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
      logger.error({ err: updateError }, 'Profile update error')
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
    logger.error({ err: error }, 'Avatar upload error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}))

// DELETE /api/users/avatar - Remove user avatar
export const DELETE = withSecurity(
  withValidation({
    requireAuth: true,
    rateLimit: RATE_LIMITS.GENERAL
  })(async (request, { user }) => {
  try {
    const supabase = createServerClient()
    
    // Get current avatar URL to delete from storage
    const { data: profile, error: fetchError } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      logger.error({ err: fetchError }, 'Profile fetch error')
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
      logger.error({ err: updateError }, 'Profile update error')
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
        logger.error({ err: storageError }, 'Storage cleanup error')
      }
    }

    return NextResponse.json({
      message: 'Avatar removed successfully'
    })
  } catch (error) {
    logger.error({ err: error }, 'Avatar removal error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}))
