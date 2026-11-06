import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/stand'
import { moderatePanel } from '@/lib/agents/moderation'

// Agent de modération (d) : regroupe et priorise les questions d'une séquence.
export async function POST(request: NextRequest) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const parsed = z.object({ panelId: z.string().min(1) }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'panelId requis' }, { status: 400 })
  try {
    const result = await moderatePanel(parsed.data.panelId)
    const questions = await db.question.findMany({
      where: { panelId: parsed.data.panelId },
      select: { id: true, content: true, authorName: true, status: true },
    })
    return NextResponse.json({ ...result, questions })
  } catch (error) {
    console.error('moderation', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Modération impossible' }, { status: 502 })
  }
}
