import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id
    const sb = createServerClient()
    const { data: user, error } = await sb
      .from('users')
      .select('id, name, avatar_url, is_verified, bio, link_url')
      .eq('id', userId)
      .single()
    if (error || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // stats
    const [followers, following, stories] = await Promise.all([
      sb.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      sb.from('user_follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
      sb.from('stories').select('id, view_count, is_published', { count: 'exact' }).eq('creator_id', userId).eq('is_published', true)
    ])
    const storyCount = stories.count || 0
    const totalViews = (stories.data || []).reduce((s: number, r: any) => s + Number(r.view_count || 0), 0)
    return NextResponse.json({
      profile: {
        id: user.id,
        name: (user as any).name,
        avatarUrl: (user as any).avatar_url,
        isVerified: (user as any).is_verified,
        bio: (user as any).bio,
        link: (user as any).link_url,
      },
      stats: {
        followers: followers.count || 0,
        following: following.count || 0,
        storyCount,
        totalViews
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
}

