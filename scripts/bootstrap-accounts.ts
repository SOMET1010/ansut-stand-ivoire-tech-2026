// Comptes créés au déploiement à partir des variables d'environnement (jamais de mot de passe dans le code).
//   DG_EMAIL / DG_PASSWORD            → compte ADMIN (DG : valide les courriers)
//   ORGANIZER_EMAIL / ORGANIZER_PASSWORD → compte équipe (créé par seed-itf2026.ts)
// Le mot de passe du DG est resynchronisé à chaque déploiement : la variable Vercel fait foi.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const { DG_EMAIL: email, DG_PASSWORD: password } = process.env
  if (!email || !password) {
    console.log('DG_EMAIL / DG_PASSWORD absents : aucun compte DG créé')
    return
  }
  if (password.length < 12) throw new Error('DG_PASSWORD trop court (12 caractères minimum)')
  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', passwordHash },
    create: { email, role: 'ADMIN', passwordHash, name: 'Direction générale' },
  })
  console.log(`OK : compte DG ${email}`)
}

main().catch((e) => { console.error(e.message); process.exit(1) }).finally(() => prisma.$disconnect())
