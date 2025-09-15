import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { createServerClient } from '@/lib/supabase'

// GET: list comments for a story (flat with parent ids)
export const GET = withSecurity(
  withValidation({ paramsSchema: validationSchemas.story.storyParams })(async (req, { params }) => {
    const { storyId } = params!
    const supabase = createServerClient()
    const url = new URL(req.url)
    const limit = Number(url.searchParams.get('limit') || 50)
    const cursor = url.searchParams.get('cursor') // ISO created_at
    const { data, error } = await supabase
      .from('story_comments')
      .select('id, story_id, user_id, parent_comment_id, content, created_at, users!story_comments_user_id_fkey (name, avatar_url)')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false })
      .lt(cursor ? 'created_at' : 'created_at', cursor || new Date().toISOString())
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const comments = (data || []).map((c: any) => ({
      id: c.id,
      storyId: c.story_id,
      userId: c.user_id,
      parentId: c.parent_comment_id,
      content: c.content,
      createdAt: c.created_at,
      author: c.users ? { name: c.users.name, avatarUrl: c.users.avatar_url } : null
    }))

    const nextCursor = (data || []).length === limit ? (data![data!.length - 1] as any).created_at : null
    return NextResponse.json({ comments, nextCursor })
  })
)

// POST: add a comment
export const POST = withSecurity(
  withValidation({ paramsSchema: validationSchemas.story.storyParams, requireAuth: true })(async (req, { params, user }) => {
    const { storyId } = params!
    const { content, parentId } = await req.json()
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    const supabase = createServerClient()
    const { error, data: inserted } = await supabase.from('story_comments').insert({
      story_id: storyId,
      user_id: user!.id,
      parent_comment_id: parentId || null,
      content: content.trim()
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Interaction log
    await supabase.from('user_interactions').insert({ user_id: user!.id, story_id: storyId, type: 'comment' })

    // Notifications: story creator, and parent comment author if replying
    const [{ data: story }, { data: parent }] = await Promise.all([
      supabase.from('stories').select('creator_id').eq('id', storyId).maybeSingle(),
      parentId ? supabase.from('story_comments').select('user_id').eq('id', parentId).maybeSingle() : Promise.resolve({ data: null } as any)
    ])
    const recipients = new Set<string>()
    if (story?.creator_id && story.creator_id !== user!.id) recipients.add(story.creator_id)
    if (parent?.user_id && parent.user_id !== user!.id) recipients.add(parent.user_id)
    if (recipients.size > 0) {
      const rows = Array.from(recipients).map(uid => ({ user_id: uid, type: 'comment', data: { storyId, commentId: inserted!.id, actorId: user!.id } }))
      await supabase.from('notifications').insert(rows as any)
    }

    return NextResponse.json({ ok: true })
  })
)
