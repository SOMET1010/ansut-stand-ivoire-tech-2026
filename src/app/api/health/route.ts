import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Sonde de santé (Azure App Service « Health check » et test de fumée du pipeline) :
// 200 si l'application ET la base répondent, 503 sinon. Aucune donnée sensible exposée.
export async function GET() {
  const startedAt = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'ok', version: process.env.APP_VERSION ?? 'dev', ms: Date.now() - startedAt })
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'unreachable', version: process.env.APP_VERSION ?? 'dev' }, { status: 503 })
  }
}
