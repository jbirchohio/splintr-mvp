import { supabase, oauthProviders } from '@/lib/supabase'
import { AuthResult, User } from '@/types/auth.types'
import { Database } from '@/types/database.types'

export class AuthService {
  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      if (process.env.NEXT_PUBLIC_E2E === 'true') {
        return { user: { id: 'e2e-user', email: 'e2e@example.com', name: 'E2E User' } as User }
      }
      const { data, error } = await supabase.auth.signInWithOAuth(oauthProviders.google)
      
      if (error) {
        console.error('Google sign-in error:', error.message)
        return { user: null, error: error.message }
      }

      // OAuth redirect will handle the rest
      return { user: null }
    } catch (error) {
      console.error('Google sign-in error:', error)
      return { user: null, error: 'Failed to sign in with Google' }
    }
  }

  /**
   * Sign in with Apple OAuth
   */
  async signInWithApple(): Promise<AuthResult> {
    try {
      if (process.env.NEXT_PUBLIC_E2E === 'true') {
        return { user: { id: 'e2e-user', email: 'e2e@example.com', name: 'E2E User' } as User }
      }
      const { data, error } = await supabase.auth.signInWithOAuth(oauthProviders.apple)
      
      if (error) {
        console.error('Apple sign-in error:', error.message)
        return { user: null, error: error.message }
      }

      // OAuth redirect will handle the rest
      return { user: null }
    } catch (error) {
      console.error('Apple sign-in error:', error)
      return { user: null, error: 'Failed to sign in with Apple' }
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      if (process.env.NEXT_PUBLIC_E2E === 'true') {
        return
      }
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error.message)
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw new Error('Failed to sign out')
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      if (process.env.NEXT_PUBLIC_E2E === 'true') {
        return {
          id: 'e2e-user',
          email: 'e2e@example.com',
          name: 'E2E User',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User
      }
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        return null
      }

      // Get user profile from our database
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError?.message)
        return null
      }

      // Type assertion since we know the structure
      const userProfile = profile as Database['public']['Tables']['users']['Row']

      return {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        avatar: userProfile.avatar_url || undefined,
        createdAt: new Date(userProfile.created_at),
        updatedAt: new Date(userProfile.updated_at)
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  /**
   * Refresh the current session token
   */
  async refreshToken(): Promise<string> {
    try {
      if (process.env.NEXT_PUBLIC_E2E === 'true') {
        return 'e2e-token'
      }
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error || !data.session) {
        throw new Error(error?.message || 'Failed to refresh token')
      }

      return data.session.access_token
    } catch (error) {
      console.error('Token refresh error:', error)
      throw new Error('Failed to refresh token')
    }
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    if (process.env.NEXT_PUBLIC_E2E === 'true') {
      // Simple mock subscription
      const unsub = { unsubscribe: () => {} }
      // Immediately notify with current E2E user
      Promise.resolve().then(() => callback({ id: 'e2e-user', email: 'e2e@example.com', name: 'E2E User' } as User))
      return { data: { subscription: unsub } }
    }
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const user = await this.getCurrentUser()
        callback(user)
      } else if (event === 'SIGNED_OUT') {
        callback(null)
      }
    })
  }

  /**
   * Get the current session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Get session error:', error.message)
      return null
    }

    return session
  }
}

// Export singleton instance
export const authService = new AuthService()
