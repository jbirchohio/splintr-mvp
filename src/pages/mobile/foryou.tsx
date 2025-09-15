import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useNotifications } from '@/hooks/useNotifications'
import dynamic from 'next/dynamic'
const VerticalFeed = dynamic(() => import('@/components/feed/VerticalFeed').then(m => m.VerticalFeed), { ssr: false, loading: () => (<div className="fixed inset-0 bg-black flex items-center justify-center text-white/80">Loading…</div>) })
import { useState, useRef } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useToast } from '@/components/ui/Toast'

function Tabs() {
  const { pathname } = useRouter()
  const Tab = ({ href, label }: { href: string; label: string }) => (
    <Link href={href} className={`px-3 py-1 rounded-full text-sm ${pathname === href ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>{label}</Link>
  )
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
      <Tab href="/mobile/foryou" label="For You" />
      <Tab href="/mobile/following" label="Following" />
      <Tab href="/mobile" label="Latest" />
    </div>
  )
}

export default function MobileForYouPage() {
  const { unread } = useNotifications()
  const { show } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const touchStart = useRef<number | null>(null)
  const pull = useRef<number>(0)
  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientY; pull.current = 0 }
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current == null) return
    const dy = e.touches[0].clientY - touchStart.current
    if (dy > 0) pull.current = dy
  }
  const onTouchEnd = () => {
    if (pull.current > 80) window.location.reload()
    touchStart.current = null; pull.current = 0
  }
  return (
    <div className="min-h-screen bg-black" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <Tabs />
      <a href="/notifications" className="absolute top-4 right-4 z-20 text-white bg-white/20 rounded-full p-2 relative" title="Notifications">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        {unread > 0 && (<span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">{unread}</span>)}
      </a>
      <VerticalFeed type="foryou" />
      {/* Bottom FAB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <button onClick={() => setSheetOpen(true)} className="bg-[color:var(--primary-600)] hover:bg-[color:var(--primary-700)] text-white rounded-full shadow-xl px-5 py-2 text-sm">Actions</button>
      </div>
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Actions">
        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 rounded hover:bg-[color:var(--primary-50)]" onClick={async () => {
            try { const reg = await navigator.serviceWorker.ready; const video = document.querySelector('video') as HTMLVideoElement | null; if (video?.currentSrc) reg.active?.postMessage({ type: 'cache-url', url: video.currentSrc }); show({ message: 'Saved for offline', type: 'success' }) } catch {}
            setSheetOpen(false)
          }}>Save for offline</button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-[color:var(--primary-50)]" onClick={async () => {
            try { const url = window.location.href; if (navigator.share) await navigator.share({ title: 'Splintr', url }); else { await navigator.clipboard.writeText(url); show({ message: 'Link copied', type: 'success' }) } } catch {}
            setSheetOpen(false)
          }}>Share</button>
          <a href="/onboarding" className="block w-full text-left px-3 py-2 rounded hover:bg-[color:var(--primary-50)]" onClick={()=>setSheetOpen(false)}>Onboarding & Challenges</a>
        </div>
      </BottomSheet>
    </div>
  )
}
