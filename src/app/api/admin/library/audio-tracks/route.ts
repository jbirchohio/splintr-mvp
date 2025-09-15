import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as { title: string; artist: string; durationSec?: number; url?: string; publicId?: string; license?: string }
  if (!body.title || !body.artist || (!body.url && !body.publicId)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('audio_tracks')
    .insert({ title: body.title, artist: body.artist, duration_sec: Math.floor(body.durationSec || 0), url: body.url || null, public_id: body.publicId || null, license: body.license || 'royalty_free' })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

