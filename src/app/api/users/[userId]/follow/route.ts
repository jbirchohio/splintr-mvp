import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { createServerClient } from '@/lib/supabase'

// GET: follow state and follower count
export const GET = withSecurity(
  withValidation({ paramsSchema: validationSchemas.user.userParams })(async (_req, { params, user }) => {
    const { userId } = params!
    const supabase = createServerClient()
    const [{ count }, { data: rel }] = await Promise.all([
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      user?.id
        ? supabase.from('user_follows').select('follower_id').eq('follower_id', user.id).eq('following_id', userId).maybeSingle()
        : Promise.resolve({ data: null } as any)
    ])
    return NextResponse.json({ following: Boolean(rel), followerCount: count || 0 })
  })
)

// POST: toggle follow
export const POST = withSecurity(
  withValidation({ paramsSchema: validationSchemas.user.userParams, requireAuth: true })(async (_req, { params, user }) => {
    const { userId } = params!
    const supabase = createServerClient()
    if (userId === user!.id) {
      return NextResponse.json({ error: "Can't follow yourself" }, { status: 400 })
    }
    const { data: existing } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', user!.id)
      .eq('following_id', userId)
      .maybeSingle()
    if (existing) {
      await supabase.from('user_follows').delete().eq('follower_id', user!.id).eq('following_id', userId)
      await supabase.from('user_interactions').insert({ user_id: user!.id, type: 'unfollow', story_id: null })
    } else {
      await supabase.from('user_follows').insert({ follower_id: user!.id, following_id: userId })
      await supabase.from('user_interactions').insert({ user_id: user!.id, type: 'follow', story_id: null })
      // Notify the followed user
      await supabase.from('notifications').insert({ user_id: userId, type: 'follow', data: { actorId: user!.id } } as any)
    }
    const { count } = await supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId)
    return NextResponse.json({ following: !existing, followerCount: count || 0 })
  })
)
