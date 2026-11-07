import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'
import { EVENT } from '@/config/event'

const CreateSchema = z.object({
  panelId: z.string().min(1),
  partnerName: z.string().trim().min(2).max(200),
  contactRole: z.string().trim().max(200).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
})

// Ajout d'un partenaire à inviter sur une séquence.
export async function POST(request: NextRequest) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth

  const parsed = CreateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
  const { email, ...rest } = parsed.data
  if (!(await db.panel.findFirst({ where: { id: rest.panelId, eventId: EVENT.id } }))) {
    return NextResponse.json({ error: 'Séquence introuvable' }, { status: 404 })
  }
  const invitation = await db.invitation.create({ data: { ...rest, email: email || null } })
  return NextResponse.json({ invitation }, { status: 201 })
}
