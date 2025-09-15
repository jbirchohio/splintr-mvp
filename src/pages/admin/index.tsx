import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function AdminCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a href={href} className="block p-5 rounded-xl border bg-white hover:shadow-md transition-shadow">
      <div className="text-lg font-semibold mb-1">{title}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </a>
  )
}

export default function AdminIndexPage() {
  const [email, setEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [role, setRole] = useState<string>('user')

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const u = data?.user as any
      setEmail(u?.email || '')
      setUserId(u?.id || '')
      setRole(u?.app_metadata?.role || 'user')
    })
    return () => { mounted = false }
  }, [])

  const isAdmin = role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Admin Tools</h1>
        <div className="mb-4 p-4 rounded-lg border bg-white flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-700">Signed in as</div>
            <div className="text-sm font-medium text-gray-900">{email || '—'} <span className="text-gray-500">({userId || '—'})</span></div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isAdmin ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {isAdmin ? 'Admin' : 'User'}
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">Quick links to moderation, experiments, and recommendation settings.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminCard href="/admin/moderation" title="Moderation" desc="Review flagged content and manage moderation queue" />
          <AdminCard href="/admin/experiments" title="Experiments" desc="View exposure counts and set local variant overrides" />
          <AdminCard href="/admin/recs" title="Recommendations" desc="Tune For You weights and view variant metrics" />
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps(context: any) {
  const token = context.req.cookies['sb-access-token'] || context.req.headers.authorization?.replace('Bearer ', '') || ''
  if (!token) return { redirect: { destination: '/auth/signin?redirect=/admin', permanent: false } }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user || (data.user as any).app_metadata?.role !== 'admin') {
    return { redirect: { destination: '/auth/signin?redirect=/admin', permanent: false } }
  }
  return { props: {} }
}
