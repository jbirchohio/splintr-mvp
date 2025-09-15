import React, { useEffect, useState } from 'react'

type CreatorStoryRow = {
  id: string
  title: string
  publishedAt: string | null
  isPremium: boolean
  tipEnabled: boolean
  totalViews: number
  completionRate: number
  likes: number
  comments: number
  tips: number
}

export default function CreatorAnalyticsPage() {
  const [stories, setStories] = useState<CreatorStoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch('/api/creator/analytics')
      const json = await res.json()
      setStories(json.stories || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Creator Analytics</h1>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b bg-gray-50">
              <th className="py-2 px-3">Title</th>
              <th className="py-2 px-3">Published</th>
              <th className="py-2 px-3">Views</th>
              <th className="py-2 px-3">Completion</th>
              <th className="py-2 px-3">Likes</th>
              <th className="py-2 px-3">Comments</th>
              <th className="py-2 px-3">Tips ($)</th>
              <th className="py-2 px-3">Flags</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {stories.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-3 font-medium">{s.title}</td>
                <td className="py-2 px-3 text-gray-600">{s.publishedAt ? new Date(s.publishedAt).toLocaleString() : 'Draft'}</td>
                <td className="py-2 px-3">{s.totalViews}</td>
                <td className="py-2 px-3">{Math.round(s.completionRate * 100)}%</td>
                <td className="py-2 px-3">{s.likes}</td>
                <td className="py-2 px-3">{s.comments}</td>
                <td className="py-2 px-3">{s.tips.toFixed(2)}</td>
                <td className="py-2 px-3 text-xs">
                  {s.isPremium && <span className="mr-2 inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Premium</span>}
                  {s.tipEnabled && <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded">Tips</span>}
                </td>
                <td className="py-2 px-3">
                  <a href={`/creator/analytics/${s.id}`} className="text-blue-600 underline">Details</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
