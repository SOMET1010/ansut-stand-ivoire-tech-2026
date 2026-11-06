import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { canValidate, requireStaff } from '@/lib/stand'

const PatchSchema = z.object({
  contactRole: z.string().trim().max(200).nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal('')),
  letterDraft: z.string().max(20000).optional(),
  letterStatus: z.enum(['A_PREPARER', 'REDIGE', 'ENVOYE']).optional(),
  dgValidation: z.enum(['A_VALIDER', 'VALIDE', 'REFUSE']).optional(),
  attended: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const parsed = PatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
  const data = parsed.data

  const current = await db.invitation.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })

  if (data.dgValidation && !canValidate(auth.role)) {
    return NextResponse.json({ error: 'Seul le DG (administrateur) peut valider une invitation' }, { status: 403 })
  }
  if (data.letterStatus === 'ENVOYE' && (data.dgValidation ?? current.dgValidation) !== 'VALIDE') {
    return NextResponse.json({ error: 'Le courrier doit être validé par le DG avant envoi' }, { status: 409 })
  }
  // Modifier le texte d'un courrier validé le renvoie en validation.
  const draftChanged = data.letterDraft !== undefined && data.letterDraft !== current.letterDraft

  const invitation = await db.invitation.update({
    where: { id },
    data: {
      ...data,
      email: data.email === '' ? null : data.email,
      ...(draftChanged && !data.dgValidation ? { dgValidation: 'A_VALIDER' } : {}),
      ...(data.attended !== undefined ? { checkedInAt: data.attended ? new Date() : null } : {}),
    },
  })
  return NextResponse.json({ invitation })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  await db.invitation.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
