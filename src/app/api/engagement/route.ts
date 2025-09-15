import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { analyticsSchemas } from '@/lib/validation-schemas'
import { createServerClient } from '@/lib/supabase'

export const POST = withSecurity(
  withValidation({ bodySchema: analyticsSchemas.engagement, requireAuth: false })(async (req, { user }) => {
    try {
      const supabase = createServerClient()
      const body = await req.json()
      const userId = user?.id || null
      const typeMap: Record<string, string> = { view: 'view', like: 'like', share: 'share', comment: 'comment', complete: 'complete', dwell: 'time_spent', skip: 'skip' }
      const type = typeMap[body.action]
      if (!type) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      await (supabase as any).from('user_interactions' as any).insert({
        user_id: userId,
        story_id: body.contentType === 'story' ? body.contentId : null,
        type,
        value: typeof body.metadata?.value === 'number' ? body.metadata.value : null,
        metadata: body.metadata || null
      })
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: 'Failed to record engagement' }, { status: 500 })
    }
  })
)
