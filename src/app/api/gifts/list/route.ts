import { NextResponse } from 'next/server'
import { giftsService } from '@/lib/payments/gifts'

export async function GET() {
  try {
    const gifts = await giftsService.listActive()
    return NextResponse.json({ gifts })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load gifts' }, { status: 500 })
  }
}

