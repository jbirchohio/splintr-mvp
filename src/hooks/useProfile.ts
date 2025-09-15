'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService, UpdateProfileRequest } from '@/services/user.service'
import { User } from '@/types/auth.types'

interface UseProfileReturn {
  profile: User | undefined
  loading: boolean
  error: string | null
  updateProfile: (data: UpdateProfileRequest) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
  isUpdating: boolean
  isUploadingAvatar: boolean
}

export function useProfile(): UseProfileReturn {
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch profile data
  const {
    data: profile,
    isLoading: loading,
    error: queryError
  } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userService.getProfile(),
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => userService.updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile)
      setError(null)
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(file),
    onSuccess: (avatarUrl) => {
      // Update the profile cache with new avatar URL
      queryClient.setQueryData(['profile'], (oldProfile: User | undefined) => {
        if (oldProfile) {
          return { ...oldProfile, avatar: avatarUrl }
        }
        return oldProfile
      })
      setError(null)
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })

  // Remove avatar mutation
  const removeAvatarMutation = useMutation({
    mutationFn: () => userService.removeAvatar(),
    onSuccess: () => {
      // Update the profile cache to remove avatar
      queryClient.setQueryData(['profile'], (oldProfile: User | undefined) => {
        if (oldProfile) {
          return { ...oldProfile, avatar: undefined }
        }
        return oldProfile
      })
      setError(null)
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })

  const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
    setError(null)
    
    // Validate data
    const validation = userService.validateProfile(data)
    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return
    }

    try {
      await updateProfileMutation.mutateAsync(data)
    } catch (error) {
      // Error is handled by mutation onError
    }
  }, [updateProfileMutation])

  const uploadAvatar = useCallback(async (file: File) => {
    setError(null)
    
    // Validate file
    const validation = userService.validateAvatarFile(file)
    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return
    }

    try {
      await uploadAvatarMutation.mutateAsync(file)
    } catch (error) {
      // Error is handled by mutation onError
    }
  }, [uploadAvatarMutation])

  const removeAvatar = useCallback(async () => {
    setError(null)
    
    try {
      await removeAvatarMutation.mutateAsync()
    } catch (error) {
      // Error is handled by mutation onError
    }
  }, [removeAvatarMutation])

  return {
    profile,
    loading,
    error: error || (queryError?.message ?? null),
    updateProfile,
    uploadAvatar,
    removeAvatar,
    isUpdating: updateProfileMutation.isPending,
    isUploadingAvatar: uploadAvatarMutation.isPending
  }
}
