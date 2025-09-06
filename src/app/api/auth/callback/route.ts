import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error.message)
        return NextResponse.redirect(`${origin}/auth/signin?error=callback_error`)
      }

      if (data.session) {
        // Create or update user profile in our database
        const { user } = data.session
        
        const userInsert: Database['public']['Tables']['users']['Insert'] = {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email!.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          provider: user.app_metadata?.provider || 'email',
          provider_id: user.user_metadata?.provider_id || user.id,
          updated_at: new Date().toISOString()
        }

        const { error: profileError } = await supabase
          .from('users')
          .upsert(userInsert, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error('Profile creation error:', profileError.message)
          // Don't fail the auth flow, just log the error
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/signin?error=callback_error`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/signin?error=no_code`)
}