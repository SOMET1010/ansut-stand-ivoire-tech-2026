import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'
import { activityResults } from '@/lib/live'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Ctx) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const results = await activityResults((await params).id)
  return results ? NextResponse.json(results) : NextResponse.json({ error: 'Activité introuvable' }, { status: 404 })
}

// Ouvrir / fermer les réponses, ou effacer les réponses (reset).
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const parsed = z.object({ open: z.boolean().optional(), reset: z.boolean().optional() }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  if (parsed.data.reset) await db.liveResponse.deleteMany({ where: { activityId: id } })
  if (parsed.data.open !== undefined) await db.liveActivity.update({ where: { id }, data: { open: parsed.data.open } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  await db.liveActivity.delete({ where: { id: (await params).id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
