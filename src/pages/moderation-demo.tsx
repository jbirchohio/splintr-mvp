import React, { useState } from 'react'

export default function ModerationDemo() {
  const [contentId, setContentId] = useState('content-e2e-1')
  const [contentType, setContentType] = useState<'story' | 'video' | 'comment'>('video')
  const [reason, setReason] = useState('Inappropriate content')
  const [flagId, setFlagId] = useState('')
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [message, setMessage] = useState('')

  const handleFlag = async () => {
    setMessage('Flagging content...')
    try {
      const res = await fetch('/api/moderation/flag-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In real app this is via cookie/session; for demo we send a bearer
          Authorization: 'Bearer e2e-token',
        },
        body: JSON.stringify({ contentId, contentType, reason }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to flag')
      setFlagId(data.data?.id || '')
      setMessage(`Flag created: ${data.data?.id || 'unknown'}`)
    } catch (e) {
      setMessage(`Error: ${(e as Error).message}`)
    }
  }

  const handleReview = async () => {
    setMessage('Reviewing flag...')
    try {
      const res = await fetch('/api/moderation/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer e2e-admin',
        },
        body: JSON.stringify({ flagId, decision, adminNotes: 'E2E review' }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to review')
      setMessage(data.message || 'Review completed')
    } catch (e) {
      setMessage(`Error: ${(e as Error).message}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Moderation Demo</h1>

      {message && (
        <div aria-label="status" className={`p-3 rounded ${message.startsWith('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {message}
        </div>
      )}

      <section aria-label="Flag Content" className="space-y-3 border p-4 rounded">
        <h2 className="font-medium">Flag Content</h2>
        <label className="block">
          <span className="text-sm">Content ID</span>
          <input aria-label="Content ID" className="border p-2 w-full" value={contentId} onChange={e => setContentId(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm">Content Type</span>
          <select aria-label="Content Type" className="border p-2 w-full" value={contentType} onChange={e => setContentType(e.target.value as any)}>
            <option value="story">story</option>
            <option value="video">video</option>
            <option value="comment">comment</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm">Reason</span>
          <input aria-label="Reason" className="border p-2 w-full" value={reason} onChange={e => setReason(e.target.value)} />
        </label>
        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleFlag}>Flag Content</button>
      </section>

      <section aria-label="Review Flag" className="space-y-3 border p-4 rounded">
        <h2 className="font-medium">Review Flag</h2>
        <label className="block">
          <span className="text-sm">Flag ID</span>
          <input aria-label="Flag ID" className="border p-2 w-full" value={flagId} onChange={e => setFlagId(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm">Decision</span>
          <select aria-label="Decision" className="border p-2 w-full" value={decision} onChange={e => setDecision(e.target.value as any)}>
            <option value="approve">approve</option>
            <option value="reject">reject</option>
          </select>
        </label>
        <button type="button" className="px-4 py-2 bg-emerald-600 text-white rounded" onClick={handleReview}>Submit Review</button>
      </section>
    </div>
  )
}

