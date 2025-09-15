import React, { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CategoriesPage() {
  const [cats, setCats] = useState<Array<{ category: string, count: number }>>([])
  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCats(data.categories || [])
    }
    load()
  }, [])
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-xl font-semibold mb-4">Categories</h1>
      <div className="flex flex-wrap gap-2">
        {cats.map(c => (
          <Link key={c.category} href={`/c/${encodeURIComponent(c.category)}`} className="px-3 py-1 rounded-full bg-white/10">{c.category} <span className="opacity-70">({c.count})</span></Link>
        ))}
      </div>
    </div>
  )
}

