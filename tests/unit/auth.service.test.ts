import { AuthService } from '@/services/auth.service'

// Mock supabase client and oauth providers
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  },
  oauthProviders: {
    google: { provider: 'google', options: {} },
    apple: { provider: 'apple', options: {} },
  },
}))

const { supabase, oauthProviders } = require('@/lib/supabase')

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new AuthService()
  })

  describe('signInWithGoogle', () => {
    it('starts OAuth flow and returns pending result on success', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })

      const result = await service.signInWithGoogle()

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(oauthProviders.google)
      expect(result).toEqual({ user: null })
    })

    it('returns error message when OAuth fails', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({ data: null, error: { message: 'OAuth failed' } })

      const result = await service.signInWithGoogle()

      expect(result).toEqual({ user: null, error: 'OAuth failed' })
    })
  })

  describe('signInWithApple', () => {
    it('starts OAuth flow and returns pending result on success', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })

      const result = await service.signInWithApple()

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(oauthProviders.apple)
      expect(result).toEqual({ user: null })
    })

    it('returns error message when OAuth fails', async () => {
      supabase.auth.signInWithOAuth.mockResolvedValue({ data: null, error: { message: 'OAuth failed' } })

      const result = await service.signInWithApple()

      expect(result).toEqual({ user: null, error: 'OAuth failed' })
    })
  })

  describe('signOut', () => {
    it('signs out successfully', async () => {
      supabase.auth.signOut.mockResolvedValue({ error: null })

      await expect(service.signOut()).resolves.toBeUndefined()
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('throws when sign out fails', async () => {
      supabase.auth.signOut.mockResolvedValue({ error: { message: 'Sign out error' } })

      await expect(service.signOut()).rejects.toThrow('Failed to sign out')
    })
  })

  describe('getCurrentUser', () => {
    it('returns null when no active session', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

      const user = await service.getCurrentUser()
      expect(user).toBeNull()
    })

    it('returns user profile when session and profile exist', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })

      const profileRow = {
        id: 'u1',
        email: 'user@test.com',
        name: 'Test User',
        avatar_url: 'https://img/avatar.png',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockSingle = jest.fn().mockResolvedValue({ data: profileRow, error: null })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const user = await service.getCurrentUser()

      expect(supabase.from).toHaveBeenCalledWith('users')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', 'u1')
      expect(user).toMatchObject({
        id: 'u1',
        email: 'user@test.com',
        name: 'Test User',
        avatar: 'https://img/avatar.png',
      })
    })

    it('returns null when profile fetch fails', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })

      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const user = await service.getCurrentUser()
      expect(user).toBeNull()
    })
  })

  describe('refreshToken', () => {
    it('returns new access token on success', async () => {
      supabase.auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'new-token' } }, error: null })

      await expect(service.refreshToken()).resolves.toBe('new-token')
    })

    it('throws when refresh fails', async () => {
      supabase.auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'failed' } })

      await expect(service.refreshToken()).rejects.toThrow('Failed to refresh token')
    })
  })

  describe('onAuthStateChange', () => {
    it('invokes callback with user on SIGNED_IN', async () => {
      const handlerSpy = jest.fn()

      // Capture the internal handler that service registers
      let registeredHandler: any
      supabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
        registeredHandler = cb
        return { data: { subscription: {} }, error: null }
      })

      // Mock getCurrentUser to avoid DB calls
      const getCurrentUserSpy = jest.spyOn(service, 'getCurrentUser').mockResolvedValue({
        id: 'u1', email: 'user@test.com', name: 'Test User', createdAt: new Date(), updatedAt: new Date(),
      } as any)

      service.onAuthStateChange(handlerSpy)

      // Simulate sign-in event
      await registeredHandler('SIGNED_IN', { user: { id: 'u1' } })

      expect(getCurrentUserSpy).toHaveBeenCalled()
      expect(handlerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }))
    })

    it('invokes callback with null on SIGNED_OUT', async () => {
      const handlerSpy = jest.fn()
      let registeredHandler: any
      supabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
        registeredHandler = cb
        return { data: { subscription: {} }, error: null }
      })

      service.onAuthStateChange(handlerSpy)
      await registeredHandler('SIGNED_OUT', null)

      expect(handlerSpy).toHaveBeenCalledWith(null)
    })
  })
})
