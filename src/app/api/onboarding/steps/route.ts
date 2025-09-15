import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

const STEPS = [
  { code: 'intro', title: 'Welcome to Splintr' },
  { code: 'follow_creator', title: 'Follow a creator' },
  { code: 'watch_story', title: 'Watch your first story' },
]

export const GET = withAuth(async (_req, user) => {
  const sb = createServerClient()
  const { data } = await sb
    .from('user_onboarding_steps')
    .select('step_code')
    .eq('user_id', user.id)
  const completed = new Set((data || []).map(r => r.step_code))
  return NextResponse.json({ steps: STEPS.map(s => ({ ...s, completed: completed.has(s.code) })) })
})

export const POST = withAuth(async (req, user) => {
  const { stepCode } = await req.json() as { stepCode: string }
  if (!STEPS.find(s => s.code === stepCode)) return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  const sb = createServerClient()
  const { error } = await sb.from('user_onboarding_steps').insert({ user_id: user.id, step_code: stepCode })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

