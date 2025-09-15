import { UserService } from '@/services/user.service'

describe('UserService', () => {
  let service: UserService
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    service = new UserService()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch as any
  })

  describe('getProfile', () => {
    it('returns profile on success', async () => {
      const mockProfile = {
        id: 'u1',
        email: 'user@test.com',
        name: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      })

      const result = await service.getProfile()
      expect(fetch).toHaveBeenCalledWith('/api/users/profile', expect.any(Object))
      expect(result).toEqual(mockProfile)
    })

    it('throws with server error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Failed' }),
      })

      await expect(service.getProfile()).rejects.toThrow('Failed')
    })
  })

  describe('updateProfile', () => {
    it('sends update and returns updated profile', async () => {
      const updated = {
        id: 'u1',
        email: 'user@test.com',
        name: 'New Name',
        avatar: 'https://img/avatar.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ profile: updated }),
      })

      const result = await service.updateProfile({ name: 'New Name', avatar: 'https://img/avatar.png' })
      expect(fetch).toHaveBeenCalledWith('/api/users/profile', expect.objectContaining({ method: 'PUT' }))
      expect(result).toEqual(updated)
    })

    it('throws on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      })

      await expect(service.updateProfile({ name: 'X' })).rejects.toThrow('Update failed')
    })
  })

  describe('uploadAvatar', () => {
    it('uploads avatar and returns URL', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ avatarUrl: 'https://img/new.png', message: 'ok' }),
      })

      const file = new File(['abc'], 'avatar.png', { type: 'image/png' })
      const result = await service.uploadAvatar(file)
      expect(fetch).toHaveBeenCalledWith('/api/users/avatar', expect.objectContaining({ method: 'POST' }))
      expect(result).toBe('https://img/new.png')
    })

    it('throws when upload fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Upload failed' }),
      })

      const file = new File(['abc'], 'avatar.png', { type: 'image/png' })
      await expect(service.uploadAvatar(file)).rejects.toThrow('Upload failed')
    })
  })

  describe('removeAvatar', () => {
    it('removes avatar successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })
      await expect(service.removeAvatar()).resolves.toBeUndefined()
      expect(fetch).toHaveBeenCalledWith('/api/users/avatar', expect.objectContaining({ method: 'DELETE' }))
    })

    it('throws on failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'Remove failed' }) })
      await expect(service.removeAvatar()).rejects.toThrow('Remove failed')
    })
  })

  describe('validateProfile', () => {
    it('validates correct data', () => {
      const r = service.validateProfile({ name: 'Valid User', avatar: 'https://img/a.png' })
      expect(r.isValid).toBe(true)
      expect(r.errors).toHaveLength(0)
    })

    it('requires name', () => {
      const r = service.validateProfile({ name: '' })
      expect(r.isValid).toBe(false)
      expect(r.errors).toContain('Name is required')
    })

    it('checks name length and avatar URL', () => {
      const longName = 'x'.repeat(101)
      const r = service.validateProfile({ name: longName, avatar: 'not-a-url' })
      expect(r.isValid).toBe(false)
      expect(r.errors).toEqual(expect.arrayContaining([
        'Name must be less than 100 characters',
        'Avatar must be a valid URL',
      ]))
    })
  })

  describe('validateAvatarFile', () => {
    it('accepts valid image file', () => {
      const file = new File(['x'], 'a.png', { type: 'image/png' })
      const r = service.validateAvatarFile(file)
      expect(r.isValid).toBe(true)
    })

    it('rejects invalid type and large size', () => {
      const file = new File(['x'], 'a.txt', { type: 'text/plain' })
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 })
      const r = service.validateAvatarFile(file)
      expect(r.isValid).toBe(false)
      expect(r.errors).toEqual(expect.arrayContaining([
        'Only JPEG, PNG, WebP, and GIF files are allowed',
        'File size must be less than 5MB',
      ]))
    })
  })
})

