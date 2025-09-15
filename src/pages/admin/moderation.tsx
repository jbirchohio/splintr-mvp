import React from 'react'
import { GetServerSideProps } from 'next'
import { ModerationQueue } from '@/components/moderation/ModerationQueue'
import { supabase } from '@/lib/supabase'

interface ModerationPageProps {
  user: {
    id: string
    email: string
    role?: string
  }
}

export default function ModerationPage({ user }: ModerationPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Content Moderation
                </h1>
                <p className="text-sm text-gray-600">
                  Review flagged content and moderation results
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Logged in as: {user.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModerationQueue />
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req } = context
  
  // Get the auth token from cookies or headers
  const token = req.cookies['sb-access-token'] || req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return {
      redirect: {
        destination: '/auth/signin?redirect=/admin/moderation',
        permanent: false,
      },
    }
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return {
        redirect: {
          destination: '/auth/signin?redirect=/admin/moderation',
          permanent: false,
        },
      }
    }

    // Require admin access by env allowlist
    const admins = (process.env.RECS_ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!admins.includes(user.id)) {
      return {
        redirect: {
          destination: '/auth/signin?redirect=/admin/moderation',
          permanent: false,
        },
      }
    }

    return {
      props: {
        user: { id: user.id, email: user.email || '', role: user.app_metadata?.role || 'user' }
      }
    }
  } catch (error) {
    console.error('Auth error:', error)
    return {
      redirect: {
        destination: '/auth/signin?redirect=/admin/moderation',
        permanent: false,
      },
    }
  }
}
