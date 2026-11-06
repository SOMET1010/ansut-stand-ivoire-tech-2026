// Paramétrage de la plateforme pour le stand ANSUT – Ivoire Tech Forum 2026.
// Idempotent : crée/met à jour l'organisateur, l'événement et un panel par séquence
// de la matrice « Invitations et présence » (data/itf2026-sessions.json).
//
//   ORGANIZER_EMAIL=... ORGANIZER_PASSWORD=... npx tsx scripts/seed-itf2026.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { EVENT, STAND_SESSIONS, sessionType } from '../src/config/event'

const prisma = new PrismaClient()

/** "11/11/2026" + "15h00" | "11h00-11h30" | "17h30 proposé" | "À confirmer" -> Date (heure d'Abidjan = UTC). */
function toDate(date: string, time: string, end = false): Date | null {
  const [d, m, y] = date.split('/').map(Number)
  const hours = [...time.matchAll(/(\d{1,2})h(\d{2})?/g)]
  const h = end ? hours[1] : hours[0]
  if (!h) return end ? null : new Date(Date.UTC(y, m - 1, d, 9, 0))
  return new Date(Date.UTC(y, m - 1, d, Number(h[1]), Number(h[2] ?? 0)))
}

async function main() {
  const email = process.env.ORGANIZER_EMAIL
  const password = process.env.ORGANIZER_PASSWORD
  if (!email || !password) throw new Error('ORGANIZER_EMAIL et ORGANIZER_PASSWORD sont requis')

  const organizer = await prisma.user.upsert({
    where: { email },
    update: { role: 'ORGANIZER' },
    create: { email, name: 'Équipe stand ANSUT', role: 'ORGANIZER', passwordHash: await bcrypt.hash(password, 10) },
  })

  const program = STAND_SESSIONS.map((s) => ({
    day: s.day, time: s.time, title: s.title, description: '', speaker: s.pilot, location: s.location, type: sessionType(s.title),
  }))

  const event = await prisma.event.upsert({
    where: { id: EVENT.id },
    update: { title: EVENT.title, location: EVENT.location, program: JSON.stringify(program), isActive: true, isPublic: true },
    create: {
      id: EVENT.id,
      slug: EVENT.slug,
      title: EVENT.title,
      description: EVENT.tagline,
      startDate: new Date(EVENT.startDate),
      endDate: new Date(EVENT.endDate),
      location: EVENT.location,
      isPublic: true,
      isActive: true,
      program: JSON.stringify(program),
      branding: { primary: '#2b3990', secondary: '#6cbe45', accent: '#1ea7dc', highlight: '#f39200' },
      organizerId: organizer.id,
    },
  })

  for (const [order, s] of STAND_SESSIONS.entries()) {
    const id = `${EVENT.id}-${s.id}`
    const data = {
      title: s.title,
      description: s.time.toLowerCase().includes('confirmer') ? 'Horaire à confirmer' : null,
      startTime: toDate(s.date, s.time)!,
      endTime: toDate(s.date, s.time, true),
      speaker: s.pilot,
      location: s.location,
      order,
      eventId: event.id,
    }
    await prisma.panel.upsert({ where: { id }, update: data, create: { id, ...data } })
  }

  console.log(`OK : événement "${event.title}" + ${STAND_SESSIONS.length} séquences`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
