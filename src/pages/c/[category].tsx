import React from 'react'
import { useRouter } from 'next/router'
import { StoryPlayer } from '@/components/story/StoryPlayer'
import { useCategoryFeed } from '@/hooks/useCategoryFeed'

export default function CategoryFeedPage() {
  const router = useRouter()
  const { category } = router.query as { category?: string }
  const { items, loading } = useCategoryFeed(category || '', 20)
  const [index, setIndex] = React.useState(0)
  if (!category) return null
  return (
    <div className="fixed inset-0 bg-black">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-white text-sm px-3 py-1 rounded-full bg-white/20">{category}</div>
      <div className="w-full h-full" style={{ transform: `translateY(-${index * 100}vh)`, transition: 'transform 300ms ease-out' }}>
        {items.map((it, idx) => (
          <div key={it.storyId} className="w-full h-screen overflow-hidden relative">
            {Math.abs(idx - index) <= 1 && (
              <StoryPlayer storyId={it.storyId} autoStart={idx === index} muted watermark={false} />
            )}
          </div>
        ))}
      </div>
      {/* simple nav */}
      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4">
        <button onClick={() => setIndex(i => Math.max(0, i-1))} className="px-3 py-1 bg-white/20 text-white rounded">Prev</button>
        <button onClick={() => setIndex(i => Math.min(items.length-1, i+1))} className="px-3 py-1 bg-white/20 text-white rounded">Next</button>
      </div>
    </div>
  )
}

