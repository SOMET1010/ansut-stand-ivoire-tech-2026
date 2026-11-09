// Compte DG initial, créé au premier déploiement à partir des variables d'environnement.
//   DG_EMAIL / DG_PASSWORD → compte ADMIN (le DG valide les courriers)
// Sécurité : si le compte existe déjà, RIEN n'est modifié (ni mot de passe, ni rôle).
// Un déploiement ne réinitialise donc jamais le mot de passe du DG. Pour le changer
// volontairement : scripts/create-user.ts (USER_EMAIL / USER_PASSWORD / USER_ROLE=ADMIN).
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const { DG_EMAIL: email, DG_PASSWORD: password } = process.env
  if (!email) {
    console.log('DG_EMAIL absent : aucun compte DG à créer')
    return
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Compte DG ${email} déjà présent : inchangé (aucune réinitialisation)`)
    return
  }
  if (!password || password.length < 12) throw new Error('DG_PASSWORD requis (12 caractères minimum) pour créer le compte DG')
  await prisma.user.create({
    data: { email, role: 'ADMIN', passwordHash: await bcrypt.hash(password, 10), name: 'Direction générale' },
  })
  console.log(`OK : compte DG ${email} créé`)
}

main().catch((e) => { console.error(e.message); process.exit(1) }).finally(() => prisma.$disconnect())
