import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireStaff } from '@/lib/stand'
import { generateQuestions } from '@/lib/quiz'
import { isAIEnabled } from '@/lib/ai'

// Agent : génère les questions d'un quiz à partir d'un thème.
export async function POST(request: NextRequest) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const parsed = z.object({ theme: z.string().trim().min(3).max(200), count: z.number().int().min(1).max(15).default(5) }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Thème requis' }, { status: 400 })
  if (!isAIEnabled()) return NextResponse.json({ error: 'IA non activée : saisissez les questions à la main.' }, { status: 503 })
  try {
    return NextResponse.json({ questions: await generateQuestions(parsed.data.theme, parsed.data.count) })
  } catch (e) {
    console.error('quiz generate', e)
    return NextResponse.json({ error: 'Génération impossible' }, { status: 502 })
  }
}
