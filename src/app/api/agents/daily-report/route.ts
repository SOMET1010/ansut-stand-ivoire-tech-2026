import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/stand'
import { collectDailyStats, dailyReport } from '@/lib/agents/report'

const DATE = /^\d{4}-\d{2}-\d{2}$/

function dateParam(request: NextRequest): string | null {
  const d = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  return DATE.test(d) ? d : null
}

// Chiffres du jour (sans IA).
export async function GET(request: NextRequest) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const date = dateParam(request)
  if (!date) return NextResponse.json({ error: 'Date invalide (AAAA-MM-JJ)' }, { status: 400 })
  return NextResponse.json({ stats: await collectDailyStats(date) })
}

// Bilan rédigé pour le DG (agent e).
export async function POST(request: NextRequest) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const date = dateParam(request)
  if (!date) return NextResponse.json({ error: 'Date invalide (AAAA-MM-JJ)' }, { status: 400 })
  try {
    return NextResponse.json(await dailyReport(date))
  } catch (error) {
    console.error('daily-report', error)
    return NextResponse.json({ error: 'Rédaction du bilan impossible' }, { status: 502 })
  }
}
