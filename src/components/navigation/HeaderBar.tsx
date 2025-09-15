"use client"
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function HeaderBar() {
  const [user, setUser] = useState<{ id: string; email?: string; role?: string } | null>(null)
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user ? { id: user.id, email: user.email || undefined, role: (user as any).app_metadata?.role } : null)
    })()
  }, [])
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as any)) setMenu(false) }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
  if (!user) return null
  return (
    <div className="fixed top-3 right-3 z-50" ref={ref}>
      <button onClick={() => setMenu(m => !m)} className="flex items-center gap-2 bg-[color:var(--surface)] text-[color:var(--foreground)] border border-[color:var(--border)] rounded-full px-3 py-1.5 text-sm shadow">
        <span className="w-6 h-6 rounded-full bg-[color:var(--primary-600)] text-white grid place-items-center">{(user.email || user.id).slice(0,1).toUpperCase()}</span>
        <span className="flex items-center gap-2">Account {user.role === 'admin' && (<span className="px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-700">Admin</span>)}</span>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
      </button>
      {menu && (
        <div className="mt-2 bg-[color:var(--surface)] text-[color:var(--foreground)] border border-[color:var(--border)] rounded shadow-lg w-56 overflow-hidden">
          <Link href={`/profile/${user.id}`} className="block px-3 py-2 hover:bg-[color:var(--primary-50)] text-sm">My Profile</Link>
          <Link href="/profile/edit" className="block px-3 py-2 hover:bg-[color:var(--primary-50)] text-sm">Edit Profile</Link>
          <Link href="/settings" className="block px-3 py-2 hover:bg-[color:var(--primary-50)] text-sm">Settings</Link>
          {user.role === 'admin' && (<Link href="/admin" className="block px-3 py-2 hover:bg-[color:var(--primary-50)] text-sm">Admin Dashboard</Link>)}
        </div>
      )}
    </div>
  )
}
