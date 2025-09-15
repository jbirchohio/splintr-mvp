import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'
import ytdl from 'ytdl-core'

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { url, category } = await req.json() as { url: string; category?: string }
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
    const sb = createServerClient()
    let provider: string = 'other'
    if (ytdl.validateURL(url)) provider = 'youtube'

    // Create import record
    const { data: imp, error: iErr } = await sb.from('content_imports').insert({ user_id: user.id, provider, source_url: url, status: 'processing' }).select('id').single()
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })

    if (provider !== 'youtube') {
      await sb.from('content_imports').update({ status: 'failed', message: 'Only YouTube URLs supported currently' }).eq('id', imp.id)
      return NextResponse.json({ error: 'Only YouTube URLs supported currently' }, { status: 400 })
    }

    const info = await ytdl.getInfo(url)
    const title = info.videoDetails.title
    const lengthSeconds = Number(info.videoDetails.lengthSeconds || '0')
    if (lengthSeconds > 60 * 2) {
      await sb.from('content_imports').update({ status: 'failed', message: 'Video too long' }).eq('id', imp.id)
      return NextResponse.json({ error: 'Video too long for import' }, { status: 400 })
    }
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'videoandaudio' })
    if (!format || !format.url) throw new Error('No suitable format')

    // Download and upload to storage
    const res = await fetch(format.url)
    if (!res.ok) throw new Error('Failed to download video')
    const arrayBuffer = await res.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    const ext = (format.container || 'mp4').split('/').pop() || 'mp4'
    const fileName = `${user.id}-${Date.now()}.${ext}`
    const path = `videos/${fileName}`
    const { error: upErr } = await sb.storage.from('videos').upload(path, buffer, { contentType: `video/${ext}`, upsert: false })
    if (upErr) throw new Error(upErr.message)

    const { data: { publicUrl } } = sb.storage.from('videos').getPublicUrl(path)
    const { data: video, error: vErr } = await sb
      .from('videos')
      .insert({ creator_id: user.id, original_filename: title, duration: lengthSeconds, file_size: buffer.length, streaming_url: publicUrl, processing_status: 'completed', moderation_status: 'pending', category: category || null })
      .select('id')
      .single()
    if (vErr) throw new Error(vErr.message)

    await sb.from('content_imports').update({ status: 'completed', message: null }).eq('id', imp.id)
    return NextResponse.json({ ok: true, videoId: video.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Import failed' }, { status: 400 })
  }
})

