import { NextResponse } from 'next/server'
import { getProgram, groupByDay } from '@/lib/program'

export const dynamic = 'force-dynamic'

// Programme public du stand (séquences non masquées).
export async function GET() {
  const items = await getProgram()
  return NextResponse.json({ days: groupByDay(items), count: items.length })
}
