import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { videoTransformService, type EffectParams } from '@/lib/video/transform'
import { createServerClient } from '@/lib/supabase'

type Body = {
  videoId: string
  originalPublicId?: string
  sourceUrl?: string
  params: EffectParams
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json() as Body
    if (!body.videoId || !body.params || (!body.originalPublicId && !body.sourceUrl)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    // Verify ownership of video
    const supabase = createServerClient()
    const { data: video, error: vErr } = await supabase
      .from('videos')
      .select('id, creator_id')
      .eq('id', body.videoId)
      .single()
    if (vErr || !video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    if (video.creator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const result = await videoTransformService.apply({ originalPublicId: body.originalPublicId, sourceUrl: body.sourceUrl, params: body.params })
    const { data: derivative, error: dErr } = await supabase
      .from('video_derivatives')
      .insert({ video_id: body.videoId, derived_public_id: result.derivedPublicId, params: body.params })
      .select('id')
      .single()
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, derivedPublicId: result.derivedPublicId, url: result.url, derivativeId: derivative.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Transform failed' }, { status: 500 })
  }
})
