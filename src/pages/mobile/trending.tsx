import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useNotifications } from '@/hooks/useNotifications'
import { VerticalFeed } from '@/components/feed/VerticalFeed'

function Tabs() {
  const { pathname } = useRouter()
  const Tab = ({ href, label }: { href: string; label: string }) => (
    <Link href={href} className={`px-3 py-1 rounded-full text-sm ${pathname === href ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>{label}</Link>
  )
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
      <Tab href="/mobile/foryou" label="For You" />
      <Tab href="/mobile/following" label="Following" />
      <Tab href="/mobile/trending" label="Trending" />
      <Tab href="/mobile" label="Latest" />
    </div>
  )
}

export default function MobileTrendingPage() {
  const { unread } = useNotifications()
  return (
    <div className="min-h-screen bg-black">
      <Tabs />
      <a href="/notifications" className="absolute top-4 right-4 z-20 text-white bg-white/20 rounded-full p-2 relative" title="Notifications">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        {unread > 0 && (<span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">{unread}</span>)}
      </a>
      <VerticalFeed type="trending" />
    </div>
  )
}
