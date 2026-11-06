import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'

// Contacts laissés via l'assistant du stand (équipe).
export async function GET() {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const leads = await db.lead.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ leads })
}
