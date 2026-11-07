import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'
import { EVENT } from '@/config/event'
import { ProgramInput, toPanelData } from '@/lib/program-input'

async function findPanel(id: string) {
  return db.panel.findFirst({
    where: { id, eventId: EVENT.id },
    include: { _count: { select: { invitations: true, attendances: true, questions: true } } },
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (!(await findPanel(id))) return NextResponse.json({ error: 'Séquence introuvable' }, { status: 404 })
  const parsed = ProgramInput.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })
  await db.panel.update({ where: { id }, data: toPanelData(parsed.data) })
  return NextResponse.json({ ok: true })
}

// Suppression définitive seulement si aucune invitation, présence ni question n'y est rattachée
// (elles seraient supprimées en cascade) ; sinon, masquer la séquence.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const panel = await findPanel(id)
  if (!panel) return NextResponse.json({ error: 'Séquence introuvable' }, { status: 404 })
  const { invitations, attendances, questions } = panel._count
  if (invitations + attendances + questions > 0) {
    return NextResponse.json(
      { error: `Séquence liée à ${invitations} invitation(s), ${attendances} présence(s) et ${questions} question(s) : masquez-la plutôt.` },
      { status: 409 },
    )
  }
  await db.panel.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
