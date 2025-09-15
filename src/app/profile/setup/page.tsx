'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function ProfileSetupPage() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // In E2E runs, stay on setup to allow test interactions
    if (process.env.NEXT_PUBLIC_E2E === 'true') return
    // If profile is already complete, redirect to home
    if (profile && profile.name) {
      router.push('/')
    }
  }, [profile, router])

  useEffect(() => {
    // small delay to let hydration settle and avoid element detachment during E2E
    const t = setTimeout(() => setReady(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handleSuccess = () => {
    router.push('/')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        {ready && <ProfileForm onSuccess={handleSuccess} />}
      </div>
    </ProtectedRoute>
  )
}
