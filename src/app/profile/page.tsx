'use client'

import { useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { ProfileDisplay } from '@/components/profile/ProfileDisplay'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { SignOutButton } from '@/components/auth/SignOutButton'

export default function ProfilePage() {
  const { profile, loading } = useProfile()
  const [isEditing, setIsEditing] = useState(false)

  const handleEditSuccess = () => {
    setIsEditing(false)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                <div className="flex space-x-3">
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700
                               border border-blue-600 hover:border-blue-700 rounded-md
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                               transition-colors duration-200"
                    >
                      Edit Profile
                    </button>
                  )}
                  <SignOutButton />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {isEditing ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium text-gray-900">Edit Profile</h2>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <ProfileForm onSuccess={handleEditSuccess} />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Profile Display */}
                  <div className="flex justify-center">
                    <ProfileDisplay size="lg" showEmail={true} />
                  </div>

                  {/* Profile Info */}
                  {profile && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Display Name
                        </label>
                        <p className="mt-1 text-sm text-gray-900">{profile.name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Member Since
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(profile.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Last Updated
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(profile.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}