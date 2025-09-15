import { NextResponse } from 'next/server'
import cloud from '@/lib/cloudinary'
import { validateCloudinaryConfig } from '@/lib/cloudinary'
import { logger } from '@/lib/logger'

export async function GET() {
  const startedAt = Date.now()

  // Cloudinary readiness
  let cloudinaryConfigured = false
  let cloudinaryReachable = false
  let cloudinaryMessage = 'ok'
  try {
    cloudinaryConfigured = validateCloudinaryConfig()
    if (cloudinaryConfigured) {
      // Try a lightweight admin ping; if not available, this will throw and we’ll still report configured
      // @ts-ignore
      if (cloud?.api?.ping) {
        // @ts-ignore
        await cloud.api.ping()
        cloudinaryReachable = true
      } else {
        cloudinaryReachable = true // assume ok if API ping is unavailable in SDK
      }
    } else {
      cloudinaryMessage = 'missing configuration'
    }
  } catch (e: any) {
    cloudinaryReachable = false
    cloudinaryMessage = e?.message || 'cloudinary error'
  }

  // Stripe readiness
  let stripeConfigured = !!process.env.STRIPE_SECRET_KEY
  let stripeReachable = false
  let stripeMessage = 'ok'
  try {
    if (stripeConfigured) {
      const { default: Stripe } = await import('stripe')
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: '2024-06-20',
        timeout: 5000,
      } as any)
      await stripe.balance.retrieve()
      stripeReachable = true
    } else {
      stripeMessage = 'missing STRIPE_SECRET_KEY'
    }
  } catch (e: any) {
    stripeReachable = false
    stripeMessage = e?.message || 'stripe error'
  }

  const overall = (cloudinaryConfigured && cloudinaryReachable) && (!stripeConfigured || (stripeConfigured && stripeReachable))
  const status = overall ? 'ready' : 'not-ready'
  const httpStatus = overall ? 200 : 503

  const body = {
    status,
    uptimeMs: Date.now() - startedAt,
    checks: {
      cloudinary: { configured: cloudinaryConfigured, reachable: cloudinaryReachable, message: cloudinaryMessage },
      stripe: { configured: stripeConfigured, reachable: stripeReachable, message: stripeMessage },
    },
    timestamp: new Date().toISOString(),
  }

  if (!overall) logger.warn({ readiness: body }, 'Readiness check not ready')

  return NextResponse.json(body, { status: httpStatus })
}

