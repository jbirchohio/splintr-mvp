import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cookies = (req.headers.cookie || '')
    const ok = cookies.split(/;\s*/).some(c => c.startsWith('invite_ok='))
    return res.status(200).json({ allowed: ok })
  } catch {
    return res.status(200).json({ allowed: false })
  }
}

