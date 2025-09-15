import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { StoryPlayer } from '@/components/story/StoryPlayer'

export default function StoryPlayPage(props: { meta?: { title?: string; thumbnailUrl?: string } }) {
  const router = useRouter()
  const { id, wt } = router.query as { id?: string; wt?: string }
  if (!id) return null
  const watermark = typeof wt !== 'undefined' && wt !== '0'
  return (
    <div className="fixed inset-0 bg-black">
      <Head>
        <title>{props.meta?.title ? `${props.meta.title} - Splintr` : 'Story - Splintr'}</title>
        {props.meta?.thumbnailUrl && (
          <>
            <meta property="og:title" content={props.meta.title || 'Splintr Story'} />
            <meta property="og:image" content={props.meta.thumbnailUrl} />
            <meta name="twitter:card" content="summary_large_image" />
          </>
        )}
      </Head>
      <StoryPlayer storyId={id} autoStart muted={false} paused={false} watermark={watermark} />
    </div>
  )
}

export async function getServerSideProps(ctx: any) {
  try {
    const { createServerClient } = await import('@/lib/supabase')
    const supabase = createServerClient()
    const { id } = ctx.params
    const { data } = await supabase
      .from('stories')
      .select('title, thumbnail_url')
      .eq('id', id)
      .single()
    return { props: { meta: { title: data?.title || null, thumbnailUrl: data?.thumbnail_url || null } } }
  } catch {
    return { props: { meta: null } }
  }
}
