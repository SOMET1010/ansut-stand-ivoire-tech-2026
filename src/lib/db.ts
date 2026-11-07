import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  (process.env.NODE_ENV === 'development'
    ? new PrismaClient({ log: ['query'] })
    : new PrismaClient());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Filtre « contient » insensible à la casse, quel que soit le moteur :
 * SQLite refuse `mode: 'insensitive'` (erreur 500) mais son LIKE l'est déjà ;
 * PostgreSQL en a besoin.
 */
export function containsText(search: string): { contains: string; mode?: 'insensitive' } {
  return process.env.DATABASE_URL?.startsWith('postgres') ? { contains: search, mode: 'insensitive' } : { contains: search }
}
