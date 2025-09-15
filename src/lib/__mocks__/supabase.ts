// Jest manual mock for '@/lib/supabase'
export const supabase = {
  auth: {
    getSession: jest.fn(),
    signOut: jest.fn(),
    exchangeCodeForSession: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    upsert: jest.fn(),
  })),
}

// Re-export createClient in case modules import it for typing/mocking
export const createClient = jest.fn()

// Provide createServerClient used by server-side code paths
export const createServerClient = jest.fn(() => supabase)
