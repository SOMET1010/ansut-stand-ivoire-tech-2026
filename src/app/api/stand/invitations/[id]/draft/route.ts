import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/stand'
import { draftInvitation } from '@/lib/agents/invitation'

// Agent d'invitation : rédige (IA ou modèle) le courrier, qui repasse en validation DG.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  try {
    return NextResponse.json(await draftInvitation(id))
  } catch (error) {
    console.error('draftInvitation', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Rédaction impossible' }, { status: 502 })
  }
}
