import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'
import { EVENT } from '@/config/event'

// Séquences du stand avec invitations, présences et nombre de questions (équipe).
export async function GET() {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth

  const panels = await db.panel.findMany({
    where: { eventId: EVENT.id },
    orderBy: { order: 'asc' },
    include: {
      invitations: { orderBy: { createdAt: 'asc' } },
      attendances: { orderBy: { createdAt: 'desc' } },
      _count: { select: { questions: true } },
    },
  })
  return NextResponse.json({ panels, role: auth.role })
}
