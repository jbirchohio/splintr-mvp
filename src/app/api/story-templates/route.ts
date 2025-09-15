import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('story_templates')
    .select('id, code, name, description, template_data')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data || [] })
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json() as { templateId: string; title: string; description?: string }
    if (!body.templateId || !body.title) return NextResponse.json({ error: 'templateId and title required' }, { status: 400 })
    const supabase = createServerClient()
    const { data: tmpl, error: tErr } = await supabase
      .from('story_templates')
      .select('template_data')
      .eq('id', body.templateId)
      .single()
    if (tErr || !tmpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const storyData = tmpl.template_data
    // Validate structure via DB function if available else rely on client later
    const { data: created, error: cErr } = await supabase
      .from('stories')
      .insert({ creator_id: user.id, title: body.title, description: body.description || '', story_data: storyData, is_published: false })
      .select('id')
      .single()
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
    return NextResponse.json({ storyId: created.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Instantiate failed' }, { status: 400 })
  }
})

