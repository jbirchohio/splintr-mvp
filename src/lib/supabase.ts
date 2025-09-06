import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client with OAuth configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
})

// Server-side client with service role key
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Type-safe client for server-side operations
export function createServerClient() {
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// OAuth provider configurations
export const oauthProviders = {
  google: {
    provider: 'google' as const,
    options: {
      redirectTo: `${process.env.NEXTAUTH_URL}/auth/callback`,
      scopes: 'openid email profile',
    }
  },
  apple: {
    provider: 'apple' as const,
    options: {
      redirectTo: `${process.env.NEXTAUTH_URL}/auth/callback`,
      scopes: 'name email',
    }
  }
}