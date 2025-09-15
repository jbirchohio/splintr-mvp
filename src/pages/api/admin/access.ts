import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = (req.cookies['sb-access-token'] as string) || (req.headers.authorization?.replace('Bearer ', '') as string) || ''
    if (!token) return res.status(200).json({ admin: false })
    const supabase = createServerClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return res.status(200).json({ admin: false })
    const role = (data.user as any).app_metadata?.role
    return res.status(200).json({ admin: role === 'admin' })
  } catch (e) {
    return res.status(200).json({ admin: false })
  }
}
