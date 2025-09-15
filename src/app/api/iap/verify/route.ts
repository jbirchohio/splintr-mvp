import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'
import crypto from 'crypto'

type AppleBody = { platform: 'apple'; receiptData: string; productId: string; amountCoins: number }
type GoogleBody = { platform: 'google'; packageName: string; productId: string; purchaseToken: string; amountCoins: number }
type Body = AppleBody | GoogleBody

async function verifyApple(receipt: string) {
  const secret = process.env.APPLE_IAP_SHARED_SECRET
  const body = { 'receipt-data': receipt, password: secret, 'exclude-old-transactions': true }
  const endpoint = process.env.APPLE_IAP_ENV === 'production' ? 'https://buy.itunes.apple.com/verifyReceipt' : 'https://sandbox.itunes.apple.com/verifyReceipt'
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`Apple verify failed: ${res.status}`)
  const json = await res.json()
  if (json.status !== 0) throw new Error(`Apple verify status ${json.status}`)
  return json
}

async function googleAccessToken() {
  const clientEmail = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL!
  const privateKey = (process.env.GOOGLE_PLAY_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claimSet = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')
  const toSign = `${header}.${claimSet}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(toSign)
  const signature = signer.sign(privateKey, 'base64url')
  const jwt = `${toSign}.${signature}`
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) })
  if (!res.ok) throw new Error(`Google token failed: ${res.status}`)
  return res.json() as Promise<{ access_token: string }>
}

async function verifyGoogle(packageName: string, productId: string, token: string) {
  const { access_token } = await googleAccessToken()
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } })
  if (!res.ok) throw new Error(`Google verify failed: ${res.status}`)
  const json = await res.json()
  if (json.purchaseState !== 0) throw new Error('Google purchase not purchased')
  return json
}

export const POST = withAuth(async (req, user) => {
  try {
    const body = (await req.json()) as Body
    const supabase = createServerClient()
    const coins = Math.max(0, Math.floor((body as any).amountCoins || 0))
    if (!coins) return NextResponse.json({ error: 'amountCoins required' }, { status: 400 })

    if (body.platform === 'apple') {
      const result = await verifyApple(body.receiptData)
      const latest = result.latest_receipt_info?.[0]
      const { data: rec, error } = await supabase
        .from('iap_receipts')
        .insert({ user_id: user.id, platform: 'apple', product_id: body.productId, receipt_data: body.receiptData, status: 'validated', purchased_at: new Date().toISOString(), raw_response: result })
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      // credit wallet via coins purchase API path is already implemented; keep single source by reusing table and ledger
      const { walletService } = await import('@/lib/payments/wallet')
      await walletService.creditCoins(user.id, coins, { referenceType: 'iap', referenceId: rec.id, metadata: { platform: 'apple', latest_tx: latest?.transaction_id } })
      return NextResponse.json({ ok: true })
    }

    if (body.platform === 'google') {
      const result = await verifyGoogle(body.packageName, body.productId, body.purchaseToken)
      const { data: rec, error } = await supabase
        .from('iap_receipts')
        .insert({ user_id: user.id, platform: 'google', product_id: body.productId, receipt_data: body.purchaseToken, status: 'validated', purchased_at: new Date().toISOString(), raw_response: result })
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const { walletService } = await import('@/lib/payments/wallet')
      await walletService.creditCoins(user.id, coins, { referenceType: 'iap', referenceId: rec.id, metadata: { platform: 'google' } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'IAP verification failed' }, { status: 400 })
  }
})
