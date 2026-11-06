// Crée ou met à jour un compte de l'équipe, sans mot de passe dans le code.
//   USER_EMAIL=dg@ansut.ci USER_PASSWORD=... USER_ROLE=ADMIN USER_NAME="Directeur Général" npx tsx scripts/create-user.ts
// USER_ROLE : ADMIN (DG : valide les courriers) | ORGANIZER (équipe du stand)
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const { USER_EMAIL: email, USER_PASSWORD: password, USER_ROLE: role = 'ORGANIZER', USER_NAME: name } = process.env
  if (!email || !password) throw new Error('USER_EMAIL et USER_PASSWORD sont requis')
  if (password.length < 10) throw new Error('Mot de passe trop court (10 caractères minimum)')
  if (role !== 'ADMIN' && role !== 'ORGANIZER') throw new Error('USER_ROLE doit être ADMIN ou ORGANIZER')
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, passwordHash, ...(name ? { name } : {}) },
    create: { email, role, passwordHash, name: name ?? email },
  })
  console.log(`OK : ${user.email} (${user.role})`)
}

main().catch((e) => { console.error(e.message); process.exit(1) }).finally(() => prisma.$disconnect())
