"use client"
import { useTheme } from '@/components/providers/ThemeProvider'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
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
  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <section className="space-y-2">
        <div className="text-sm text-muted">Account</div>
        <div className="flex items-center justify-between border rounded p-3 bg-white">
          <div>
            <div className="text-sm text-gray-700">{email || '—'}</div>
            <div className="text-xs text-gray-500">{userId || '—'}</div>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${role === 'admin' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {role === 'admin' ? 'Admin' : 'User'}
          </div>
        </div>
      </section>
      <section className="space-y-2">
        <div className="text-sm text-muted">Appearance</div>
        <div className="flex items-center gap-3">
          <label className="text-sm">Theme</label>
          <select className="border rounded p-2 text-sm" value={theme} onChange={e => setTheme(e.target.value as any)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
      </section>
    </div>
  )
}
