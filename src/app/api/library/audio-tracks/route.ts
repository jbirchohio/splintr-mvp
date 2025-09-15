import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('audio_tracks')
    .select('id, title, artist, duration_sec, url, public_id')
    .eq('is_active', true)
    .order('title', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tracks: data || [] })
}

