// Paramétrage de la plateforme pour le stand ANSUT – Ivoire Tech Forum 2026.
// Idempotent : crée/met à jour l'organisateur et l'événement, puis charge le programme de
// référence (data/programme-itf2026.json) UNE FOIS par version : ensuite, le programme se
// modifie dans Espace équipe › Programme et un nouveau déploiement ne l'écrase pas.
// Changement de version : les anciennes séquences liées à des invitations, présences ou
// questions sont masquées (rien n'est perdu), les autres sont supprimées.
//
//   ORGANIZER_EMAIL=... ORGANIZER_PASSWORD=... npx tsx scripts/seed-itf2026.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { EVENT } from '../src/config/event'
import reference from '../data/programme-itf2026.json'
import { ProgramInput, toPanelData } from '../src/lib/program-input'

const VERSION_KEY = 'program.seedVersion'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ORGANIZER_EMAIL
  const password = process.env.ORGANIZER_PASSWORD
  if (!email || !password) throw new Error('ORGANIZER_EMAIL et ORGANIZER_PASSWORD sont requis')

  const organizer = await prisma.user.upsert({
    where: { email },
    update: { role: 'ORGANIZER' },
    create: { email, name: 'Équipe stand ANSUT', role: 'ORGANIZER', passwordHash: await bcrypt.hash(password, 10) },
  })

  const sessions = reference.sessions.map((s) => ProgramInput.parse(s))
  const program = sessions.map((s) => ({ date: s.date, start: s.start ?? null, end: s.end ?? null, title: s.title, location: s.location, category: s.category }))

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

  const done = await prisma.appSetting.findUnique({ where: { key: VERSION_KEY } })
  if (done?.value === reference.version) {
    console.log(`OK : événement "${event.title}" ; programme ${reference.version} déjà chargé (modifications de l'équipe conservées)`)
    return
  }

  const old = await prisma.panel.findMany({
    where: { eventId: event.id },
    include: { _count: { select: { invitations: true, attendances: true, questions: true } } },
  })
  let hidden = 0
  for (const p of old) {
    const used = p._count.invitations + p._count.attendances + p._count.questions > 0
    if (used) { await prisma.panel.update({ where: { id: p.id }, data: { hidden: true } }); hidden++ }
    else await prisma.panel.delete({ where: { id: p.id } })
  }
  const tag = reference.version.replace(/[^0-9a-z]/gi, '')
  for (const [order, s] of sessions.entries()) {
    const id = `${event.id}-${tag}-${String(order + 1).padStart(2, '0')}`
    const data = { ...toPanelData(s), order, eventId: event.id }
    await prisma.panel.upsert({ where: { id }, update: data, create: { id, ...data } })
  }
  await prisma.appSetting.upsert({ where: { key: VERSION_KEY }, create: { key: VERSION_KEY, value: reference.version }, update: { value: reference.version } })
  console.log(`OK : événement "${event.title}" + programme ${reference.version} (${sessions.length} séquences ; ${hidden} anciennes masquées, ${old.length - hidden} supprimées)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
