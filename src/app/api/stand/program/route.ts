import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'
import { EVENT } from '@/config/event'
import { getProgram } from '@/lib/program'
import { ProgramInput, toPanelData } from '@/lib/program-input'

// Éditeur de programme (équipe) : liste complète, masquées comprises, avec leurs dépendances.
export async function GET() {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const items = await getProgram({ includeHidden: true })
  const counts = await db.panel.findMany({
    where: { eventId: EVENT.id },
    select: { id: true, _count: { select: { invitations: true, attendances: true, questions: true } } },
  })
  const byId = new Map(counts.map((c) => [c.id, c._count]))
  return NextResponse.json({ items: items.map((it) => ({ ...it, usage: byId.get(it.id) })) })
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const parsed = ProgramInput.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })
  const order = await db.panel.count({ where: { eventId: EVENT.id } })
  const panel = await db.panel.create({ data: { ...toPanelData(parsed.data), order, eventId: EVENT.id } })
  return NextResponse.json({ id: panel.id }, { status: 201 })
}
