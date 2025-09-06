'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function ProfileSetupPage() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const router = useRouter()

  useEffect(() => {
    // If profile is already complete, redirect to home
    if (profile && profile.name) {
      router.push('/')
    }
  }, [profile, router])

  const handleSuccess = () => {
    router.push('/')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <ProfileForm onSuccess={handleSuccess} />
      </div>
    </ProtectedRoute>
  )
}