import React, { useEffect, useState } from 'react'

export default function ReferralsPage() {
  const [code, setCode] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [referred, setReferred] = useState(0)
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/referrals/me')
      const data = await res.json()
      setCode(data.code || null)
      setLink(data.link || null)
      setReferred(data.referred || 0)
      setPoints(data.points || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createCode = async () => {
    const res = await fetch('/api/referrals/me', { method: 'POST' })
    if (res.ok) await load()
  }

  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopyMsg('Copied!')
    setTimeout(() => setCopyMsg(null), 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Invite Friends</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4 max-w-xl">
          {code ? (
            <>
              <div className="mb-2">Your referral code:</div>
              <div className="flex items-center gap-2 mb-4">
                <div className="font-mono text-lg bg-gray-100 px-3 py-1 rounded">{code}</div>
                <button onClick={copy} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Copy Link</button>
                {copyMsg && <span className="text-sm text-green-600">{copyMsg}</span>}
              </div>
              <div className="text-sm text-gray-600 mb-2">Share this link: <a className="text-blue-600 underline" href={link || '#'}>{link}</a></div>
            </>
          ) : (
            <button onClick={createCode} className="px-4 py-2 rounded bg-blue-600 text-white">Generate Your Code</button>
          )}
          <div className="mt-4 text-sm text-gray-700">
            <div>Friends joined: <b>{referred}</b></div>
            <div>Reward points: <b>{points}</b></div>
          </div>
        </div>
      )}
      <div className="mt-6 text-sm text-gray-600 max-w-xl">
        When your friends sign up using your link, you earn points. After sign-in, they should visit the app to activate the referral automatically.
      </div>
    </div>
  )
}

