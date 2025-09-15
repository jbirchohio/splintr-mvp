import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

type Body = { campaignId: string; message?: string }

export const POST = withAuth(async (req, user) => {
  try {
    const body = (await req.json()) as Body
    if (!body.campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    const supabase = createServerClient()
    const { error } = await supabase
      .from('brand_applications')
      .insert({ campaign_id: body.campaignId, creator_id: user.id, message: body.message || null })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to apply' }, { status: 400 })
  }
})

