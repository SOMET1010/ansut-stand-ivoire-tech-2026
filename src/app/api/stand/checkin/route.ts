import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { clientIp, rateLimited } from '@/lib/stand'
import { EVENT } from '@/config/event'

const CheckinSchema = z.object({
  panelId: z.string().min(1),
  registrationId: z.string().optional(),
  name: z.string().trim().max(120).optional(),
  organization: z.string().trim().max(160).optional(),
})

// Pointage public d'un visiteur à une séquence (QR code affiché sur le stand).
export async function POST(request: NextRequest) {
  if (rateLimited(`checkin:${clientIp(request.headers)}`, 2000, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Trop de pointages, réessayez dans quelques minutes' }, { status: 429 })
  }
  const parsed = CheckinSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  const { panelId, registrationId, organization } = parsed.data

  const panel = await db.panel.findFirst({ where: { id: panelId, eventId: EVENT.id } })
  if (!panel) return NextResponse.json({ error: 'Séquence introuvable' }, { status: 404 })

  let name = parsed.data.name
  let org = organization
  if (registrationId) {
    const reg = await db.eventRegistration.findFirst({ where: { id: registrationId, eventId: EVENT.id } })
    if (!reg) return NextResponse.json({ error: 'Inscription introuvable' }, { status: 404 })
    name = `${reg.firstName ?? ''} ${reg.lastName ?? ''}`.trim()
    org = reg.company ?? org
    await db.eventRegistration.update({ where: { id: reg.id }, data: { attended: true } })
    const existing = await db.sessionAttendance.findUnique({ where: { panelId_registrationId: { panelId, registrationId } } })
    if (existing) return NextResponse.json({ attendance: existing, already: true, panel: panel.title })
  }
  if (!name || name.length < 2) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const attendance = await db.sessionAttendance.create({ data: { panelId, registrationId, name, organization: org } })
  return NextResponse.json({ attendance, already: false, panel: panel.title }, { status: 201 })
}
