"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ProfilePage({ params }: { params: { id: string } }) {
  const userId = params.id
  const [data, setData] = useState<any | null>(null)
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const [pRes, sRes] = await Promise.all([
          fetch(`/api/profile/${userId}`),
          fetch(`/api/profile/${userId}/stories`),
        ])
        const p = await pRes.json(); const s = await sRes.json()
        if (!pRes.ok) throw new Error(p.error || 'Failed to load profile')
        setData(p)
        setStories(s.stories || [])
      } catch (e: any) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [userId])

  if (loading) return <div className="p-6 text-sm text-muted">Loading...</div>
  if (error || !data) return <div className="p-6 text-sm text-red-600">{error || 'Failed to load'}</div>
  const { profile, stats } = data
  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <img src={profile.avatarUrl || '/vercel.svg'} alt={profile.name} className="w-20 h-20 rounded-full object-cover" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{profile.name}</h1>
            {profile.isVerified && (
              <span className="inline-flex items-center gap-1 text-xs text-[color:var(--accent)]"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4 2 2-6 6-4-4z"/></svg>Verified</span>
            )}
          </div>
          <div className="text-sm text-muted flex items-center gap-4 mt-1">
            <Link href={`/profile/${userId}/followers`} className="hover:underline">{stats.followers} followers</Link>
            <Link href={`/profile/${userId}/following`} className="hover:underline">{stats.following} following</Link>
            <span>{stats.storyCount} stories</span>
            <span>{stats.totalViews} views</span>
          </div>
          {profile.bio && (<div className="text-sm mt-2 whitespace-pre-wrap">{profile.bio}</div>)}
          {profile.link && (<a href={profile.link} className="text-sm text-[color:var(--primary-600)] hover:underline" target="_blank" rel="noreferrer">{profile.link}</a>)}
        </div>
        <div>
          <FollowButton creatorId={userId} />
        </div>
      </div>

      {/* Achievements */}
      <Achievements userId={userId} />

      {/* Grid */}
      <div className="mt-6 grid grid-cols-3 gap-1">
        {stories.map((s) => (
          <Link key={s.id} href={`/story/${s.id}/play`} className="relative block group">
            <div className="aspect-[9/16] bg-black/5 overflow-hidden">
              {s.thumbnailUrl ? (
                <img src={s.thumbnailUrl} alt={s.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
            <div className="absolute bottom-1 left-1 right-1 flex justify-between text-[10px] bg-black/50 text-white px-1 py-0.5 rounded">
              <span className="inline-flex items-center gap-1"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v12H3zM2 20h20v-2H2z"/></svg>{s.views}</span>
              {s.isPremium && <span className="text-[10px] px-1 rounded bg-yellow-500 text-black">Premium</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function FollowButton({ creatorId }: { creatorId: string }) {
  const [state, setState] = useState<{ following: boolean; followerCount: number } | null>(null)
  useEffect(() => { (async () => { try { const r = await fetch(`/api/users/${creatorId}/follow`); const d = await r.json(); setState({ following: !!d.following, followerCount: d.followerCount || 0 }) } catch {} })() }, [creatorId])
  return (
    <button onClick={async () => { try { const r = await fetch(`/api/users/${creatorId}/follow`, { method: 'POST' }); const d = await r.json(); setState({ following: !!d.following, followerCount: d.followerCount || 0 }) } catch {} }} className="px-3 py-1.5 bg-[color:var(--primary-600)] text-white rounded-full text-sm hover:bg-[color:var(--primary-700)]">
      {state?.following ? 'Following' : 'Follow'}
    </button>
  )
}

function Achievements({ userId }: { userId: string }) {
  const [ach, setAch] = useState<any[]>([])
  useEffect(() => { (async () => { try { const r = await fetch(`/api/profile/${userId}/achievements`); const d = await r.json(); if (r.ok) setAch(d.achievements || []) } catch {} })() }, [userId])
  if (!ach.length) return null
  return (
    <div className="mt-4">
      <div className="text-sm font-semibold mb-2">Achievements</div>
      <div className="flex flex-wrap gap-2">
        {ach.map(a => (
          <div key={a.code} className="text-xs px-2 py-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]">
            {a.icon ? <span className="mr-1">{a.icon}</span> : null}{a.name}
          </div>
        ))}
      </div>
    </div>
  )
}

