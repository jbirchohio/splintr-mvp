import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

export const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-06-20',
})

export function getStripeWebhookSecret(kind: 'payments' | 'connect') {
  const key = kind === 'payments' ? process.env.STRIPE_WEBHOOK_SECRET : process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!key) throw new Error(`Missing webhook secret for ${kind}`)
  return key
}

