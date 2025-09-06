import { User } from '@/types/auth.types'

export interface UpdateProfileRequest {
  name: string
  avatar?: string
}

export interface ProfileResponse {
  profile: User
}

export interface AvatarUploadResponse {
  avatarUrl: string
  message: string
}

export class UserService {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await fetch('/api/users/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch profile')
    }

    const data: ProfileResponse = await response.json()
    return data.profile
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateProfileRequest): Promise<User> {
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: updates.name,
        avatar_url: updates.avatar || ''
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update profile')
    }

    const data: ProfileResponse = await response.json()
    return data.profile
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await fetch('/api/users/avatar', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload avatar')
    }

    const data: AvatarUploadResponse = await response.json()
    return data.avatarUrl
  }

  /**
   * Remove user avatar
   */
  async removeAvatar(): Promise<void> {
    const response = await fetch('/api/users/avatar', {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to remove avatar')
    }
  }

  /**
   * Validate profile data
   */
  validateProfile(data: UpdateProfileRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required')
    }

    if (data.name && data.name.length > 100) {
      errors.push('Name must be less than 100 characters')
    }

    if (data.avatar && data.avatar.length > 0) {
      try {
        new URL(data.avatar)
      } catch {
        errors.push('Avatar must be a valid URL')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate avatar file
   */
  validateAvatarFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      errors.push('Only JPEG, PNG, WebP, and GIF files are allowed')
    }

    if (file.size > maxSize) {
      errors.push('File size must be less than 5MB')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const userService = new UserService()