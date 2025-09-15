import { NextApiRequest, NextApiResponse } from 'next'

// Sets a cookie with referral code
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const code = (req.query.code as string) || ''
  if (!code) return res.status(400).json({ error: 'Missing code' })
  const maxAge = 30 * 24 * 3600
  res.setHeader('Set-Cookie', `ref_code=${encodeURIComponent(code)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`)
  return res.status(200).json({ ok: true })
}

