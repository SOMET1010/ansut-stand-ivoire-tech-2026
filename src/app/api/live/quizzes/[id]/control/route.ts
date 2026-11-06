import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireStaff } from '@/lib/stand'
import { controlQuiz } from '@/lib/quiz'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (auth instanceof NextResponse) return auth
  const parsed = z.object({ action: z.enum(['start', 'next', 'reveal', 'finish', 'reset']) }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  const { id } = await params
  try {
    return NextResponse.json({ quiz: await controlQuiz(id, parsed.data.action) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Action impossible' }, { status: 404 })
  }
}
