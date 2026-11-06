// Importe les partenaires à inviter depuis la matrice privée (data/private/, non versionnée).
// Idempotent : un partenaire déjà présent sur une séquence n'est pas recréé.
//   npx tsx scripts/import-invitations-itf2026.ts [chemin/vers/sessions-full.json]
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { EVENT } from '../src/config/event'

interface Row {
  id: string
  partners: { name: string; contact: string; email: string }[]
  otherPartners: string
}

const prisma = new PrismaClient()

async function main() {
  const file = process.argv[2] ?? 'data/private/itf2026-sessions-full.json'
  const rows: Row[] = JSON.parse(readFileSync(file, 'utf-8'))
  let created = 0

  for (const row of rows) {
    const panelId = `${EVENT.id}-${row.id}`
    const panel = await prisma.panel.findUnique({ where: { id: panelId } })
    if (!panel) throw new Error(`Séquence ${panelId} absente : lancer d'abord scripts/seed-itf2026.ts`)

    const partners = [...row.partners]
    if (row.otherPartners) partners.push({ name: row.otherPartners, contact: '', email: '' })

    for (const p of partners) {
      const exists = await prisma.invitation.findFirst({ where: { panelId, partnerName: p.name } })
      if (exists) continue
      await prisma.invitation.create({
        data: { panelId, partnerName: p.name, contactRole: p.contact || null, email: p.email || null },
      })
      created++
    }
  }
  console.log(`OK : ${created} invitation(s) importée(s)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
