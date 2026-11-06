import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'
import { uniqueCode } from '@/lib/quiz'
import { ActivityInput } from '@/lib/live'

export async function GET() {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const activities = await db.liveActivity.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { responses: true } } } })
  return NextResponse.json({ activities })
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const parsed = ActivityInput.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Activité invalide' }, { status: 400 })
  const { type, prompt, options } = parsed.data
  const activity = await db.liveActivity.create({
    data: { type, prompt, options: type === 'POLL' ? JSON.stringify(options) : null, code: await uniqueCode() },
  })
  return NextResponse.json({ activity }, { status: 201 })
}
